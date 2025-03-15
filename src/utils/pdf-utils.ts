/// <reference types="pdfjs-dist" />

/**
 * 检测并加载PDF.js Worker
 * 这个函数确保PDF.js worker正确加载
 */

declare global {
    interface Window {
        pdfjsWorker?: boolean;
    }
}
export function setupPdfWorker(): void {
    // 检查是否已存在全局变量
    if (!window.pdfjsWorker) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js';
        script.async = true;
        script.onload = () => {
            console.log('PDF.js Worker loaded successfully');
        };

        document.head.appendChild(script);
    }
}

/**
 * 确保PDF.js配置
 * 在应用启动时调用
 */
export function ensurePdfJsConfiguration(): void {
    // 如果全局变量存在则使用，否则使用CDN
    try {
        const pdfjsLib = require('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js';
    } catch (error) {
        console.warn('Failed to configure PDF.js automatically, loading from CDN');
        setupPdfWorker();
    }
}
