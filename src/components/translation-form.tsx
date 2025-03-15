import React, { useState, useCallback, useEffect } from 'react';
import { sendCozeAgentRequestStream, processDocumentPages, downloadFileFromUrl, CozeResponse } from '../services/api/coze';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFile } from '../services/api/supabase';
import { isDocumentFile, splitDocumentToPages } from '../utils/document-splitter';
import { mergeFiles, saveFile, generateTranslatedFileName } from '../utils/file-merger';
import { shouldCreateZip } from '../utils/file-merger';

const languages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: '英语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'it', name: '意大利语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ru', name: '俄语' },
];

export default function TranslationForm() {
  const [sourceLanguage, setSourceLanguage] = useState('zh');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // 新增状态
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isDocumentMode, setIsDocumentMode] = useState(false);
  const [isFileDownloading, setIsFileDownloading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [isUrlResponse, setIsUrlResponse] = useState(false);

  const { t } = useTranslation();

  // 清除文件URL列表当组件卸载时
  useEffect(() => {
    return () => {
      // 清理逻辑...
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // 检查是否是文档类型
      const isDocument = isDocumentFile(selectedFile);
      setIsDocumentMode(isDocument);

      // 重置其他状态
      setTranslatedText('');
      setProcessingStatus('');
      setProcessingProgress(0);
      setFileUrls([]);
      setIsUrlResponse(false);

      // 如果选择了文件，清空文本输入
      setSourceText('');
    }
  };

  const handleTranslate = async (event: React.FormEvent) => {
    event.preventDefault();

    // 重置状态
    setTranslatedText('');
    setProcessingStatus('');
    setProcessingProgress(0);
    setFileUrls([]);
    setIsTranslating(true);
    setIsUrlResponse(false);

    if (!sourceText && !file) {
      console.error('No text or file provided');
      setIsTranslating(false);
      return;
    }

    const targetLang = languages.find(lang => lang.code === targetLanguage);
    const sourceLang = languages.find(lang => lang.code === sourceLanguage);

    if (!sourceLang || !targetLang) {
      console.error('No language available');
      setIsTranslating(false);
      return;
    }

    try {
      if (file) {
        if (isDocumentMode) {
          // 处理文档文件（按页分割）
          await handleDocumentTranslation(file, sourceLang.name, targetLang.name);
        } else {
          // 处理普通文件（整个上传）
          await handleSingleFileTranslation(file, sourceLang.name, targetLang.name);
        }
      } else if (sourceText) {
        // 处理文本翻译
        await handleTextTranslation(sourceLang.name, targetLang.name);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setProcessingStatus(`处理失败: ${(error as Error).message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // 处理文档翻译 - 按页处理
  const handleDocumentTranslation = async (file: File, sourceLang: string, targetLang: string) => {
    try {
      setProcessingStatus('正在分析文档...');

      // 分割文档为页面
      const pages = await splitDocumentToPages(file);
      setTotalPages(pages.length);

      if (pages.length === 0) {
        throw new Error('无法从文档中提取文本内容');
      }

      setProcessingStatus(`文档共 ${pages.length} 页，开始翻译...`);

      // 收集URL和文本结果
      const urlResults: string[] = [];
      const textResults: { pageNum: number, text: string }[] = [];

      // 处理所有页面
      await processDocumentPages(
        pages,
        '123', // 用户ID
        sourceLang,
        targetLang,
        (pageNumber, response) => {
          // 处理进度更新
          const progress = Math.floor((pageNumber / pages.length) * 100);
          setProcessingProgress(progress);
          setProcessingStatus(`正在翻译第 ${pageNumber}/${pages.length} 页...`);

          // 根据响应类型处理结果
          if (response.type === 'url') {
            setIsUrlResponse(true);
            urlResults.push(response.content);
          } else {
            textResults.push({
              pageNum: pageNumber,
              text: response.content
            });

            // 更新文本显示，按页码排序
            const sortedTexts = [...textResults].sort((a, b) => a.pageNum - b.pageNum);
            const combinedText = sortedTexts
              .map(item => `--- 第 ${item.pageNum} 页 ---\n\n${item.text}`)
              .join('\n\n');

            setTranslatedText(combinedText);
          }
        },
        (pageNumber, error) => {
          console.error(`页面 ${pageNumber} 处理错误:`, error);
          setProcessingStatus(`页面 ${pageNumber} 处理错误: ${error}`);
        },
        () => {
          // 全部完成回调
          setProcessingStatus('翻译完成！');
          setProcessingProgress(100);

          // 如果有URL结果，保存它们
          if (urlResults.length > 0) {
            setFileUrls(urlResults);
            setProcessingStatus(`翻译完成！生成了 ${urlResults.length} 个文件。`);
          }
        }
      );

    } catch (error) {
      console.error('Document translation error:', error);
      setProcessingStatus(`文档处理失败: ${(error as Error).message}`);
    }
  };

  // 处理单个文件翻译（不分页）
  const handleSingleFileTranslation = async (file: File, sourceLang: string, targetLang: string) => {
    try {
      setProcessingStatus('正在上传文件...');
      const uploadedUrl = await uploadFile(file);

      if (!uploadedUrl) {
        throw new Error('文件上传失败');
      }

      setProcessingStatus('文件上传成功，正在翻译...');

      const botRequestData = {
        bot_id: '',
        user_id: '123',
        content: `${uploadedUrl} 将这个链接中的${sourceLang}内容翻译为${targetLang}`,
      };

      const urlResults: string[] = [];

      await sendCozeAgentRequestStream(
        botRequestData,
        (response) => {
          if (response.type === 'url') {
            setIsUrlResponse(true);
            urlResults.push(response.content);
          } else {
            // 文本类型结果
            setTranslatedText(prev => prev + response.content);
          }
        }
      );

      // 如果有URL结果，保存它们
      if (urlResults.length > 0) {
        setFileUrls(urlResults);
        setProcessingStatus(`翻译完成！生成了 ${urlResults.length} 个文件。`);
      } else {
        setProcessingStatus('翻译完成！');
      }

    } catch (error) {
      console.error('File translation error:', error);
      setProcessingStatus(`文件处理失败: ${(error as Error).message}`);
    }
  };

  // 处理文本翻译
  const handleTextTranslation = async (sourceLang: string, targetLang: string) => {
    try {
      setProcessingStatus('正在翻译文本...');

      const botRequestData = {
        bot_id: '',
        user_id: '123',
        content: `将以下${sourceLang}文本翻译为${targetLang}:\n${sourceText}`,
      };

      await sendCozeAgentRequestStream(
        botRequestData,
        (response) => {
          if (response.type === 'text') {
            setTranslatedText(prev => prev + response.content);
          }
        }
      );

      setProcessingStatus('翻译完成！');

    } catch (error) {
      console.error('Text translation error:', error);
      setProcessingStatus(`文本翻译失败: ${(error as Error).message}`);
    }
  };

  // 下载合并后的文件
  const handleDownloadMergedFile = async () => {
    if (fileUrls.length === 0 || !file) return;

    setIsFileDownloading(true);
    setProcessingStatus('正在下载并处理文件...');
    setProcessingProgress(0);

    try {
      // 生成翻译后的文件名
      const translatedFileName = generateTranslatedFileName(file.name);

      // 检查是否应该创建ZIP而不是尝试合并
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const createZip = shouldCreateZip(fileExt);

      if (createZip) {
        setProcessingStatus(`正在创建ZIP归档包含 ${fileUrls.length} 个文件...`);
      } else {
        setProcessingStatus('正在下载并合并文件...');
      }

      // 下载和合并文件
      const mergedBlob = await mergeFiles(
        fileUrls,
        translatedFileName,
        (progress) => {
          setProcessingProgress(progress);
        }
      );

      // 保存文件到用户设备
      saveFile(
        mergedBlob,
        createZip ? `${translatedFileName.replace(/\.\w+$/, '')}.zip` : translatedFileName
      );

      setProcessingStatus(createZip ?
        '文件已成功打包并下载！' :
        '文件已成功合并并下载！'
      );
    } catch (error) {
      console.error('Download error:', error);
      setProcessingStatus(`文件处理失败: ${(error as Error).message}`);
    } finally {
      setIsFileDownloading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setSourceText('');
    setTranslatedText('');
    setFile(null);
    setProcessingStatus('');
    setProcessingProgress(0);
    setFileUrls([]);
    setIsUrlResponse(false);

    // 重置文件输入
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
      >
        <div className="space-y-8">
          {/* 语言选择区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('translat-form.src-lang')}
              </label>
              <div className="relative group">
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all duration-300 ease-in-out hover:border-indigo-400 text-gray-700 dark:text-gray-200"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 group-hover:text-indigo-500 transition-colors duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('translat-form.target-lang')}
              </label>
              <div className="relative group">
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-all duration-300 ease-in-out hover:border-indigo-400 text-gray-700 dark:text-gray-200"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500 group-hover:text-indigo-500 transition-colors duration-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* 文本输入区域 */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('translat-form.source-text')}
            </label>
            <textarea
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                if (file) setFile(null); // 如果输入文本，清除选择的文件
              }}
              disabled={isTranslating || !!file}
              className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all duration-300 ease-in-out hover:border-indigo-400 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-70 disabled:cursor-not-allowed"
              placeholder={file ? `已选择文件: ${file.name}` : t('translat-form.source-text-placeholder')}
            />
          </div>

          {/* 文件上传区域 */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('translat-form.file-upload')}
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".txt,.doc,.docx,.pdf"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full h-16 px-4 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-xl cursor-pointer group hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-600/50 transition-all duration-300 ease-in-out"
              >
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-gray-400 group-hover:text-indigo-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                    {file ? file.name : t('translat-form.file-upload')}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 处理状态和进度条 */}
          <AnimatePresence>
            {processingStatus && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{processingStatus}</span>
                  {processingProgress > 0 && (
                    <span className="text-sm text-indigo-600 dark:text-indigo-400">{processingProgress}%</span>
                  )}
                </div>

                {processingProgress > 0 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <motion.div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${processingProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 操作按钮 */}
          <div className="flex flex-wrap justify-center pt-4 space-x-0 space-y-3 sm:space-x-4 sm:space-y-0">
            {(!!sourceText || !!file || !!translatedText) && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetForm}
                disabled={isTranslating || isFileDownloading}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl transition-all duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {t('translat-form.reset-btn')}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTranslate}
              disabled={isTranslating || isFileDownloading || (!sourceText && !file)}
              className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isTranslating ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t('translat-form.translating')}</span>
                </div>
              ) : (
                t('translat-form.translate-btn')
              )}
            </motion.button>

            {/* 文件下载按钮 - 当有URL结果时显示 */}
            {fileUrls.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadMergedFile}
                disabled={isFileDownloading || isTranslating}
                className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-green-500/25 transition-all duration-300 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isFileDownloading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{t('translat-form.downloading')}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{file && shouldCreateZip(file.name.split('.').pop() || '') ?
                      t('translat-form.download-zip') :
                      t('translat-form.download-file')}
                    </span>
                  </div>
                )}
              </motion.button>
            )}
          </div>

          {/* 翻译结果 */}
          <AnimatePresence>
            {translatedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('translat-form.translated-text')}
                </label>
                <div className="w-full min-h-[10rem] p-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl overflow-auto text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                  {translatedText}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 文件URL信息 */}
          {fileUrls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full text-center text-sm text-gray-500 dark:text-gray-400 mt-2"
            >
              {t('translat-form.files-available', { count: fileUrls.length })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}