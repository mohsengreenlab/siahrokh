import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { SEO } from '../components/SEO';

export default function FAQ() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const pdfPath = `/pdfs/faq-${currentLanguage}.pdf`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = `faq-${currentLanguage}.pdf`;
    link.click();
  };

  return (
    <>
      <SEO 
        title={currentLanguage === 'fa' 
          ? 'سوالات متداول | سیاه‌رخ - تورنمنت شطرنج تهران'
          : 'FAQ | SiahRokh - Chess Tournament Tehran'
        }
        description={currentLanguage === 'fa'
          ? 'پاسخ به سوالات متداول در مورد تورنمنت‌های شطرنج، ثبت نام، قوانین مسابقات و کلاس‌های آموزشی در سیاه‌رخ.'
          : 'Frequently asked questions about chess tournaments, registration, competition rules and training classes at SiahRokh.'
        }
        keywords={currentLanguage === 'fa'
          ? 'سوالات متداول شطرنج, قوانین تورنمنت شطرنج, راهنمای ثبت نام, کلاس شطرنج تهران'
          : 'chess FAQ, chess tournament rules, registration guide, chess classes Tehran'
        }
        canonicalUrl="https://siahrokh.com/faq"
      />
      <div className="min-h-screen bg-chess-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{t('faq.title')}</h1>
          <Button 
            onClick={handleDownload}
            className="bg-white hover:bg-gray-200 text-black font-medium"
          >
            <i className="fas fa-download mx-2"></i>
            {t('faq.download')}
          </Button>
        </header>

        <div className="bg-chess-card rounded-xl border border-gray-700 overflow-hidden">
          <iframe
            src={pdfPath}
            title="FAQ Document"
            className="w-full h-[800px]"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
    </>
  );
}
