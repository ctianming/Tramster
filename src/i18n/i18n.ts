import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 引入翻译文件
import enTranslation from './locales/en/translation.json';
import zhTranslation from './locales/zh/translation.json';
import frTranslation from './locales/fr/translation.json';

const resources = {
    en: { translation: enTranslation },
    zh: { translation: zhTranslation },
    fr: { translation: frTranslation }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'zh',
        fallbackLng: 'zh',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
