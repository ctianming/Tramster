import { DocumentPage, splitDocumentToPages, isDocumentFile } from '../../utils/document-splitter';
import { generateTranslatedFileName } from '../../utils/file-merger';
import { uploadFile } from '../api/supabase';

// 定义响应类型
export interface TranslationResult {
    type: 'text' | 'url';
    content: string;
    pageNumber?: number;
}

// 文档处理状态接口
export interface DocumentProcessingStatus {
    currentPage: number;
    totalPages: number;
    progress: number;
    status: string;
}

/**
 * 将文件上传到Supabase存储服务
 * @param file 要上传的文件
 * @returns 上传成功后的URL
 */
export async function uploadFileToStorage(file: File): Promise<string> {
    const url = await uploadFile(file);
    if (!url) {
        throw new Error('文件上传失败');
    }
    return url;
}

/**
 * 准备文档处理
 * @param file 文件对象
 * @returns 分页后的文档内容
 */
export async function prepareDocumentForProcessing(file: File): Promise<DocumentPage[]> {
    // 检查文件类型
    if (!isDocumentFile(file)) {
        throw new Error('不支持的文件类型');
    }

    // 分割文档页面
    return await splitDocumentToPages(file);
}

/**
 * 对分页文档进行批量处理的队列控制
 * @param pages 文档页面
 * @param processPage 页面处理函数
 * @param concurrency 并发数
 * @param onStatus 状态回调函数
 * @returns 完成的Promise
 */
export async function processDocumentInBatches(
    pages: DocumentPage[],
    processPage: (page: DocumentPage) => Promise<TranslationResult>,
    concurrency: number = 2,
    onStatus?: (status: DocumentProcessingStatus) => void
): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    let completedPages = 0;
    const totalPages = pages.length;

    // 更新初始状态
    if (onStatus) {
        onStatus({
            currentPage: 0,
            totalPages,
            progress: 0,
            status: '准备处理文档...'
        });
    }

    // 使用Promise.all和分批处理控制并发
    const batches = Math.ceil(totalPages / concurrency);

    for (let i = 0; i < batches; i++) {
        const start = i * concurrency;
        const end = Math.min(start + concurrency, totalPages);
        const batch = pages.slice(start, end);

        const batchPromises = batch.map(async page => {
            try {
                const result = await processPage(page);

                // 更新结果
                results.push({
                    ...result,
                    pageNumber: page.pageNumber
                });

                // 更新进度
                completedPages++;
                if (onStatus) {
                    onStatus({
                        currentPage: completedPages,
                        totalPages,
                        progress: Math.floor((completedPages / totalPages) * 100),
                        status: `已处理 ${completedPages}/${totalPages} 页...`
                    });
                }

                return result;
            } catch (error) {
                console.error(`页面 ${page.pageNumber} 处理错误:`, error);
                throw error;
            }
        });

        // 等待当前批次完成
        await Promise.all(batchPromises);
    }

    // 更新最终状态
    if (onStatus) {
        onStatus({
            currentPage: totalPages,
            totalPages,
            progress: 100,
            status: '文档处理完成'
        });
    }

    return results;
}

/**
 * 整理并排序翻译结果
 * @param results 翻译结果数组
 * @returns 排序后的结果
 */
export function organizeResults(results: TranslationResult[]): {
    textResults: TranslationResult[];
    urlResults: TranslationResult[];
} {
    // 分离文本和URL结果
    const textResults = results
        .filter(r => r.type === 'text')
        .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));

    const urlResults = results
        .filter(r => r.type === 'url')
        .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));

    return { textResults, urlResults };
}

/**
 * 生成翻译后的文本内容
 * @param results 文本结果数组
 * @returns 合并后的文本
 */
export function generateTranslatedText(results: TranslationResult[]): string {
    return results
        .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0))
        .map(result => `--- 第${result.pageNumber}页 ---\n${result.content}`)
        .join('\n\n');
}
