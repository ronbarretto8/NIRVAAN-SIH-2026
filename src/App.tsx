import { useState, useEffect } from 'react';
import { LanguageProvider } from '@/lib/LanguageContext';
import { ModeProvider, useMode } from '@/lib/ModeContext';
import { BottomNav } from '@/components/BottomNav';
import { TopHeader } from '@/components/TopHeader';
import { RemindersScreen } from '@/screens/RemindersScreen';
import { GamesScreen } from '@/screens/GamesScreen';
import { CaregiverScreen } from '@/screens/CaregiverScreen';
import { FamilyScreen } from '@/screens/FamilyScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { setupSyncListener } from '@/lib/indexedDB';
import type { Screen } from '@/types';
import { loadJSON, STORAGE_KEYS } from '@/lib/storage';

function AppContent() {
  const { isCaregiverMode, userRole } = useMode();
  const [activeScreen, setActiveScreen] = useState<Screen>('reminders');
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // If in patient mode and caregiver screen is active, redirect to reminders
  useEffect(() => {
    if (!isCaregiverMode && activeScreen === 'caregiver') {
      setActiveScreen('reminders');
    }
  }, [isCaregiverMode, activeScreen]);

  // Setup auto-sync
  useEffect(() => {
    const cleanup = setupSyncListener((count) => {
      console.log(`Auto-synced ${count} pending sessions`);
    });
    return cleanup;
  }, []);

  // Apply high-contrast preference on load
  useEffect(() => {
    const highContrast = loadJSON(STORAGE_KEYS.highContrast, false);
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, []);

  const handleNavigate = (screen: Screen) => {
    setActiveScreen(screen);
    setActiveGame(null);
  };

  // Show Login screen if user has not selected a role yet
  if (userRole === null) {
    return (
      <LoginScreen
        onLoginSuccess={(role) => {
          setActiveScreen(role === 'caregiver' ? 'caregiver' : 'reminders');
        }}
      />
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl bg-cream-100 transition-colors duration-300 md:flex md:flex-row-reverse shadow-xl">
      <div className="flex-1 flex flex-col md:min-h-screen md:pb-0 w-full overflow-x-hidden">
        <TopHeader />
        <main className="pb-24 md:pb-8 md:pt-8 flex-1 px-2 md:px-8 w-full mx-auto max-w-5xl">
          {activeScreen === 'reminders' && <RemindersScreen />}
          {activeScreen === 'games' && (
            <GamesScreen playingGame={activeGame} onStartGame={setActiveGame} />
          )}
          {activeScreen === 'family' && <FamilyScreen />}
          {activeScreen === 'caregiver' && isCaregiverMode && <CaregiverScreen />}
        </main>
      </div>
      <BottomNav active={activeScreen} onNavigate={handleNavigate} />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ModeProvider>
        <AppContent />
      </ModeProvider>
    </LanguageProvider>
  );
}

export default App;
