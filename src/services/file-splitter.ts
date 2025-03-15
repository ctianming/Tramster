import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

// 修复 PDF.js worker 导入和设置
const pdfWorkerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url);
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc.toString();

export interface DocumentPage {
    pageNumber: number;
    text: string;
}

/**
 * 将文档按页分割
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
            throw new Error(`Unsupported file format: ${extension}`);
    }
}

/**
 * 分割PDF文件
 */
async function splitPdf(file: File): Promise<DocumentPage[]> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
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

        // 简单按段落分割
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        const pageSize = 3000; // 每页约3000字符
        const pages: DocumentPage[] = [];

        let currentPage = 1;
        let currentText = '';

        for (const paragraph of paragraphs) {
            if (currentText.length + paragraph.length > pageSize && currentText.length > 0) {
                // 当前页已满，创建新页
                pages.push({
                    pageNumber: currentPage,
                    text: currentText.trim()
                });
                currentPage++;
                currentText = paragraph;
            } else {
                // 添加到当前页
                currentText += (currentText ? '\n\n' : '') + paragraph;
            }
        }

        // 添加最后一页
        if (currentText.trim().length > 0) {
            pages.push({
                pageNumber: currentPage,
                text: currentText.trim()
            });
        }

        return pages;
    } catch (error) {
        console.error('DOCX分割错误:', error);
        throw new Error('DOCX分割失败');
    }
}

/**
 * 分割DOC文件 (通过转换为文本)
 */
async function splitDoc(file: File): Promise<DocumentPage[]> {
    // 对于DOC文件，简单地读取为文本并按大小分割
    try {
        const text = await readFileAsText(file);
        return splitTextToPages(text);
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
        return splitTextToPages(text);
    } catch (error) {
        console.error('TXT分割错误:', error);
        throw new Error('TXT分割失败');
    }
}

/**
 * 将文本按大小分割成页
 */
function splitTextToPages(text: string): DocumentPage[] {
    const pageSize = 3000; // 每页字符数
    const pages: DocumentPage[] = [];

    // 按段落分割
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

    let currentPage = 1;
    let currentText = '';

    for (const paragraph of paragraphs) {
        if (currentText.length + paragraph.length > pageSize && currentText.length > 0) {
            // 当前页已满，创建新页
            pages.push({
                pageNumber: currentPage,
                text: currentText.trim()
            });
            currentPage++;
            currentText = paragraph;
        } else {
            // 添加到当前页
            currentText += (currentText ? '\n' : '') + paragraph;
        }
    }

    // 添加最后一页
    if (currentText.trim().length > 0) {
        pages.push({
            pageNumber: currentPage,
            text: currentText.trim()
        });
    }

    return pages;
}

/**
 * 读取文件为文本
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
 * 合并多个文件为一个
 */
export async function mergeFiles(urls: string[], fileName: string): Promise<Blob> {
    try {
        // 下载所有文件
        const downloadPromises = urls.map(url => fetch(url).then(res => res.blob()));
        const blobs = await Promise.all(downloadPromises);

        // 根据文件名确定类型
        const extension = fileName.split('.').pop()?.toLowerCase();
        let mergedBlob: Blob;

        switch (extension) {
            case 'pdf':
                // PDF合并需要专业库，这里简化处理
                mergedBlob = new Blob(blobs, { type: 'application/pdf' });
                break;
            case 'txt':
                // 文本文件合并
                const texts = await Promise.all(blobs.map(blob => blob.text()));
                const mergedText = texts.join('\n\n--- 分页 ---\n\n');
                mergedBlob = new Blob([mergedText], { type: 'text/plain' });
                break;
            default:
                // 其他格式，简单合并blob
                mergedBlob = new Blob(blobs, { type: blobs[0].type });
        }

        return mergedBlob;
    } catch (error) {
        console.error('文件合并错误:', error);
        throw new Error('文件合并失败');
    }
}

/**
 * 下载合并后的文件
 */
export function downloadMergedFile(blob: Blob, fileName: string): void {
    saveAs(blob, fileName);
}
