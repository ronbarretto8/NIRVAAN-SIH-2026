import { useState, useEffect } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useMode } from '@/lib/ModeContext';

interface PinModalProps {
  onClose: () => void;
  mode: 'enter' | 'exit';
}

export function PinModal({ onClose, mode }: PinModalProps) {
  const { t } = useLanguage();
  const { enterCaregiverMode, exitCaregiverMode } = useMode();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      handleSubmit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleSubmit = (value: string) => {
    if (mode === 'enter') {
      const ok = enterCaregiverMode(value);
      if (ok) {
        onClose();
      } else {
        setError(t('wrongPin'));
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin('');
          setError('');
        }, 700);
      }
    } else {
      exitCaregiverMode();
      onClose();
    }
  };

  const append = (digit: string) => {
    if (pin.length < 4) setPin((p) => p + digit);
  };

  const deleteLast = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  if (mode === 'exit') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-xs rounded-3xl bg-white p-8 shadow-2xl text-center">
          <div className="mb-6 flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-warning-100">
            <Lock size={40} className="text-warning-600" strokeWidth={2.5} />
          </div>
          <h2 className="font-heading text-2xl font-bold text-primary-900 mb-2">{t('exitCaregiverMode')}</h2>
          <p className="text-base text-primary-600 mb-8">Switching to Senior / Elderly Mode</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { exitCaregiverMode(); onClose(); }}
              className="w-full rounded-2xl bg-warning-600 py-4 text-lg font-bold text-white active:scale-95 transition-all"
            >
              {t('exitCaregiverMode')}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-primary-100 py-4 text-lg font-bold text-primary-700 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100">
              <Lock size={26} className="text-accent-700" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-900">{t('enterPin')}</h2>
              <p className="text-sm text-primary-500">Default: 1234</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 active:scale-90 transition-all"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* PIN dots */}
        <div className={`mb-4 flex justify-center gap-4 ${shake ? 'animate-[shake_0.6s_ease-in-out]' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'border-accent-600 bg-accent-600 scale-110'
                  : 'border-primary-300 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 text-center text-base font-semibold text-error-600">{error}</p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {DIGITS.map((digit, idx) => {
            if (digit === '') return <div key={idx} />;
            if (digit === '⌫') {
              return (
                <button
                  key={idx}
                  onClick={deleteLast}
                  className="flex h-16 w-full items-center justify-center rounded-2xl bg-primary-100 text-primary-700 active:scale-90 transition-all"
                  aria-label="Delete"
                >
                  <Delete size={26} strokeWidth={2.5} />
                </button>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => append(digit)}
                className="flex h-16 w-full items-center justify-center rounded-2xl bg-primary-700 text-2xl font-bold text-white shadow-card active:scale-90 transition-all hover:bg-primary-600"
              >
                {digit}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
