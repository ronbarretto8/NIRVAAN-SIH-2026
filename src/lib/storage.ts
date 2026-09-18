export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function removeJSON(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  lang: 'nirvaan_lang',
  reminders: 'nirvaan_reminders',
  bestScore: 'nirvaan_best_score',
  difficulty: 'nirvaan_difficulty',
  lastSynced: 'nirvaan_last_synced',
  caregiverPin: 'nirvaan_caregiver_pin',
  patientProfile: 'nirvaan_patient_profile',
  familyMembers: 'nirvaan_family_members',
  highContrast: 'nirvaan_high_contrast',
  isCaregiverMode: 'nirvaan_caregiver_mode',
} as const;
