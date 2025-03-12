import React from 'react';
import { useTranslation } from 'react-i18next';

const Introduction: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="lg:w-1/3 flex items-center">
      <div className="space-y-6">
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {t('description.detail')}
        </p>
        <ul className="space-y-3">
          <li className="flex items-center text-gray-600 dark:text-gray-300">
            <span className="text-blue-500 dark:text-blue-400 mr-3">✓</span>
            {t('features.intelligent-analysis')}
          </li>
          <li className="flex items-center text-gray-600 dark:text-gray-300">
            <span className="text-blue-500 dark:text-blue-400 mr-3">✓</span>
            {t('features.multi-format-support')}
          </li>
          <li className="flex items-center text-gray-600 dark:text-gray-300">
            <span className="text-blue-500 dark:text-blue-400 mr-3">✓</span>
            {t('features.terminology-optimization')}
          </li>
          <li className="flex items-center text-gray-600 dark:text-gray-300">
            <span className="text-blue-500 dark:text-blue-400 mr-3">✓</span>
            {t('features.realtime-translation')}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Introduction; 