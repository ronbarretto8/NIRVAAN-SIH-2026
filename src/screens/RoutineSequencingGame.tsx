import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, ListOrdered, RefreshCcw, Coffee, Droplets, Sun, Activity } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { saveGameSession } from '@/lib/indexedDB';

interface RoutineSequencingGameProps {
  onBack: () => void;
}

const ROUTINES = [
  {
    id: 'r1',
    steps: [
      { id: 's1', label: 'Wake up', icon: Sun },
      { id: 's2', label: 'Drink water', icon: Droplets },
      { id: 's3', label: 'Have tea/coffee', icon: Coffee },
      { id: 's4', label: 'Take morning medicine', icon: Activity },
    ]
  }
];

export function RoutineSequencingGame({ onBack }: RoutineSequencingGameProps) {
  const { t, speak } = useLanguage();
  const [sequence, setSequence] = useState<any[]>([]);
  const [shuffledSteps, setShuffledSteps] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [errors, setErrors] = useState(0);

  const setupRound = useCallback(() => {
    const routine = ROUTINES[0];
    setSequence(routine.steps);
    // Shuffle
    const shuffled = [...routine.steps].sort(() => 0.5 - Math.random());
    setShuffledSteps(shuffled);
    setSelectedOrder([]);
    setIsCorrect(null);
    speak(t('arrangeInOrder'));
  }, [t, speak]);

  useEffect(() => {
    setSessionStartTime(Date.now());
    setupRound();
  }, [setupRound]);

  const handleSelect = (stepId: string) => {
    if (isCorrect) return;
    if (selectedOrder.includes(stepId)) return; // Already selected
    
    const expectedStepId = sequence[selectedOrder.length].id;
    
    if (stepId === expectedStepId) {
      // Correct step
      const newOrder = [...selectedOrder, stepId];
      setSelectedOrder(newOrder);
      
      if (newOrder.length === sequence.length) {
        setIsCorrect(true);
        speak(t('routineComplete'));
        
        saveGameSession({
          game_type: 'RoutineSequencing',
          accuracy: Math.max(0, 100 - (errors * 10)),
          duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
          errors,
          level: 1,
          played_at: new Date().toISOString()
        });
      }
    } else {
      // Wrong step
      setIsCorrect(false);
      setErrors(e => e + 1);
      speak(t('routineWrong'));
      setTimeout(() => setIsCorrect(null), 1500);
    }
  };

  const getStepStatus = (stepId: string) => {
    if (selectedOrder.includes(stepId)) return 'selected';
    if (isCorrect === false) return 'error'; // Flash error visually?
    return 'available';
  };

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)] overflow-y-auto pb-32 p-4">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-primary-700 font-bold active:scale-95">
        <ArrowLeft size={24} strokeWidth={2.5} />
        {t('backToGames')}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <ListOrdered size={32} className="text-primary-600" />
          <h2 className="text-2xl font-bold text-primary-900">{t('routineGame')}</h2>
        </div>
        <p className="text-primary-600 mb-8 font-semibold text-center">{t('arrangeInOrder')}</p>

        {/* Selected Sequence View */}
        <div className="w-full bg-white rounded-3xl p-4 shadow-sm border-2 border-primary-100 min-h-[120px] mb-8 flex flex-col gap-2">
          {selectedOrder.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-primary-400 font-semibold italic">
              {t('tapFirstStep')}
            </div>
          ) : (
            selectedOrder.map((id, index) => {
              const step = sequence.find(s => s.id === id);
              if (!step) return null;
              const Icon = step.icon;
              return (
                <div key={id} className="flex items-center gap-3 bg-success-50 rounded-xl p-3 border border-success-100 animate-slide-up">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success-200 text-success-700 font-bold">
                    {index + 1}
                  </div>
                  <Icon size={24} className="text-success-600" />
                  <span className="font-bold text-success-900">{step.label}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Options */}
        <div className="w-full grid grid-cols-2 gap-4">
          {shuffledSteps.map((step) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            
            if (status === 'selected') {
              return (
                <div key={step.id} className="w-full aspect-square rounded-3xl bg-primary-50 border-2 border-primary-100 opacity-30 flex flex-col items-center justify-center p-4">
                  <CheckCircle2 size={40} className="text-primary-300" />
                </div>
              );
            }

            return (
              <button
                key={step.id}
                onClick={() => handleSelect(step.id)}
                className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-3 p-4 text-center transition-all shadow-md active:scale-95 ${
                  isCorrect === false
                    ? 'bg-primary-100 text-primary-400 opacity-50'
                    : 'bg-white text-primary-900 hover:bg-primary-50 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent-100 text-accent-600">
                  <Icon size={32} strokeWidth={2.5} />
                </div>
                <span className="font-bold leading-tight">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Success State */}
        {isCorrect && (
          <div className="mt-8 flex flex-col items-center animate-bounce-short">
            <div className="flex items-center gap-2 text-success-600 mb-4">
              <CheckCircle2 size={32} strokeWidth={2.5} />
              <span className="text-xl font-bold">{t('routineComplete')}</span>
            </div>
            <button
              onClick={setupRound}
              className="flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-4 text-xl font-bold text-white shadow-lg active:scale-95"
            >
              <RefreshCcw size={24} strokeWidth={2.5} />
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
