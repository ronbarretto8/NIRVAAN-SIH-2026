import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, UserRound, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { loadJSON, STORAGE_KEYS } from '@/lib/storage';
import { saveGameSession } from '@/lib/indexedDB';
import type { FamilyMember } from '@/types';

interface FamilyRecognitionGameProps {
  onBack: () => void;
}

export function FamilyRecognitionGame({ onBack }: FamilyRecognitionGameProps) {
  const { t, speak } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentMember, setCurrentMember] = useState<FamilyMember | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    let loaded = loadJSON<FamilyMember[]>(STORAGE_KEYS.familyMembers, []);
    if (!loaded || loaded.length === 0) {
      // Provide default sample family members if empty so the game is immediately playable
      loaded = [
        {
          id: 'default-1',
          full_name: 'Aarav Sharma',
          relationship: 'Grandson',
          phone: '+91 98765 43210',
          photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
          created_at: new Date().toISOString()
        },
        {
          id: 'default-2',
          full_name: 'Sunita Sharma',
          relationship: 'Daughter',
          phone: '+91 98765 43211',
          photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          created_at: new Date().toISOString()
        },
        {
          id: 'default-3',
          full_name: 'Rajesh Sharma',
          relationship: 'Son',
          phone: '+91 98765 43212',
          photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          created_at: new Date().toISOString()
        }
      ];
    }
    setMembers(loaded);
    setSessionStartTime(Date.now());
  }, []);

  const setupRound = useCallback(() => {
    if (members.length === 0) return;
    
    // Pick a random member
    const target = members[Math.floor(Math.random() * members.length)];
    setCurrentMember(target);
    setIsCorrect(null);
    speak(t('whoIsThis'));

    // Generate options
    const otherNames = members
      .filter((m) => m.id !== target.id)
      .map((m) => m.full_name);
    
    // Fill with dummy names if not enough family members
    const dummies = ['Rahul Sharma', 'Anjali Desai', 'Vikram Singh', 'Priya Patel', 'Sunita Rao'];
    while (otherNames.length < 3) {
      const dummy = dummies[Math.floor(Math.random() * dummies.length)];
      if (!otherNames.includes(dummy)) otherNames.push(dummy);
    }

    // Pick 3 random distractor names and add the correct name, then shuffle
    const shuffledOptions = [...otherNames.sort(() => 0.5 - Math.random()).slice(0, 3), target.full_name]
      .sort(() => 0.5 - Math.random());

    setOptions(shuffledOptions);
  }, [members, t, speak]);

  useEffect(() => {
    if (members.length > 0) setupRound();
  }, [members, setupRound]);

  const handleSelect = (selectedName: string) => {
    if (isCorrect) return; // Prevent multiple clicks if already correct
    
    if (selectedName === currentMember?.full_name) {
      setIsCorrect(true);
      speak(t('correct'));
      
      // Save progress
      saveGameSession({
        game_type: 'FamilyRecognition',
        accuracy: Math.max(0, 100 - (errors * 10)),
        duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
        errors,
        level: 1,
        played_at: new Date().toISOString()
      });

    } else {
      setIsCorrect(false);
      setErrors((prev) => prev + 1);
      speak(t('tryAgain'));
      setTimeout(() => setIsCorrect(null), 1500);
    }
  };

  if (members.length === 0) {
    return (
      <div className="animate-fade-in p-5">
        <button onClick={onBack} className="mb-6 flex items-center gap-2 text-primary-700 font-bold active:scale-95">
          <ArrowLeft size={24} strokeWidth={2.5} />
          {t('backToGames')}
        </button>
        <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-cream-50 p-6 text-center">
          <UserRound size={48} className="mx-auto mb-3 text-primary-300" strokeWidth={2} />
          <p className="text-lg font-semibold text-primary-600">{t('noFamilyMembers')}</p>
          <p className="mt-1 text-base text-primary-400">{t('noFamilyMembersDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)] overflow-y-auto pb-32 p-4">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-primary-700 font-bold active:scale-95">
        <ArrowLeft size={24} strokeWidth={2.5} />
        {t('backToGames')}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold text-primary-900 mb-6">{t('whoIsThis')}</h2>

        {/* Photo Display */}
        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-xl mb-8 flex-shrink-0">
          {currentMember?.photo_url ? (
            <img src={currentMember.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-100 flex items-center justify-center">
              <UserRound size={80} className="text-primary-300" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="w-full space-y-4">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              className={`w-full rounded-2xl p-5 text-xl font-bold transition-all shadow-md active:scale-95 ${
                isCorrect && option === currentMember?.full_name
                  ? 'bg-success-500 text-white shadow-success-200 ring-4 ring-success-200'
                  : isCorrect === false && option !== currentMember?.full_name
                  ? 'bg-primary-100 text-primary-400 opacity-50'
                  : 'bg-white text-primary-900 hover:bg-primary-50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Success State */}
        {isCorrect && (
          <div className="mt-8 flex flex-col items-center animate-bounce-short">
            <div className="flex items-center gap-2 text-success-600 mb-4">
              <CheckCircle2 size={32} strokeWidth={2.5} />
              <span className="text-xl font-bold">{t('correct')}</span>
            </div>
            <button
              onClick={setupRound}
              className="flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-4 text-xl font-bold text-white shadow-lg active:scale-95"
            >
              <RefreshCcw size={24} strokeWidth={2.5} />
              Next Person
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
