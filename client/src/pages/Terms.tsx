import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { Button } from '@/components/ui/button';

export default function Terms() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const pdfPath = `/pdfs/terms-${currentLanguage}.pdf`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = `terms-${currentLanguage}.pdf`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-chess-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{t('terms.title')}</h1>
          <Button 
            onClick={handleDownload}
            className="bg-white hover:bg-gray-200 text-black font-medium"
          >
            <i className="fas fa-download mx-2"></i>
            {t('terms.download')}
          </Button>
        </div>

        <div className="bg-chess-card rounded-xl border border-gray-700 overflow-hidden">
          <iframe
            src={pdfPath}
            title="Terms of Service Document"
            className="w-full h-[800px]"
            style={{ border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
