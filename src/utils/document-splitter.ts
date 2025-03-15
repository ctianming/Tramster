import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 正确设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js';

export interface DocumentPage {
    pageNumber: number;
    text: string;
}

/**
 * 将文档按页分割
 * @param file 要分割的文件
 * @returns 分割后的页面数组
 */
export async function splitDocumentToPages(file: File): Promise<DocumentPage[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'pdf':
            return await splitPdf(file);
        case 'docx':
            return await splitDocx(file);
        case 'doc':
            return await splitDoc(file);
        case 'txt':
            return await splitTxt(file);
        default:
            throw new Error(`不支持的文件格式: ${extension}`);
    }
}

/**
 * 判断文件是否为文档类型
 * @param file 文件对象
 * @returns 布尔值，是否为文档类型
 */
export function isDocumentFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return ['pdf', 'doc', 'docx', 'txt'].includes(extension || '');
}

/**
 * 分割PDF文件
 */
async function splitPdf(file: File): Promise<DocumentPage[]> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pages: DocumentPage[] = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => item.str);
            const text = textItems.join(' ');

            pages.push({
                pageNumber: i,
                text: text.trim()
            });
        }

        return pages;
    } catch (error) {
        console.error('PDF分割错误:', error);
        throw new Error('PDF分割失败');
    }
}

/**
 * 分割DOCX文件
 */
async function splitDocx(file: File): Promise<DocumentPage[]> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        // 按段落分割并控制每页的大小
        return splitTextIntoChunks(text);
    } catch (error) {
        console.error('DOCX分割错误:', error);
        throw new Error('DOCX分割失败');
    }
}

/**
 * 分割DOC文件 (通过转换为文本)
 */
async function splitDoc(file: File): Promise<DocumentPage[]> {
    // 对DOC文件，我们先读取为文本再分割
    try {
        const text = await readFileAsText(file);
        return splitTextIntoChunks(text);
    } catch (error) {
        console.error('DOC分割错误:', error);
        throw new Error('DOC分割失败');
    }
}

/**
 * 分割TXT文件
 */
async function splitTxt(file: File): Promise<DocumentPage[]> {
    try {
        const text = await readFileAsText(file);
        return splitTextIntoChunks(text);
    } catch (error) {
        console.error('TXT分割错误:', error);
        throw new Error('TXT分割失败');
    }
}

/**
 * 读取文件内容为文本
 */
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * 将文本分割成适当大小的块
 * @param text 要分割的文本
 * @returns 分页后的结果
 */
function splitTextIntoChunks(text: string): DocumentPage[] {
    const pages: DocumentPage[] = [];
    const maxChunkSize = 2000; // 每页最大字符数

    // 先按段落分割
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    let currentPage = 1;
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        // 如果段落本身太长，需要进一步分割
        if (paragraph.length > maxChunkSize) {
            // 先添加当前已累积的内容
            if (currentChunk.length > 0) {
                pages.push({
                    pageNumber: currentPage++,
                    text: currentChunk.trim()
                });
                currentChunk = '';
            }

            // 分割长段落
            const sentences = paragraph.split(/(?<=[.!?])\s+/);
            let sentenceChunk = '';

            for (const sentence of sentences) {
                if ((sentenceChunk + sentence).length > maxChunkSize) {
                    if (sentenceChunk.length > 0) {
                        pages.push({
                            pageNumber: currentPage++,
                            text: sentenceChunk.trim()
                        });
                    }
                    sentenceChunk = sentence;
                } else {
                    sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
                }
            }

            // 添加剩余的句子
            if (sentenceChunk.length > 0) {
                currentChunk = sentenceChunk;
            }
        }
        // 如果添加这个段落会超过限制，则创建新页
        else if (currentChunk.length + paragraph.length > maxChunkSize) {
            if (currentChunk.length > 0) {
                pages.push({
                    pageNumber: currentPage++,
                    text: currentChunk.trim()
                });
            }
            currentChunk = paragraph;
        }
        // 否则将段落添加到当前块
        else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }

    // 添加最后一页
    if (currentChunk.length > 0) {
        pages.push({
            pageNumber: currentPage,
            text: currentChunk.trim()
        });
    }

    return pages;
}
