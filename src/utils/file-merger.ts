import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * 从URL下载文件并获取Blob对象
 * @param url 文件URL
 * @returns 文件Blob对象
 */
export async function downloadFromUrl(url: string): Promise<Blob> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`文件下载失败: ${response.statusText}`);
        }
        return await response.blob();
    } catch (error) {
        console.error('文件下载错误:', error);
        throw new Error(`文件下载失败: ${(error as Error).message}`);
    }
}

/**
 * 合并多个文件对象
 * @param urls 文件URL数组
 * @param fileName 目标文件名
 * @param onProgress 进度回调
 * @returns 合并后的文件Blob对象
 */
export async function mergeFiles(
    urls: string[],
    fileName: string,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    try {
        // 确定文件类型
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        const mimeType = getMimeType(fileExtension || '');

        // 下载所有文件
        const totalFiles = urls.length;
        const blobs: Blob[] = [];

        // 报告初始进度
        if (onProgress) {
            onProgress(0);
        }

        for (let i = 0; i < urls.length; i++) {
            try {
                const blob = await downloadFromUrl(urls[i]);
                blobs.push(blob);
            } catch (error) {
                console.error(`下载文件失败 (${i + 1}/${totalFiles}): ${error}`);
                // 继续下载其他文件，不中断整个过程
            }

            // 更新下载进度
            if (onProgress) {
                const downloadProgress = Math.floor(((i + 1) / totalFiles) * 50); // 下载占总进度的50%
                onProgress(downloadProgress);
            }
        }

        if (blobs.length === 0) {
            throw new Error('没有成功下载任何文件');
        }

        // 根据文件类型选择合并方法
        let mergedBlob: Blob;

        // 报告合并开始
        if (onProgress) {
            onProgress(50); // 下载完成，开始合并
        }

        if (fileExtension === 'txt' || fileExtension === 'text') {
            // 文本文件合并
            mergedBlob = await mergeTextFiles(blobs, onProgress);
        } else if (fileExtension === 'pdf') {
            // PDF文件合并
            mergedBlob = await mergePdfFiles(blobs, onProgress);
        } else if (fileExtension === 'docx' || fileExtension === 'doc') {
            // Word文档合并 - 尝试文本合并或ZIP打包
            mergedBlob = await mergeDocFiles(blobs, fileExtension, onProgress);
        } else {
            // 其他类型文件，打包为ZIP
            mergedBlob = await createZipArchive(blobs, fileName, onProgress);
        }

        // 报告完成
        if (onProgress) {
            onProgress(100);
        }

        return mergedBlob;
    } catch (error) {
        console.error('文件合并错误:', error);
        throw new Error(`文件合并失败: ${(error as Error).message}`);
    }
}

/**
 * 合并文本文件
 */
async function mergeTextFiles(
    blobs: Blob[],
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const texts: string[] = [];

    for (let i = 0; i < blobs.length; i++) {
        const text = await blobs[i].text();
        texts.push(text);

        if (onProgress) {
            const mergeProgress = 50 + Math.floor(((i + 1) / blobs.length) * 50);
            onProgress(mergeProgress);
        }
    }

    const mergedText = texts.join('\n\n---页面分隔线---\n\n');
    return new Blob([mergedText], { type: 'text/plain' });
}

/**
 * 合并PDF文件 (简化实现)
 */
async function mergePdfFiles(
    blobs: Blob[],
    onProgress?: (progress: number) => void
): Promise<Blob> {
    // 简单合并方式，实际PDF合并通常需要专业库如PDF.js或服务端处理
    // 这里我们创建一个ZIP包含所有PDF
    return createZipArchive(blobs, 'merged_documents.zip', onProgress, 'pdf');
}

/**
 * 合并DOC/DOCX文件
 */
async function mergeDocFiles(
    blobs: Blob[],
    fileExtension: string,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    // Word文档合并通常需要专业库，这里提供一个ZIP包含所有文档
    return createZipArchive(blobs, 'merged_documents.zip', onProgress, fileExtension);
}

/**
 * 创建ZIP归档
 */
async function createZipArchive(
    blobs: Blob[],
    zipName: string,
    onProgress?: (progress: number) => void,
    fileExtension?: string
): Promise<Blob> {
    const zip = new JSZip();

    // 添加所有文件到ZIP
    for (let i = 0; i < blobs.length; i++) {
        const fileName = `document_${i + 1}${fileExtension ? `.${fileExtension}` : ''}`;
        zip.file(fileName, blobs[i]);

        if (onProgress) {
            const zipProgress = 50 + Math.floor(((i + 1) / blobs.length) * 25);
            onProgress(zipProgress);
        }
    }

    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    }, (metadata) => {
        if (onProgress) {
            const finalProgress = 75 + Math.floor(metadata.percent * 0.25);
            onProgress(finalProgress);
        }
    });

    return zipBlob;
}

/**
 * 保存合并后的文件到用户设备
 * @param blob 文件Blob对象
 * @param fileName 文件名
 */
export function saveFile(blob: Blob, fileName: string): void {
    saveAs(blob, fileName);
}

/**
 * 根据文件扩展名获取MIME类型
 * @param extension 文件扩展名
 * @returns MIME类型字符串
 */
function getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'text': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'zip': 'application/zip'
    };

    return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * 生成翻译后的文件名
 * @param originalName 原始文件名
 * @returns 翻译后的文件名
 */
export function generateTranslatedFileName(originalName: string): string {
    const extensionIndex = originalName.lastIndexOf('.');
    if (extensionIndex === -1) {
        return `${originalName}_translated`;
    }

    const baseName = originalName.substring(0, extensionIndex);
    const extension = originalName.substring(extensionIndex);

    return `${baseName}_translated${extension}`;
}

/**
 * 检查是否需要ZIP打包而不是合并
 * @param extension 文件扩展名
 */
export function shouldCreateZip(extension: string): boolean {
    // 这些类型我们用ZIP打包而不是尝试合并
    const zipTypes = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
    return zipTypes.includes(extension.toLowerCase());
}
