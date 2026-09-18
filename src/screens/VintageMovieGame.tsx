import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, Film, RefreshCcw } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { saveGameSession } from '@/lib/indexedDB';

interface VintageMovieGameProps {
  onBack: () => void;
}

const MOVIES = [
  { id: 'm1', name: 'Sholay (1975)', actors: ['Amitabh Bachchan', 'Dharmendra'], hint: 'Famous Dialogue: "Yeh dosti hum nahi todenge..."', posterBg: 'from-amber-600 to-red-800' },
  { id: 'm2', name: 'Mother India (1957)', actors: ['Nargis', 'Sunil Dutt'], hint: 'Iconic Oscar-nominated epic of Indian resilience', posterBg: 'from-orange-700 to-yellow-800' },
  { id: 'm3', name: 'Mughal-e-Azam (1960)', actors: ['Dilip Kumar', 'Madhubala'], hint: 'Famous Song: "Pyar kiya to darna kya..."', posterBg: 'from-purple-800 to-amber-700' },
  { id: 'm4', name: 'Anand (1971)', actors: ['Rajesh Khanna', 'Amitabh Bachchan'], hint: 'Famous Quote: "Babumoshai, zindagi badi honi chahiye, lambi nahi!"', posterBg: 'from-teal-700 to-emerald-900' },
  { id: 'm5', name: 'Awara (1951)', actors: ['Raj Kapoor', 'Nargis'], hint: 'Classic Title Track: "Awara hoon, ya gardish mein hoon aasmaan ka tara hoon"', posterBg: 'from-blue-800 to-slate-900' },
  { id: 'm6', name: 'Guide (1965)', actors: ['Dev Anand', 'Waheeda Rehman'], hint: 'Classic Adaptation: R.K. Narayan story featuring "Aaj phir jeene ki tamanna hai"', posterBg: 'from-indigo-800 to-purple-900' },
  { id: 'm7', name: 'Pakeezah (1972)', actors: ['Meena Kumari', 'Raaj Kumar'], hint: 'Classic Dialogue: "Aapke paon dekhe, bahut haseen hain..."', posterBg: 'from-rose-800 to-pink-900' },
  { id: 'm8', name: 'Sangam (1964)', actors: ['Raj Kapoor', 'Vyjayanthimala'], hint: 'Famous Song: "Bol Radha Bol Sangam Hoga Ke Nahin"', posterBg: 'from-cyan-800 to-blue-900' },
  { id: 'm9', name: 'Bombay to Goa (1972)', actors: ['Amitabh Bachchan', 'Aruna Irani'], hint: 'Classic Musical Comedy bus journey', posterBg: 'from-amber-700 to-orange-800' },
  { id: 'm10', name: 'Kagaz Ke Phool (1959)', actors: ['Guru Dutt', 'Waheeda Rehman'], hint: 'Classic Masterpiece featuring "Waqt ne kiya kya haseen sitam"', posterBg: 'from-slate-800 to-zinc-900' }
];

export function VintageMovieGame({ onBack }: VintageMovieGameProps) {
  const { t, speak } = useLanguage();
  const [currentMovie, setCurrentMovie] = useState(MOVIES[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [errors, setErrors] = useState(0);

  const setupRound = useCallback(() => {
    const target = MOVIES[Math.floor(Math.random() * MOVIES.length)];
    setCurrentMovie(target);
    setIsCorrect(null);
    speak(t('whoIsThisActor'));

    // Generate options
    const targetActor = target.actors[0];
    const pool = [
      'Amitabh Bachchan', 'Raj Kapoor', 'Dilip Kumar', 'Dev Anand', 
      'Rajesh Khanna', 'Dharmendra', 'Nargis', 'Madhubala', 
      'Waheeda Rehman', 'Meena Kumari', 'Guru Dutt', 'Vyjayanthimala'
    ];
    
    const distractors = pool.filter(a => !target.actors.includes(a)).sort(() => 0.5 - Math.random()).slice(0, 3);
    const shuffledOptions = [...distractors, targetActor].sort(() => 0.5 - Math.random());
    
    setOptions(shuffledOptions);
  }, [t, speak]);

  useEffect(() => {
    setSessionStartTime(Date.now());
    setupRound();
  }, [setupRound]);

  const handleSelect = (selectedName: string) => {
    if (isCorrect) return;
    
    if (currentMovie.actors.includes(selectedName)) {
      setIsCorrect(true);
      speak(t('correct'));
      
      saveGameSession({
        game_type: 'VintageMovie',
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

  return (
    <div className="animate-fade-in flex flex-col min-h-[calc(100vh-140px)] overflow-y-auto pb-32 p-4">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-primary-700 font-bold active:scale-95">
        <ArrowLeft size={24} strokeWidth={2.5} />
        {t('backToGames')}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-md mx-auto w-full">
        <h2 className="text-2xl font-bold text-primary-900 mb-2">{t('whoIsThisActor')}</h2>
        <p className="text-primary-700 mb-6 font-semibold text-center bg-amber-50 border border-amber-200 p-3 rounded-2xl">
          {currentMovie.hint}
        </p>

        {/* Vintage Movie Banner */}
        <div className={`w-full aspect-video rounded-3xl bg-gradient-to-br ${currentMovie.posterBg} flex flex-col items-center justify-center border-4 border-white shadow-xl mb-8 p-4 text-white text-center relative overflow-hidden`}>
          <Film size={48} className="text-white/40 mb-2" strokeWidth={1.5} />
          <div className="font-heading text-3xl font-extrabold drop-shadow-lg tracking-wide">
            {currentMovie.name}
          </div>
          <span className="mt-2 text-xs uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full font-bold">
            Classic Cinema Quiz
          </span>
        </div>

        {/* Options */}
        <div className="w-full space-y-4">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              className={`w-full rounded-2xl p-5 text-xl font-bold transition-all shadow-md active:scale-95 ${
                isCorrect && currentMovie.actors.includes(option)
                  ? 'bg-success-500 text-white shadow-success-200 ring-4 ring-success-200'
                  : isCorrect === false && !currentMovie.actors.includes(option)
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
              Next Cinema Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
