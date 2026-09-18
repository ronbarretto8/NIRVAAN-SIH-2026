import { useEffect, useState } from 'react';
import { Phone, Users, UserRound } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { loadJSON, STORAGE_KEYS } from '@/lib/storage';
import type { FamilyMember } from '@/types';

export function FamilyScreen() {
  const { t } = useLanguage();
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    const loaded = loadJSON<FamilyMember[]>(STORAGE_KEYS.familyMembers, []);
    setMembers(loaded);
  }, []);

  return (
    <div className="animate-fade-in px-5 pb-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4 pt-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary-400 shadow-card">
          <Users size={32} className="text-primary-900" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-semibold text-primary-900">{t('familyCallTitle')}</h1>
          <p className="text-lg text-primary-700">{t('familyCallDesc')}</p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-primary-200 bg-cream-50 p-6 text-center">
          <UserRound size={48} className="mx-auto mb-3 text-primary-300" strokeWidth={2} />
          <p className="text-lg font-semibold text-primary-600">{t('noFamilyMembers')}</p>
          <p className="mt-1 text-base text-primary-400">{t('noFamilyMembersDesc')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {members.map((member) => (
            <a
              key={member.id}
              href={`tel:${member.phone}`}
              className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-all active:scale-95 hover:shadow-card-lg"
            >
              <div className="relative h-48 w-full bg-primary-100">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary-200 text-primary-400">
                    <UserRound size={80} strokeWidth={1.5} />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                  <span className="inline-block rounded-lg bg-secondary-400 px-3 py-1 text-sm font-bold text-primary-900 shadow-sm">
                    {member.relationship}
                  </span>
                  <h2 className="mt-1 font-heading text-3xl font-bold text-white drop-shadow-md">
                    {member.full_name}
                  </h2>
                </div>
              </div>
              <div className="flex items-center justify-between bg-primary-700 p-4">
                <span className="text-lg font-semibold tracking-wide text-primary-100">
                  {member.phone}
                </span>
                <div className="flex items-center gap-2 rounded-xl bg-success-500 px-5 py-3 font-bold text-white shadow-md">
                  <Phone size={22} strokeWidth={2.5} />
                  <span className="text-lg">{t('callNow')}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
