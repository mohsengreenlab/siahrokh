import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tournament, Registration } from '@shared/schema';
import { Button } from '@/components/ui/button';

interface PostRegistrationProps {
  registration: Registration;
  tournament: Tournament;
  onBackToHome: () => void;
}

export function PostRegistration({ registration, tournament, onBackToHome }: PostRegistrationProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    if (!tournament) {
      console.error('Tournament details missing');
      return;
    }
    
    try {
      const response = await fetch(`/api/registrations/${registration.id}/pdf`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/pdf')) {
          // PDF was successfully generated
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `registration-${registration.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else if (contentType?.includes('text/html')) {
          // HTML fallback - open in new window for user to print/save as PDF
          const htmlContent = await response.text();
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            console.log('PDF service unavailable. Opening printable version in new window.');
          }
        }
      } else {
        console.error('Failed to generate PDF:', response.status);
        console.error("Couldn't generate PDF. Please try again.");
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      console.error("Couldn't generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fa-IR');
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-chess-dark">
      <div className="max-w-2xl mx-auto">
        <div className="bg-chess-card rounded-xl p-8 border border-gray-700 shadow-2xl">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('registration.success')}</h2>
            <p className="text-gray-300">{t('registration.successSubtitle')}</p>
          </div>

          {/* Tournament Details */}
          <div className="bg-chess-black rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">{t('postRegistration.details')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('admin.name')}:</span>
                <span className="text-white">{tournament.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('admin.date')}:</span>
                <span className="text-white">{formatDate(tournament.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('admin.time')}:</span>
                <span className="text-white">{tournament.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('postRegistration.registrationId')}:</span>
                <span className="text-gray-300 font-mono">#{registration.id.substring(0, 8).toUpperCase()}</span>
              </div>
              {registration.certificateId && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('postRegistration.certificateId')}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white bg-green-900/30 px-2 py-1 rounded border border-green-600">
                      {registration.certificateId}
                    </span>
                    <a
                      href={`/certificate?id=${registration.certificateId}`}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                      title="Verify certificate"
                    >
                      Verify
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Venue Information */}
          <div className="bg-chess-black rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">{t('postRegistration.venue')}</h3>
            <div className="space-y-2">
              <p className="text-white">{tournament.venueAddress}</p>
              {tournament.venueInfo && (
                <p className="text-gray-400">{tournament.venueInfo}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleDownloadPDF}
              disabled={!tournament || isDownloading}
              className="flex-1 bg-white hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
              data-testid="button-download-pdf"
              title={!tournament ? "Tournament details are missing" : ""}
            >
              {isDownloading ? (
                <>
                  <i className="fas fa-spinner fa-spin mx-2"></i>
                  {t('postRegistration.downloadingPDF')}
                </>
              ) : (
                <>
                  <i className="fas fa-download mx-2"></i>
                  {t('postRegistration.downloadPDF')}
                </>
              )}
            </Button>
            <Button
              onClick={onBackToHome}
              variant="outline"
              className="flex-1 border-gray-600 text-white hover:bg-gray-800"
            >
              <i className="fas fa-home mx-2"></i>
              {t('postRegistration.backToHome')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
