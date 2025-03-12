import React from 'react';
import LanguageSelector from '../ui/language-selector';
import ThemeSwitcher from '../ui/theme-switcher';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tramster</h1>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 