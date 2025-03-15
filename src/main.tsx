import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './i18n/i18n.ts';
import './index.css';
import { ensurePdfJsConfiguration } from './utils/pdf-utils';

// 初始化PDF.js配置
ensurePdfJsConfiguration();

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
