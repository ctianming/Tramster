/**
 * i18n
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import React from "react";

interface Language {
  code: string;
  lang: string;
}

const languages: Language[] = [
  { code: "zh", lang: "ZH" },
  { code: "en", lang: "EN" },
  { code: "fr", lang: "FR" }
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.body.dir = i18n.dir();
  }, [i18n, i18n.language]);

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <div className="relative">
      <select
        title="language-selector"
        value={i18n.language}
        onChange={changeLanguage}
        className="appearance-none bg-transparent pl-3 pr-8 py-1.5 
          text-sm text-gray-700 dark:text-gray-200 
          border border-gray-300/50 dark:border-gray-600/50 rounded-lg 
          hover:bg-gray-50 dark:hover:bg-gray-700/50 
          focus:outline-none focus:ring-0 focus:border-gray-300 dark:focus:border-gray-600
          cursor-pointer transition-colors duration-200"
      >
        {languages.map((lng) => (
          <option 
            key={lng.code} 
            value={lng.code}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          >
            {lng.lang}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
        <svg 
          className="w-4 h-4 text-gray-400 dark:text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;
