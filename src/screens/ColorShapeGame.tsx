import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCcw, Circle, Square, Triangle, Star, Hexagon } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { saveGameSession } from '@/lib/indexedDB';

interface ColorShapeGameProps {
  onBack: () => void;
}

const SHAPES = [
  { id: 'circle', Icon: Circle },
  { id: 'square', Icon: Square },
  { id: 'triangle', Icon: Triangle },
  { id: 'star', Icon: Star },
  { id: 'hexagon', Icon: Hexagon }
];

const COLORS = [
  { id: 'red', value: 'text-error-500' },
  { id: 'blue', value: 'text-accent-500' },
  { id: 'green', value: 'text-success-500' },
  { id: 'yellow', value: 'text-warning-500' },
  { id: 'purple', value: 'text-purple-500' }
];

export function ColorShapeGame({ onBack }: ColorShapeGameProps) {
  const { t, speak } = useLanguage();
  const [target, setTarget] = useState({ shape: SHAPES[0], color: COLORS[0] });
  const [options, setOptions] = useState<any[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [errors, setErrors] = useState(0);

  const setupRound = useCallback(() => {
    // Pick random target
    const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const targetObj = { shape: targetShape, color: targetColor, isTarget: true };
    
    setTarget(targetObj);
    setIsCorrect(null);
    speak(`${t('tapThe')} ${targetColor.id} ${targetShape.id}`);

    // Generate 3 distractors
    const distractors = [];
    while (distractors.length < 3) {
      const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      // Ensure not duplicate of target or other distractors
      if ((s.id !== targetShape.id || c.id !== targetColor.id) && 
          !distractors.find(d => d.shape.id === s.id && d.color.id === c.id)) {
        distractors.push({ shape: s, color: c, isTarget: false });
      }
    }

    // Shuffle options
    const shuffledOptions = [...distractors, targetObj].sort(() => 0.5 - Math.random());
    setOptions(shuffledOptions);
  }, [t, speak]);

  useEffect(() => {
    setSessionStartTime(Date.now());
    setupRound();
  }, [setupRound]);

  const handleSelect = (isTarget: boolean) => {
    if (isCorrect) return;
    
    if (isTarget) {
      setIsCorrect(true);
      speak(t('excellent'));
      
      saveGameSession({
        game_type: 'ColorShape',
        accuracy: Math.max(0, 100 - (errors * 10)),
        duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
        errors,
        level: 1,
        played_at: new Date().toISOString()
      });
    } else {
      setIsCorrect(false);
      setErrors(e => e + 1);
      speak(t('goodTry'));
      setTimeout(() => setIsCorrect(null), 1500);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)] overflow-y-auto pb-32 p-4">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-primary-700 font-bold active:scale-95">
        <ArrowLeft size={24} strokeWidth={2.5} />
        {t('backToGames')}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold text-primary-900 mb-8 text-center">
          {t('tapThe')} <span className="uppercase text-accent-700">{target.color.id} {target.shape.id}</span>
        </h2>

        {/* Options Grid */}
        <div className="w-full grid grid-cols-2 gap-6">
          {options.map((opt, idx) => {
            const Icon = opt.shape.Icon;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt.isTarget)}
                className={`w-full aspect-square rounded-3xl flex items-center justify-center transition-all shadow-md active:scale-95 border-4 ${
                  isCorrect && opt.isTarget
                    ? 'bg-success-100 border-success-400 ring-4 ring-success-200'
                    : isCorrect === false && !opt.isTarget
                    ? 'bg-primary-100 border-primary-200 opacity-50'
                    : 'bg-white border-primary-100 hover:bg-primary-50 hover:shadow-lg'
                }`}
              >
                <Icon size={80} className={opt.color.value} strokeWidth={isCorrect && opt.isTarget ? 3 : 2} fill="currentColor" fillOpacity={0.2} />
              </button>
            );
          })}
        </div>

        {/* Success State */}
        {isCorrect && (
          <div className="mt-10 flex flex-col items-center animate-bounce-short">
            <div className="flex items-center gap-2 text-success-600 mb-4">
              <CheckCircle2 size={32} strokeWidth={2.5} />
              <span className="text-xl font-bold">{t('excellent')}</span>
            </div>
            <button
              onClick={setupRound}
              className="flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-4 text-xl font-bold text-white shadow-lg active:scale-95"
            >
              <RefreshCcw size={24} strokeWidth={2.5} />
              Next Shape
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
