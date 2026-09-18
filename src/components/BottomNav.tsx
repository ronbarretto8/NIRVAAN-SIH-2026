import { useLanguage } from '@/lib/LanguageContext';
import { useMode } from '@/lib/ModeContext';
import { Bell, Gamepad2, Heart, Users } from 'lucide-react';
import type { Screen } from '@/types';

interface BottomNavProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const CAREGIVER_NAV_ICONS: { key: Screen; labelKey: string; icon: typeof Bell }[] = [
  { key: 'reminders', labelKey: 'reminders', icon: Bell },
  { key: 'games', labelKey: 'games', icon: Gamepad2 },
  { key: 'family', labelKey: 'family', icon: Users },
  { key: 'caregiver', labelKey: 'caregiver', icon: Heart },
];

const ELDERLY_NAV_ICONS: { key: Screen; labelKey: string; icon: typeof Bell }[] = [
  { key: 'reminders', labelKey: 'reminders', icon: Bell },
  { key: 'games', labelKey: 'games', icon: Gamepad2 },
  { key: 'family', labelKey: 'family', icon: Users },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const { t } = useLanguage();
  const { isCaregiverMode } = useMode();

  const navIcons = isCaregiverMode ? CAREGIVER_NAV_ICONS : ELDERLY_NAV_ICONS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-primary-700 shadow-[0_-4px_20px_rgba(60,70,30,0.15)] safe-bottom md:sticky md:top-0 md:w-72 md:h-screen md:rounded-r-3xl md:flex md:flex-col md:justify-center md:shadow-2xl">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 md:max-w-none md:flex-col md:gap-4 md:px-6">
        {navIcons.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors duration-200 md:flex-row md:justify-start md:gap-4 md:py-4 md:px-6 md:rounded-2xl ${
                isActive ? 'text-white md:bg-primary-800' : 'text-primary-200 hover:text-primary-100 md:hover:bg-primary-600'
              }`}
              aria-label={t(item.labelKey)}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 shrink-0 ${
                  isActive
                    ? 'bg-secondary-400 text-primary-900 shadow-md scale-105'
                    : 'bg-transparent'
                }`}
              >
                <Icon size={28} strokeWidth={2.5} />
              </div>
              <span className={`text-sm font-semibold md:text-lg ${isActive ? 'md:text-white' : ''}`}>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
