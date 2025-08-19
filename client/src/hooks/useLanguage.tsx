import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'fa';
    document.documentElement.setAttribute('dir', savedLang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', savedLang);
  }, []);

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    isRTL: i18n.language === 'fa'
  };
}
