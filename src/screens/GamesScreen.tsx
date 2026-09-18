import { useLanguage } from '@/lib/LanguageContext';
import { MemoryMatch } from './MemoryMatchGame';
import { FamilyRecognitionGame } from './FamilyRecognitionGame';
import { VintageMovieGame } from './VintageMovieGame';
import { RoutineSequencingGame } from './RoutineSequencingGame';
import { ColorShapeGame } from './ColorShapeGame';
import { SoundIdentificationGame } from './SoundIdentificationGame';
import { Brain, Users, Film, ListOrdered, Palette, Volume2 } from 'lucide-react';

interface GamesScreenProps {
  playingGame: string | null;
  onStartGame: (gameId: string | null) => void;
}

export function GamesScreen({ playingGame, onStartGame }: GamesScreenProps) {
  const { t } = useLanguage();

  if (playingGame === 'memory-match') return <MemoryMatch onBack={() => onStartGame(null)} />;
  if (playingGame === 'family-recognition') return <FamilyRecognitionGame onBack={() => onStartGame(null)} />;
  if (playingGame === 'vintage-movie') return <VintageMovieGame onBack={() => onStartGame(null)} />;
  if (playingGame === 'routine-sequence') return <RoutineSequencingGame onBack={() => onStartGame(null)} />;
  if (playingGame === 'color-shape') return <ColorShapeGame onBack={() => onStartGame(null)} />;
  if (playingGame === 'sound-id') return <SoundIdentificationGame onBack={() => onStartGame(null)} />;

  const GAMES = [
    {
      id: 'memory-match',
      titleKey: 'memoryMatch',
      descKey: 'memoryMatchDesc',
      icon: Brain,
      color: 'bg-primary-100 text-primary-700',
    },
    {
      id: 'family-recognition',
      titleKey: 'familyGame',
      descKey: 'familyGameDesc',
      icon: Users,
      color: 'bg-accent-100 text-accent-700',
    },
    {
      id: 'routine-sequence',
      titleKey: 'routineGame',
      descKey: 'routineGameDesc',
      icon: ListOrdered,
      color: 'bg-success-100 text-success-700',
    },
    {
      id: 'color-shape',
      titleKey: 'colorShapeGame',
      descKey: 'colorShapeDesc',
      icon: Palette,
      color: 'bg-warning-100 text-warning-700',
    },
    {
      id: 'sound-id',
      titleKey: 'soundGame',
      descKey: 'soundGameDesc',
      icon: Volume2,
      color: 'bg-secondary-100 text-secondary-700',
    },
    {
      id: 'vintage-movie',
      titleKey: 'vintageGame',
      descKey: 'vintageGameDesc',
      icon: Film,
      color: 'bg-primary-100 text-primary-700',
    },
  ];

  return (
    <div className="animate-fade-in p-5 pb-6">
      <div className="mb-8 mt-2 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary-900">{t('brainGames')}</h1>
        <p className="mt-2 text-lg text-primary-600">{t('keepMindSharp')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => onStartGame(game.id)}
              className="group flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-all active:scale-95"
            >
              <div className="flex items-center gap-5 p-5">
                <div
                  className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl ${game.color} transition-transform group-active:scale-95`}
                >
                  <Icon size={40} strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-heading text-2xl font-bold text-primary-900 leading-tight">
                    {t(game.titleKey)}
                  </h3>
                  <p className="mt-1 text-base text-primary-500 leading-snug">
                    {t(game.descKey)}
                  </p>
                </div>
              </div>
              <div className="bg-primary-50 p-4 text-center">
                <span className="text-lg font-bold text-primary-700">{t('startPlaying')} &rarr;</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
