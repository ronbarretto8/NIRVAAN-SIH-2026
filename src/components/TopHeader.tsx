import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useMode } from '@/lib/ModeContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { OnlineStatus } from '@/components/OnlineStatus';
import { PinModal } from '@/components/PinModal';
import { Settings, Shield, User } from 'lucide-react';

export function TopHeader() {
  const { t } = useLanguage();
  const { isCaregiverMode } = useMode();
  const [pinModal, setPinModal] = useState<'enter' | 'exit' | null>(null);

  const handleModeToggle = () => {
    if (isCaregiverMode) {
      setPinModal('exit');
    } else {
      setPinModal('enter');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream-100/95 backdrop-blur-sm border-b border-primary-100">
        <div className="mx-auto flex max-w-5xl w-full items-center justify-between px-4 py-3 md:px-8">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-heading text-xl font-bold tracking-tight text-primary-900 leading-none">
              {t('appName')}
            </h1>
            <span className="text-[10px] font-semibold tracking-wider text-primary-500 uppercase">
              {t('appTagline')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <OnlineStatus />
            <LanguageSelector />
            
            <button
              onClick={handleModeToggle}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm transition-all active:scale-95 ${
                isCaregiverMode
                  ? 'bg-warning-100 text-warning-700 ring-1 ring-warning-300 hover:bg-warning-200'
                  : 'bg-success-100 text-success-700 ring-1 ring-success-300 hover:bg-success-200'
              }`}
            >
              {isCaregiverMode ? (
                <>
                  <Shield size={16} strokeWidth={2.5} />
                  <span>Caregiver</span>
                </>
              ) : (
                <>
                  <User size={16} strokeWidth={2.5} />
                  <span>Senior</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      
      {pinModal && (
        <PinModal mode={pinModal} onClose={() => setPinModal(null)} />
      )}
    </>
  );
}
