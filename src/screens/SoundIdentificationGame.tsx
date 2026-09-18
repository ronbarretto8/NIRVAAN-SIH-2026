import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Volume2, RefreshCcw, BellRing, Bird, CloudRain, Coffee } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { saveGameSession } from '@/lib/indexedDB';

interface SoundIdentificationGameProps {
  onBack: () => void;
}

const SOUNDS = [
  { id: 'bird', label: 'Bird Chirp', icon: Bird, play: playBird },
  { id: 'bell', label: 'Temple Bell', icon: BellRing, play: playBell },
  { id: 'rain', label: 'Rain', icon: CloudRain, play: playRain },
  { id: 'kettle', label: 'Tea Kettle', icon: Coffee, play: playKettle }
];

// --- Web Audio Synthesizers ---
function getAudioContext() {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  return new AudioContext();
}

function playBird(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(3000, now);
  osc.frequency.exponentialRampToValueAtTime(4000, now + 0.1);
  osc.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + 0.05);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  
  osc.start(now);
  osc.stop(now + 0.2);
}

function playBell(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(800, now);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 2);
  
  osc.start(now);
  osc.stop(now + 2);
}

function playRain(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.2);
  gain.gain.linearRampToValueAtTime(0, now + 1.8);
  
  noise.start(now);
  noise.stop(now + 2);
}

function playKettle(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.linearRampToValueAtTime(2500, now + 1);
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
  gain.gain.linearRampToValueAtTime(0, now + 1.5);
  
  osc.start(now);
  osc.stop(now + 2);
}
// ------------------------------

export function SoundIdentificationGame({ onBack }: SoundIdentificationGameProps) {
  const { t, speak } = useLanguage();
  const [target, setTarget] = useState(SOUNDS[0]);
  const [options, setOptions] = useState<any[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [errors, setErrors] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const setupRound = useCallback(() => {
    // Stop current audio if playing
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    const t = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
    setTarget(t);
    setIsCorrect(null);
    setHasPlayed(false);
    setIsPlaying(false);
    
    // 3 random distractors
    const otherSounds = SOUNDS.filter(s => s.id !== t.id);
    const distractors = otherSounds.sort(() => 0.5 - Math.random()).slice(0, 3);
    const shuffledOptions = [...distractors, t].sort(() => 0.5 - Math.random());
    
    setOptions(shuffledOptions);
  }, []);

  useEffect(() => {
    setSessionStartTime(Date.now());
    setupRound();
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [setupRound]);

  const handlePlaySound = () => {
    if (audioCtxRef.current) audioCtxRef.current.close();
    const ctx = getAudioContext();
    audioCtxRef.current = ctx;
    
    setIsPlaying(true);
    setHasPlayed(true);
    target.play(ctx);
    
    setTimeout(() => {
      setIsPlaying(false);
    }, 2000); // Max duration of sounds
  };

  const handleSelect = (soundId: string) => {
    if (isCorrect) return;
    if (!hasPlayed) {
      speak(t('tapPlayFirst'));
      return;
    }
    
    if (soundId === target.id) {
      setIsCorrect(true);
      speak(t('correct'));
      
      saveGameSession({
        game_type: 'SoundIdentification',
        accuracy: Math.max(0, 100 - (errors * 10)),
        duration_seconds: Math.floor((Date.now() - sessionStartTime) / 1000),
        errors,
        level: 1,
        played_at: new Date().toISOString()
      });
    } else {
      setIsCorrect(false);
      setErrors(e => e + 1);
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

      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
        <h2 className="text-2xl font-bold text-primary-900 mb-8">{t('whatSoundIsThis')}</h2>

        {/* Play Button */}
        <button
          onClick={handlePlaySound}
          className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 mb-10 transition-all shadow-xl active:scale-95 border-8 ${
            isPlaying 
              ? 'bg-secondary-500 text-white border-secondary-300 animate-[pulse_1s_ease-in-out_infinite]' 
              : 'bg-primary-100 text-primary-600 border-white hover:bg-primary-200'
          }`}
        >
          <Volume2 size={48} strokeWidth={2.5} />
          <span className="font-bold">{isPlaying ? t('soundPlaying') : t('playSound')}</span>
        </button>

        {/* Options */}
        <div className="w-full grid grid-cols-2 gap-4">
          {options.map((opt, idx) => {
            const Icon = opt.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt.id)}
                className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-3 transition-all shadow-md active:scale-95 border-4 ${
                  isCorrect && opt.id === target.id
                    ? 'bg-success-100 border-success-400 ring-4 ring-success-200'
                    : isCorrect === false && opt.id !== target.id
                    ? 'bg-primary-100 border-primary-200 opacity-50'
                    : 'bg-white border-primary-100 hover:bg-primary-50 hover:shadow-lg'
                }`}
              >
                <Icon size={40} className="text-primary-600" strokeWidth={2} />
                <span className="font-bold text-primary-900 text-center px-2">{opt.label}</span>
              </button>
            );
          })}
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
              Next Sound
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
