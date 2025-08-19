import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tournament } from '@shared/schema';

interface CountdownTimerProps {
  tournament: Tournament | null;
}

export function CountdownTimer({ tournament }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!tournament) return;

    const targetDate = new Date(tournament.date).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tournament]);

  if (!tournament) {
    return (
      <div className="bg-chess-card rounded-xl p-8 mb-12 border border-gray-700 shadow-2xl">
        <h2 className="text-2xl font-semibold mb-6 text-white text-center">
          {t('tournament.noNext')}
        </h2>
      </div>
    );
  }

  return (
    <div className="bg-chess-card rounded-xl p-8 mb-12 border border-gray-700 shadow-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-white text-center">
        {tournament.name}
      </h2>
      <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
        {Object.entries(timeLeft).map(([unit, value]) => (
          <div key={unit} className="text-center">
            <div className="bg-chess-black rounded-lg p-4 countdown-digit">
              <div className="text-3xl font-bold text-white">
                {value.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400">
                {t(`countdown.${unit}`)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
