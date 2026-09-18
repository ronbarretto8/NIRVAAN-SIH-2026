import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Language } from '@/types';
import { TRANSLATIONS, SPEECH_FALLBACK } from '@/lib/translations';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  speak: (text: string) => void;
  speakKey: (key: string) => void;
  stopSpeaking: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => loadJSON<Language>(STORAGE_KEYS.lang, 'en'));

  const t = useCallback(
    (key: string) => {
      return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [lang]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const pickVoice = useCallback(
    (language: Language): SpeechSynthesisVoice | null => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      const fallbacks = SPEECH_FALLBACK[language];
      for (const langCode of fallbacks) {
        const match = voices.find(
          (v) => v.lang === langCode || v.lang.startsWith(langCode.split('-')[0])
        );
        if (match) return match;
      }
      return voices[0] || null;
    },
    []
  );

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(lang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = SPEECH_FALLBACK[lang][0];
      }
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [lang, pickVoice]
  );

  const speakKey = useCallback(
    (key: string) => {
      speak(TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key);
    },
    [lang, speak]
  );

  const handleSetLang = useCallback(
    (newLang: Language) => {
      stopSpeaking();
      setLang(newLang);
      saveJSON(STORAGE_KEYS.lang, newLang);
    },
    [stopSpeaking]
  );

  // Warm up voice list — some browsers load voices asynchronously
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t, speak, speakKey, stopSpeaking }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
