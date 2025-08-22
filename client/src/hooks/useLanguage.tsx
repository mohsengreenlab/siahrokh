import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [location, navigate] = useLocation();

  const changeLanguage = (lang: string, updateUrl = true) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    // Update URL path if requested
    if (updateUrl) {
      const pathSegments = location.split('/').filter(Boolean);
      const currentLangInPath = pathSegments[0];
      
      // If current path already has a language prefix, replace it
      if (currentLangInPath === 'en' || currentLangInPath === 'fa') {
        pathSegments[0] = lang;
      } else {
        // If no language prefix, add it
        pathSegments.unshift(lang);
      }
      
      const newPath = '/' + pathSegments.join('/');
      navigate(newPath, { replace: true });
    }
  };

  const getLocalizedPath = (path: string) => {
    // Remove leading slash
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // If path already has language prefix, return as is
    const segments = cleanPath.split('/').filter(Boolean);
    if (segments[0] === 'en' || segments[0] === 'fa') {
      return '/' + cleanPath;
    }
    
    // Add current language prefix
    return `/${i18n.language}${cleanPath ? '/' + cleanPath : ''}`;
  };

  useEffect(() => {
    const pathSegments = location.split('/').filter(Boolean);
    const langFromPath = pathSegments[0];
    
    // Get saved language preference
    const savedLang = localStorage.getItem('language') || 'fa';
    
    // If URL has a language prefix, use it
    if (langFromPath === 'en' || langFromPath === 'fa') {
      if (i18n.language !== langFromPath) {
        changeLanguage(langFromPath, false); // Don't update URL to avoid loops
      }
    } else {
      // If no language in URL, use saved language and apply attributes
      if (i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
      }
      document.documentElement.setAttribute('dir', savedLang === 'fa' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', savedLang);
    }
  }, [location, i18n]);

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    getLocalizedPath,
    isRTL: i18n.language === 'fa'
  };
}
