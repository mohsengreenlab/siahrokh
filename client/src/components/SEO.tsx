import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  structuredData?: object;
  canonicalUrl?: string;
}

export function SEO({ 
  title, 
  description, 
  keywords, 
  ogImage,
  structuredData,
  canonicalUrl 
}: SEOProps) {
  const { t } = useTranslation();
  const { currentLanguage, isRTL } = useLanguage();
  
  // Use language-specific image if not provided
  const defaultOgImage = ogImage || '/assets/Gemini_Generated_Image_yguf2iyguf2iyguf_1755644880540.png';

  useEffect(() => {
    // Update document language and direction
    document.documentElement.setAttribute('lang', currentLanguage);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    // Default values based on language
    const defaultTitles = {
      fa: 'سیاه‌رخ - تورنمنت شطرنج تهران | رزرو آنلاین مسابقات شطرنج ایران',
      en: 'SiahRokh - Chess Tournament Tehran | Online Chess Competition Booking Iran'
    };

    const defaultDescriptions = {
      fa: 'رزرو آنلاین تورنمنت‌های شطرنج در تهران و ایران. کلاس‌های شطرنج، مسابقات حرفه‌ای و آموزش شطرنج برای همه سطوح در سیاه‌رخ.',
      en: 'Online booking for chess tournaments in Tehran and Iran. Professional chess classes, competitions and chess training for all levels at SiahRokh.'
    };

    const defaultKeywords = {
      fa: 'مسابقه شطرنج تهران, تورنمنت شطرنج ایران, کلاس شطرنج, مسابقات شطرنج, آموزش شطرنج, سیاه رخ, شطرنج حرفه ای',
      en: 'Chess tournament Tehran, Chess tournament Iran, Chess competition, Chess classes Iran, chess training, SiahRokh, professional chess'
    };

    // Set title
    const finalTitle = title || defaultTitles[currentLanguage as keyof typeof defaultTitles];
    document.title = finalTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMeta('description', description || defaultDescriptions[currentLanguage as keyof typeof defaultDescriptions]);
    updateMeta('keywords', keywords || defaultKeywords[currentLanguage as keyof typeof defaultKeywords]);
    updateMeta('author', 'SiahRokh Chess');
    updateMeta('robots', 'index, follow');
    updateMeta('language', currentLanguage);

    // Open Graph meta tags
    updateMeta('og:title', finalTitle, true);
    updateMeta('og:description', description || defaultDescriptions[currentLanguage as keyof typeof defaultDescriptions], true);
    updateMeta('og:type', 'website', true);
    updateMeta('og:image', `${window.location.origin}${defaultOgImage}`, true);
    
    // Build language-specific canonical URL
    const baseUrl = window.location.origin;
    const currentPath = window.location.pathname;
    let languageSpecificUrl: string;
    
    if (canonicalUrl) {
      languageSpecificUrl = canonicalUrl;
    } else {
      // Extract path without language prefix
      let pathWithoutLang = currentPath;
      if (pathWithoutLang.startsWith('/en') || pathWithoutLang.startsWith('/fa')) {
        pathWithoutLang = pathWithoutLang.substring(3) || '';
      }
      // Build URL with current language
      languageSpecificUrl = `${baseUrl}/${currentLanguage}${pathWithoutLang}`;
    }
    
    updateMeta('og:url', languageSpecificUrl, true);
    updateMeta('og:site_name', currentLanguage === 'fa' ? 'سیاه‌رخ' : 'SiahRokh', true);
    updateMeta('og:locale', currentLanguage === 'fa' ? 'fa_IR' : 'en_US', true);
    
    // Add additional Open Graph tags for better social media preview
    updateMeta('og:image:width', '1200', true);
    updateMeta('og:image:height', '630', true);
    updateMeta('og:image:alt', currentLanguage === 'fa' ? 'سیاه‌رخ - تورنمنت شطرنج تهران' : 'SiahRokh - Chess Tournament Tehran', true);

    // Twitter Card meta tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', finalTitle);
    updateMeta('twitter:description', description || defaultDescriptions[currentLanguage as keyof typeof defaultDescriptions]);
    updateMeta('twitter:image', `${window.location.origin}${defaultOgImage}`);
    updateMeta('twitter:image:alt', currentLanguage === 'fa' ? 'سیاه‌رخ - تورنمنت شطرنج تهران' : 'SiahRokh - Chess Tournament Tehran');

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = languageSpecificUrl;

    // Alternate language links - properly set URLs for both languages
    // Extract the path without language prefix  
    let pathWithoutLang = currentPath;
    if (pathWithoutLang.startsWith('/en') || pathWithoutLang.startsWith('/fa')) {
      pathWithoutLang = pathWithoutLang.substring(3) || '/';
    }
    if (pathWithoutLang === '/') pathWithoutLang = '';
    
    let alternateFa = document.querySelector('link[hreflang="fa"]') as HTMLLinkElement;
    if (!alternateFa) {
      alternateFa = document.createElement('link');
      alternateFa.rel = 'alternate';
      alternateFa.hreflang = 'fa';
      document.head.appendChild(alternateFa);
    }
    alternateFa.href = `${baseUrl}/fa${pathWithoutLang}`;

    let alternateEn = document.querySelector('link[hreflang="en"]') as HTMLLinkElement;
    if (!alternateEn) {
      alternateEn = document.createElement('link');
      alternateEn.rel = 'alternate';
      alternateEn.hreflang = 'en';
      document.head.appendChild(alternateEn);
    }
    alternateEn.href = `${baseUrl}/en${pathWithoutLang}`;
    
    // Add x-default hreflang
    let xDefault = document.querySelector('link[hreflang="x-default"]') as HTMLLinkElement;
    if (!xDefault) {
      xDefault = document.createElement('link');
      xDefault.rel = 'alternate';
      xDefault.hreflang = 'x-default';
      document.head.appendChild(xDefault);
    }
    xDefault.href = `${baseUrl}/fa${pathWithoutLang}`; // Default to Persian

    // Structured Data
    if (structuredData) {
      let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement;
      if (!structuredDataScript) {
        structuredDataScript = document.createElement('script');
        structuredDataScript.id = 'structured-data';
        structuredDataScript.type = 'application/ld+json';
        document.head.appendChild(structuredDataScript);
      }
      structuredDataScript.innerHTML = JSON.stringify(structuredData);
    }

  }, [title, description, keywords, currentLanguage, isRTL, defaultOgImage, structuredData, canonicalUrl]);

  return null;
}