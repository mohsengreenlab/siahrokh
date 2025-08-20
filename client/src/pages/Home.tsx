import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Tournament, Registration } from '@shared/schema';
import { CountdownTimer } from '../components/CountdownTimer';
import { TournamentCard } from '../components/TournamentCard';
import { RegistrationForm } from '../components/RegistrationForm';
import { PostRegistration } from '../components/PostRegistration';
import { SEO } from '../components/SEO';
import { useLanguage } from '../hooks/useLanguage';

export default function Home() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showPostRegistration, setShowPostRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState<{
    registration: Registration;
    tournament: Tournament;
  } | null>(null);

  const { data: tournaments = [] } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments']
  });

  const { data: nextTournament } = useQuery<Tournament | null>({
    queryKey: ['/api/tournaments/next']
  });

  // Generate structured data for SEO
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": currentLanguage === 'fa' ? "سیاه‌رخ" : "SiahRokh",
      "url": "https://siahrokh.com",
      "logo": "https://siahrokh.com/assets/Gemini_Generated_Image_yguf2iyguf2iyguf_1755644880540.png",
      "description": currentLanguage === 'fa' 
        ? "رزرو آنلاین تورنمنت‌های شطرنج در تهران و ایران. کلاس‌های شطرنج، مسابقات حرفه‌ای و آموزش شطرنج برای همه سطوح."
        : "Online booking for chess tournaments in Tehran and Iran. Professional chess classes, competitions and chess training for all levels.",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "email": "info@siahrokh.ir"
      },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "IR",
        "addressLocality": currentLanguage === 'fa' ? "تهران" : "Tehran"
      }
    };

    if (nextTournament) {
      return [
        baseData,
        {
          "@context": "https://schema.org",
          "@type": "Event",
          "name": nextTournament.name,
          "startDate": nextTournament.date,
          "location": {
            "@type": "Place",
            "name": nextTournament.venueAddress,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": nextTournament.venueAddress,
              "addressCountry": "IR",
              "addressLocality": currentLanguage === 'fa' ? "تهران" : "Tehran"
            }
          },
          "organizer": {
            "@type": "Organization",
            "name": currentLanguage === 'fa' ? "سیاه‌رخ" : "SiahRokh",
            "url": "https://siahrokh.com"
          },
          "offers": {
            "@type": "Offer",
            "price": nextTournament.registrationFee || "0",
            "priceCurrency": "IRR",
            "availability": nextTournament.isOpen ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": "https://siahrokh.com"
          },
          "eventStatus": nextTournament.isOpen ? "https://schema.org/EventScheduled" : "https://schema.org/EventCancelled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "description": currentLanguage === 'fa' 
            ? `تورنمنت شطرنج ${nextTournament.name} در تهران. هزینه ثبت نام: ${nextTournament.registrationFee || 'رایگان'}`
            : `Chess tournament ${nextTournament.name} in Tehran. Registration fee: ${nextTournament.registrationFee || 'Free'}`
        }
      ];
    }

    return baseData;
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowRegistrationForm(true);
  };

  const handleRegistrationSuccess = (registration: Registration, tournament: Tournament) => {
    setRegistrationData({ registration, tournament });
    setShowRegistrationForm(false);
    setShowPostRegistration(true);
  };

  const handleBackToHome = () => {
    setShowRegistrationForm(false);
    setShowPostRegistration(false);
    setSelectedTournament(null);
    setRegistrationData(null);
  };

  if (showPostRegistration && registrationData) {
    return (
      <>
        <SEO 
          title={currentLanguage === 'fa' 
            ? `ثبت نام موفق - ${registrationData.tournament.name} | سیاه‌رخ`
            : `Registration Success - ${registrationData.tournament.name} | SiahRokh`
          }
        />
        <PostRegistration
          registration={registrationData.registration}
          tournament={registrationData.tournament}
          onBackToHome={handleBackToHome}
        />
      </>
    );
  }

  if (showRegistrationForm && selectedTournament) {
    return (
      <>
        <SEO 
          title={currentLanguage === 'fa' 
            ? `ثبت نام در ${selectedTournament.name} | سیاه‌رخ`
            : `Register for ${selectedTournament.name} | SiahRokh`
          }
        />
        <RegistrationForm
          tournament={selectedTournament}
          onSuccess={handleRegistrationSuccess}
          onCancel={handleBackToHome}
        />
      </>
    );
  }

  return (
    <>
      <SEO 
        title={currentLanguage === 'fa' 
          ? 'سیاه‌رخ - تورنمنت شطرنج تهران | رزرو آنلاین مسابقات شطرنج ایران'
          : 'SiahRokh - Chess Tournament Tehran | Online Chess Competition Booking Iran'
        }
        description={currentLanguage === 'fa'
          ? 'رزرو آنلاین تورنمنت‌های شطرنج در تهران و ایران. کلاس‌های شطرنج، مسابقات حرفه‌ای و آموزش شطرنج برای همه سطوح در سیاه‌رخ.'
          : 'Online booking for chess tournaments in Tehran and Iran. Professional chess classes, competitions and chess training for all levels at SiahRokh.'
        }
        keywords={currentLanguage === 'fa'
          ? 'مسابقه شطرنج تهران, تورنمنت شطرنج ایران, کلاس شطرنج, مسابقات شطرنج, آموزش شطرنج, سیاه رخ, شطرنج حرفه ای'
          : 'Chess tournament Tehran, Chess tournament Iran, Chess competition, Chess classes Iran, chess training, SiahRokh, professional chess'
        }
        structuredData={generateStructuredData()}
        canonicalUrl="https://siahrokh.com/"
      />
      <main className="min-h-screen">
      {/* Hero Section with Countdown */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-chess-black to-chess-dark relative">
        <div className="absolute inset-0 chess-pattern opacity-5"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-white">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-gray-300 mb-12">
              {t('hero.subtitle')}
            </p>
          </div>

          <CountdownTimer tournament={nextTournament || null} />
        </div>
      </section>

      {/* Tournament Selection */}
      <section id="tournaments" className="py-16 px-4 sm:px-6 lg:px-8 bg-chess-dark">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">{t('tournament.selection')}</h2>
            <p className="text-gray-300">{t('tournament.selectionSubtitle')}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onSelect={handleTournamentSelect}
              />
            ))}
          </div>

          {tournaments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">هیچ تورنمنتی در حال حاضر باز نیست</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-chess-black border-t border-chess-card py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src="/assets/Gemini_Generated_Image_yguf2iyguf2iyguf_1755644880540.png" 
                  alt={currentLanguage === 'fa' ? 'لوگو سیاه‌رخ - تورنمنت شطرنج تهران' : 'SiahRokh Logo - Tehran Chess Tournament'} 
                  className="w-8 h-8 mx-3" 
                  loading="lazy"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">سیاه‌رخ</h3>
                  <p className="text-xs text-gray-400">SiahRokh</p>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                {t('footer.description')}
              </p>
              <div className="flex space-x-4 space-x-reverse">
                <a href="https://instagram.com/siah_rokh" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-chess-accent">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2">
                <li><a href="#tournaments" className="text-gray-400 hover:text-chess-accent">{t('nav.tournaments')}</a></li>
                <li><a href="/faq" className="text-gray-400 hover:text-chess-accent">{t('nav.faq')}</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-chess-accent">{t('nav.terms')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">{t('footer.contact')}</h4>
              <div className="space-y-2">
                <p className="text-gray-400">
                  <i className="fas fa-envelope mx-2 text-chess-accent"></i>
                  {t('footer.email')}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-chess-card mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}
