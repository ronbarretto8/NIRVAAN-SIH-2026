import { ArrowLeft, Home, RotateCcw, Timer, Trophy, Volume2, Zap } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { getGameDifficulty, adjustGameDifficulty } from '@/lib/adaptiveDifficulty';
import { CARD_SPOKEN_KEY } from '@/lib/translations';

const DIFFICULTY_CONFIGS: Record<number, { pairs: number }> = {
  1: { pairs: 3 },
  2: { pairs: 4 },
  3: { pairs: 6 },
};
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import type { DifficultyLevel, GameScore } from '@/types';

interface MemoryMatchProps {
  onBack: () => void;
}

interface Card {
  id: number;
  emoji: string;
  name: string;
  color: string;
  matched: boolean;
}

const ALL_THEMES: { emoji: string; name: string; color: string }[] = [
  { emoji: '🦏', name: 'One-horned Rhino', color: 'bg-secondary-100' },
  { emoji: '🌿', name: 'Tea Leaves', color: 'bg-success-100' },
  { emoji: '🎋', name: 'Bamboo', color: 'bg-primary-100' },
  { emoji: '🏔️', name: 'Mountains', color: 'bg-primary-100' },
  { emoji: '🐅', name: 'Tiger', color: 'bg-accent-100' },
  { emoji: '🧶', name: 'Local Textiles', color: 'bg-accent-100' },
];

