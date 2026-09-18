import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';

const DEFAULT_PIN = '1234';

interface ModeContextValue {
  isCaregiverMode: boolean;
  userRole: 'patient' | 'caregiver' | null;
  userEmail: string | null;
  login: (role: 'patient' | 'caregiver', email?: string) => void;
  logout: () => void;
  enterCaregiverMode: (pin: string) => boolean;
  exitCaregiverMode: () => void;
  changePin: (oldPin: string, newPin: string) => boolean;
  isDefaultPin: boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [isCaregiverMode, setIsCaregiverMode] = useState<boolean>(() =>
    loadJSON<boolean>(STORAGE_KEYS.isCaregiverMode, false)
  );

  const [userRole, setUserRole] = useState<'patient' | 'caregiver' | null>(() =>
    loadJSON<'patient' | 'caregiver' | null>('nirvaan_user_role', 'patient')
  );

  const [userEmail, setUserEmail] = useState<string | null>(() =>
    loadJSON<string | null>('nirvaan_user_email', 'family@sahayata.org')
  );

  const getStoredPin = useCallback((): string => {
    return loadJSON<string>(STORAGE_KEYS.caregiverPin, DEFAULT_PIN);
  }, []);

  const login = useCallback((role: 'patient' | 'caregiver', email: string = 'user@sahayata.org') => {
    setUserRole(role);
    setUserEmail(email);
    saveJSON('nirvaan_user_role', role);
    saveJSON('nirvaan_user_email', email);
    if (role === 'caregiver') {
      setIsCaregiverMode(true);
      saveJSON(STORAGE_KEYS.isCaregiverMode, true);
    } else {
      setIsCaregiverMode(false);
      saveJSON(STORAGE_KEYS.isCaregiverMode, false);
    }
  }, []);

  const logout = useCallback(() => {
    setUserRole(null);
    setUserEmail(null);
    setIsCaregiverMode(false);
    saveJSON('nirvaan_user_role', null);
    saveJSON('nirvaan_user_email', null);
    saveJSON(STORAGE_KEYS.isCaregiverMode, false);
  }, []);

  const enterCaregiverMode = useCallback(
    (pin: string): boolean => {
      const stored = getStoredPin();
      if (pin === stored) {
        setIsCaregiverMode(true);
        setUserRole('caregiver');
        saveJSON(STORAGE_KEYS.isCaregiverMode, true);
        saveJSON('nirvaan_user_role', 'caregiver');
        return true;
      }
      return false;
    },
    [getStoredPin]
  );

  const exitCaregiverMode = useCallback(() => {
    setIsCaregiverMode(false);
    setUserRole('patient');
    saveJSON(STORAGE_KEYS.isCaregiverMode, false);
    saveJSON('nirvaan_user_role', 'patient');
  }, []);

  const changePin = useCallback(
    (oldPin: string, newPin: string): boolean => {
      const stored = getStoredPin();
      if (oldPin === stored && newPin.length === 4 && /^\d{4}$/.test(newPin)) {
        saveJSON(STORAGE_KEYS.caregiverPin, newPin);
        return true;
      }
      return false;
    },
    [getStoredPin]
  );

  const isDefaultPin = getStoredPin() === DEFAULT_PIN;

  return (
    <ModeContext.Provider
      value={{
        isCaregiverMode,
        userRole,
        userEmail,
        login,
        logout,
        enterCaregiverMode,
        exitCaregiverMode,
        changePin,
        isDefaultPin,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
