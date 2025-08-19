import { useTranslation } from 'react-i18next';
import { Tournament } from '@shared/schema';

interface TournamentCardProps {
  tournament: Tournament;
  onSelect: (tournament: Tournament) => void;
}

export function TournamentCard({ tournament, onSelect }: TournamentCardProps) {
  const { t } = useTranslation();

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fa-IR');
  };

  return (
    <div className="bg-chess-card rounded-xl p-6 border border-gray-700 hover:border-chess-accent transition-colors cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{tournament.name}</h3>
          <p className="text-gray-400 text-sm">{formatDate(tournament.date)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          tournament.isOpen ? 'bg-chess-success' : 'bg-gray-500'
        }`}>
          {t(tournament.isOpen ? 'tournament.open' : 'tournament.closed')}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-300">
          <i className="fas fa-clock mx-2 text-chess-accent"></i>
          <span>{tournament.time}</span>
        </div>
      </div>
      <button
        onClick={() => onSelect(tournament)}
        disabled={!tournament.isOpen}
        className="w-full bg-chess-accent hover:bg-amber-600 text-black font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {t('tournament.select')}
      </button>
    </div>
  );
}
