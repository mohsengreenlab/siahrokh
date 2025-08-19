import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Search, AlertTriangle } from 'lucide-react';

interface CertificateValidationResult {
  valid: boolean;
  certificateId: string;
  participant: {
    name: string;
    email: string;
    registrationDate: string;
  };
  tournament: {
    name: string;
    date: string;
    venue: string;
  };
}

export function Certificate() {
  const { t, i18n } = useTranslation();
  const [certificateId, setCertificateId] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ['/api/certificates', certificateId],
    queryFn: async (): Promise<CertificateValidationResult> => {
      if (!certificateId || certificateId.length !== 10) {
        throw new Error('Invalid certificate format');
      }
      
      const response = await fetch(`/api/certificates/${certificateId.toUpperCase()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Certificate not found');
      }
      return response.json();
    },
    enabled: searchTriggered && certificateId.length === 10,
    retry: false
  });

  const handleSearch = () => {
    if (certificateId.length === 10) {
      setSearchTriggered(true);
    }
  };

  const handleInputChange = (value: string) => {
    // Only allow alphanumeric characters and limit to 10
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setCertificateId(cleaned);
    setSearchTriggered(false);
  };

  const isRTL = i18n.language === 'fa';

  return (
    <section className="min-h-screen bg-chess-bg text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {t('certificate.title')}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t('certificate.description')}
          </p>
        </div>

        {/* Search Form */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('certificate.searchTitle')}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {t('certificate.searchDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <Input
                  type="text"
                  value={certificateId}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t('certificate.placeholder')}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-lg font-mono text-center tracking-wider"
                  maxLength={10}
                  data-testid="input-certificate-id"
                />
                <p className="text-sm text-gray-400 mt-2 text-center">
                  {t('certificate.format')}: 12345ABCDE
                </p>
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={certificateId.length !== 10 || isLoading}
              className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3"
              data-testid="button-search-certificate"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {t('certificate.searching')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {t('certificate.search')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {searchTriggered && (
          <div>
            {isLoading && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-8 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <i className="fas fa-spinner fa-spin text-xl"></i>
                    <span className="text-lg">{t('certificate.validating')}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Alert className="bg-red-900/20 border-red-600 text-white">
                <XCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-300">
                  {error.message}
                </AlertDescription>
              </Alert>
            )}

            {data && (
              <Card className="bg-green-900/20 border-green-600">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    {t('certificate.valid')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    {/* Certificate Info */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-green-400 mb-3">
                        {t('certificate.certificateInfo')}
                      </h3>
                      <div className="space-y-2">
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'} items-center`}>
                          <span className="text-gray-300">{t('certificate.certificateId')}:</span>
                          <Badge variant="outline" className="bg-green-900/30 text-green-300 border-green-600 font-mono">
                            {data.certificateId}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Participant Info */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">
                        {t('certificate.participantInfo')}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.participantName')}:</span>
                          <span className="text-white font-medium">{data.participant.name}</span>
                        </div>
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.participantEmail')}:</span>
                          <span className="text-white">{data.participant.email}</span>
                        </div>
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.registrationDate')}:</span>
                          <span className="text-white">
                            {new Date(data.participant.registrationDate).toLocaleDateString(
                              i18n.language === 'fa' ? 'fa-IR' : 'en-US'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tournament Info */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">
                        {t('certificate.tournamentInfo')}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.tournamentName')}:</span>
                          <span className="text-white font-medium">{data.tournament.name}</span>
                        </div>
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.tournamentDate')}:</span>
                          <span className="text-white">
                            {new Date(data.tournament.date).toLocaleDateString(
                              i18n.language === 'fa' ? 'fa-IR' : 'en-US'
                            )}
                          </span>
                        </div>
                        <div className={`flex ${isRTL ? 'justify-between' : 'justify-between'}`}>
                          <span className="text-gray-300">{t('certificate.tournamentVenue')}:</span>
                          <span className="text-white">{data.tournament.venue}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-gray-800/50 border-gray-700 mt-8">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-2">
                  {t('certificate.infoTitle')}
                </p>
                <ul className="space-y-1 text-gray-400">
                  <li>• {t('certificate.info1')}</li>
                  <li>• {t('certificate.info2')}</li>
                  <li>• {t('certificate.info3')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}