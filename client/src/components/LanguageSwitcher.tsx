import { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'fa', name: 'فارسی' },
    { code: 'en', name: 'English' }
  ];

  const currentLangName = languages.find(lang => lang.code === currentLanguage)?.name || 'فارسی';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm text-gray-300 hover:text-white focus:text-white transition-colors"
      >
        <i className="fas fa-globe mx-2"></i>
        <span>{currentLangName}</span>
        <i className="fas fa-chevron-down mx-2 text-xs"></i>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-chess-card border border-gray-700 rounded-lg shadow-lg">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