function shuffleCards(pairs: number): Card[] {
  const selected = ALL_THEMES.slice(0, pairs);
  const doubled = [...selected, ...selected];
  const shuffled = doubled
    .map((theme) => ({ ...theme }))
    .sort(() => Math.random() - 0.5)
    .map((card, idx) => ({ ...card, id: idx, matched: false }));
  return shuffled;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function levelLabelKey(level: number): string {
  return level === 1 ? 'levelEasy' : level === 2 ? 'levelMedium' : 'levelChallenging';
}

export function MemoryMatch({ onBack }: MemoryMatchProps) {
  const { t, speak, speakKey, stopSpeaking, lang } = useLanguage();
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bestScore, setBestScore] = useState<GameScore | null>(() => loadJSON<GameScore | null>(STORAGE_KEYS.bestScore, null));
  const [lockBoard, setLockBoard] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => loadJSON<DifficultyLevel>(STORAGE_KEYS.difficulty, 1));
  const [levelChangedMsg, setLevelChangedMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalPairs = DIFFICULTY_CONFIGS[difficulty].pairs;

  const fetchBestScore = useCallback(async () => {
    const { data } = await supabase
      .from('game_scores')
      .select('*')
      .eq('game_type', 'memory_match')
      .order('moves', { ascending: true })
      .order('duration_seconds', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) {
      const score = data as GameScore;
      setBestScore(score);
      saveJSON(STORAGE_KEYS.bestScore, score);
    }
  }, []);

  // Load cognitive state on mount
  useEffect(() => {
    const level = getGameDifficulty('MemoryMatch');
    setDifficulty(level as DifficultyLevel);
    fetchBestScore();
  }, [fetchBestScore]);

  const startGame = useCallback(() => {
    const pairs = DIFFICULTY_CONFIGS[difficulty].pairs;
    setCards(shuffleCards(pairs));
    setFlipped([]);
    setMoves(0);
    setErrors(0);
    setMatchedCount(0);
    setStartTime(null);
    setElapsed(0);
    setGameOver(false);
    setLockBoard(false);
    setScoreSaved(false);
    setLevelChangedMsg(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [difficulty]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Live timer
  useEffect(() => {
    if (startTime !== null && !gameOver) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startTime) / 1000));
      }, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, gameOver]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const handleCardClick = (index: number) => {
    if (lockBoard) return;
    if (flipped.includes(index)) return;
    if (cards[index].matched) return;

    if (startTime === null) {
      setStartTime(Date.now());
      speakKey('gameStarted');
    }

    // Speak the card name when flipped (in the selected language)
    const card = cards[index];
    const spokenKey = CARD_SPOKEN_KEY[card.name];
    if (spokenKey) {
      speakKey(spokenKey);
    } else {
      speak(card.name);
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setLockBoard(true);

      const [first, second] = newFlipped;
      if (cards[first].name === cards[second].name) {
        speakKey('matchFound');
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card, idx) =>
              idx === first || idx === second ? { ...card, matched: true } : card
            )
          );
          setFlipped([]);
          setMatchedCount((mc) => mc + 1);
          setLockBoard(false);
        }, 500);
      } else {
        setErrors((e) => e + 1);
        speakKey('noMatch');
        setTimeout(() => {
          setFlipped([]);
          setLockBoard(false);
        }, 1000);
      }
    }
  };

  // Check game over, save score, evaluate adaptive difficulty
  useEffect(() => {
    if (matchedCount === totalPairs && !gameOver && startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(duration);
      setGameOver(true);

      // Speak congratulations in the selected language
      speak(`${t('congratulations')} ${t('youFoundAll')} ${totalPairs} ${t('pairsExclaim')}`);

      if (!scoreSaved) {
        setScoreSaved(true);
        supabase
          .from('game_scores')
          .insert({
            game_type: 'memory_match',
            score: totalPairs,
            moves,
            duration_seconds: duration,
            difficulty_level: difficulty,
            errors,
          })
          .then(async () => {
            fetchBestScore();
            // Evaluate adaptive difficulty
            const accuracy = Math.max(0, 100 - (errors * 10));
            const result = adjustGameDifficulty('MemoryMatch', accuracy, difficulty);
            if (result.nextLevel !== difficulty) {
              setDifficulty(result.nextLevel as DifficultyLevel);
              if (result.message === 'levelUp') {
                setLevelChangedMsg(t('levelUp'));
                speakKey('levelUp');
              } else if (result.message === 'levelDown') {
                setLevelChangedMsg(t('levelDown'));
                speakKey('levelDown');
              }
            }
          });
      }
    }
  }, [matchedCount, gameOver, startTime, moves, errors, difficulty, totalPairs, t, speak, fetchBestScore, scoreSaved]);

  // Speech synthesis voices may not be loaded for all languages
  // We still set the lang and the browser picks the best available voice
  void lang;

  const gridCols = totalPairs <= 3 ? 'grid-cols-3' : totalPairs === 4 ? 'grid-cols-4' : 'grid-cols-4';

  return (
    <div className="animate-fade-in px-5 pb-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card transition-all hover:shadow-card-lg active:scale-95 mt-6"
      >
        <ArrowLeft size={24} className="text-primary-700" strokeWidth={2.5} />
        <span className="text-lg font-semibold text-primary-700">{t('backToGames')}</span>
      </button>

      {/* Game header */}
      <div className="mb-4 rounded-2xl bg-primary-700 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-white">{t('memoryMatch')}</h2>
            <p className="text-base text-primary-200">{t('findPairs')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center rounded-xl bg-primary-800 px-3 py-2">
              <span className="text-xs text-primary-300">{t('pairs')}</span>
              <span className="text-xl font-bold text-secondary-300">
                {matchedCount}/{totalPairs}
              </span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-primary-800 px-3 py-2">
              <span className="text-xs text-primary-300">{t('moves')}</span>
              <span className="text-xl font-bold text-white">{moves}</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-primary-800 px-3 py-2">
              <span className="text-xs text-primary-300">{t('time')}</span>
              <div className="flex items-center gap-1">
                <Timer size={16} className="text-secondary-300" strokeWidth={2.5} />
                <span className="text-xl font-bold text-secondary-300">{formatTime(elapsed)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Difficulty badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-lg bg-secondary-400 px-3 py-1 text-sm font-bold text-primary-900">
            {t('cognitiveLevel')}: {t(levelLabelKey(difficulty))}
          </span>
          <span className="text-sm text-primary-300">
            {totalPairs} {t('pairs')}
          </span>
        </div>
      </div>

      {/* Level changed notification */}
      {levelChangedMsg && !gameOver && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent-100 p-3 shadow-card animate-pop">
          <Zap size={20} className="text-accent-700" strokeWidth={2.5} />
          <span className="text-base font-semibold text-accent-800">{levelChangedMsg}</span>
        </div>
      )}

      {/* Game board */}
      <div className={`grid ${gridCols} gap-3`}>
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={`relative flex aspect-square items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                isFlipped
                  ? `${card.color} border-transparent shadow-card-lg ${
                      card.matched ? 'ring-4 ring-success-400' : ''
                    }`
                  : 'border-primary-300 bg-primary-600 shadow-card hover:bg-primary-500 active:scale-95'
              }`}
              aria-label={isFlipped ? card.name : 'Hidden card'}
              disabled={card.matched}
            >
              {isFlipped ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-5xl sm:text-6xl">{card.emoji}</span>
                  <span className="text-xs font-semibold leading-tight text-primary-800 sm:text-sm">
                    {card.name}
                  </span>
                </div>
              ) : (
                <span className="text-5xl font-bold text-primary-200">?</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Game over — Congratulations */}
      {gameOver && (
        <div className="mt-6 rounded-3xl bg-gradient-to-br from-success-100 to-success-50 p-8 text-center shadow-card-lg animate-pop">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success-500 shadow-lg animate-celebrate">
            <Trophy size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <h3 className="font-heading text-4xl font-semibold text-success-800">{t('congratulations')}</h3>
          <p className="mt-2 text-xl text-success-700">
            {t('youFoundAll')} {totalPairs} {t('pairsExclaim')}
          </p>

          {/* Stats summary */}
          <div className="mt-5 flex justify-center gap-4">
            <div className="rounded-2xl bg-white px-6 py-3 shadow-card">
              <div className="text-3xl font-bold text-primary-700">{moves}</div>
              <div className="text-sm font-medium text-primary-500">{t('moves')}</div>
            </div>
            <div className="rounded-2xl bg-white px-6 py-3 shadow-card">
              <div className="text-3xl font-bold text-primary-700">{formatTime(elapsed)}</div>
              <div className="text-sm font-medium text-primary-500">{t('time')}</div>
            </div>
          </div>

          {/* Level change notification */}
          {levelChangedMsg && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent-100 px-4 py-3">
              <Zap size={20} className="text-accent-700" strokeWidth={2.5} />
              <span className="text-base font-semibold text-accent-800">{levelChangedMsg}</span>
            </div>
          )}

          <p className="mt-4 text-base text-success-600">{t('scoreShared')}</p>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={startGame}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-600 px-6 py-4 text-lg font-bold text-white shadow-card transition-all hover:bg-success-700 active:scale-95"
            >
              <RotateCcw size={24} strokeWidth={2.5} />
              {t('playAgain')}
            </button>
            <button
              onClick={onBack}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-4 text-lg font-bold text-white shadow-card transition-all hover:bg-primary-700 active:scale-95"
            >
              <Home size={24} strokeWidth={2.5} />
              {t('backToGamesMenu')}
            </button>
          </div>
        </div>
      )}

      {/* Best score + Listen button */}
      {bestScore && !gameOver && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-cream-200 p-4 shadow-card">
          <Trophy size={24} className="text-secondary-600" strokeWidth={2.5} />
          <div className="flex-1">
            <span className="text-base font-semibold text-primary-800">{t('best')} </span>
            <span className="text-base text-primary-700">
              {bestScore.moves} {t('moves')} {formatTime(bestScore.duration_seconds)}
            </span>
          </div>
          <button
            onClick={() => speak(`${t('memoryMatch')}. ${t('findPairs')}`)}

            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary-700 shadow-card transition-all hover:shadow-card-lg active:scale-90"
            aria-label={t('listen')}
          >
            <Volume2 size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
