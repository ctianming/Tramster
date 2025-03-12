import React, { useState } from 'react';
import { sendCozeAgentRequestStream, sendCozeWorkflowRequestStream } from '../services/api/coze';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
];

export default function TranslationForm() {
  const [sourceLanguage, setSourceLanguage] = useState('zh');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const { t } = useTranslation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTranslate = async (event: React.FormEvent) => {
    event.preventDefault();
    setTranslatedText('');
    setIsTranslating(true);

    const targetLang = languages.find(lang => lang.code === targetLanguage);

    const requestData = {
      // bot_id: '7477452195714777140',
      workflow_id: '7480839522608021540',
      user_id: '123',
      content: sourceText + '\n' + '翻译成' + (targetLang?.name || 'English'),
    };

    // try {
    //   await sendCozeAgentRequestStream(requestData, (content) => {
    //     setTranslatedText((prev) => prev + content);
    //   });
    // } finally {
    //   console.log('翻译完成');
    //   console.log(translatedText);
    //   setIsTranslating(false);
    // }
    try{
      await sendCozeWorkflowRequestStream(requestData, (content) => {
        setTranslatedText((prev) => prev + content);
      });
    } finally {
      console.log('翻译完成');
      console.log(translatedText);
      setIsTranslating(false);
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
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition-all duration-300 ease-in-out hover:border-indigo-400 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={t('translat-form.source-text-placeholder')}
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

          {/* 翻译按钮 */}
          <div className="flex justify-center pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTranslate}
              disabled={isTranslating}
              className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isTranslating ? (
                <div className="flex items-center space-x-2">
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
        </div>
      </motion.div>
    </div>
  );
} 