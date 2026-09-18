import { useEffect, useState, useCallback, useRef } from 'react';
import { Calendar, Check, Clock, Droplets, Heart, Pill, Volume2, Activity, Utensils, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import { useMode } from '@/lib/ModeContext';
import { REMINDER_SPOKEN_KEY, REMINDER_DISPLAY_KEY } from '@/lib/translations';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import type { Reminder, ReminderType } from '@/types';

const ICONS: Record<ReminderType, typeof Pill> = {
  medicine: Pill,
  water: Droplets,
  doctor: Calendar,
  walk: Activity,
  meal: Utensils,
  custom: Heart,
};

const COLORS: Record<ReminderType, { bg: string; text: string; accent: string }> = {
  medicine: { bg: 'bg-secondary-100', text: 'text-secondary-800', accent: 'bg-secondary-500' },
  water: { bg: 'bg-primary-100', text: 'text-primary-800', accent: 'bg-primary-500' },
  doctor: { bg: 'bg-accent-100', text: 'text-accent-800', accent: 'bg-accent-500' },
  walk: { bg: 'bg-green-100', text: 'text-green-800', accent: 'bg-green-500' },
  meal: { bg: 'bg-orange-100', text: 'text-orange-800', accent: 'bg-orange-500' },
  custom: { bg: 'bg-purple-100', text: 'text-purple-800', accent: 'bg-purple-500' },
};

// Each entry MUST have a unique title so the deduplication key (title::scheduled_time)
// and the REMINDER_DISPLAY_KEY lookup both work correctly.
const DEFAULT_REMINDERS: Omit<Reminder, 'id' | 'created_at' | 'completed_at'>[] = [
  { type: 'medicine', title: 'Take Morning Medicine',           completed: false, scheduled_time: '8:00 AM'  },
  { type: 'water',    title: 'Drink Morning Water',             completed: false, scheduled_time: '10:00 AM' },
  { type: 'medicine', title: 'Take Afternoon Medicine',         completed: false, scheduled_time: '1:00 PM'  },
  { type: 'water',    title: 'Drink Afternoon Water',           completed: false, scheduled_time: '3:00 PM'  },
  { type: 'doctor',   title: 'Doctor Appointment — Dr. Sharma', completed: false, scheduled_time: '4:30 PM'  },
  { type: 'water',    title: 'Drink Evening Water',             completed: false, scheduled_time: '6:00 PM'  },
  { type: 'medicine', title: 'Take Evening Medicine',           completed: false, scheduled_time: '8:00 PM'  },
];

/**
 * Deduplicate reminders by a CONTENT key: `title::scheduled_time`.
 *
 * We intentionally do NOT use `id` as the primary key here because:
 * - Each bad Supabase insert (e.g. from a previous StrictMode race) creates
 *   rows with unique UUIDs but identical title+time content.
 * - Keying on id would pass all duplicated DB rows through unchanged.
 *
 * Using title::scheduled_time guarantees that even if the Supabase table
 * contains 14 rows from two bad inserts, only the 7 unique content items
 * are ever passed to React state or rendered.
 */
function dedupeByContent(items: Reminder[]): Reminder[] {
  const seen = new Map<string, Reminder>();
  for (const item of items) {
    const key = `${item.title}::${item.scheduled_time}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

export function RemindersScreen() {
  const { t, speak, speakKey, stopSpeaking } = useLanguage();
  const { isCaregiverMode } = useMode();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('8:00 AM');
  const [newType, setNewType] = useState<ReminderType>('medicine');
  const [reminders, setReminders] = useState<Reminder[]>(() =>
    dedupeByContent(loadJSON<Reminder[]>(STORAGE_KEYS.reminders, []))
  );
  const [loading, setLoading] = useState(true);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Prevents React StrictMode's double-invocation from racing two concurrent
  // Supabase inserts before either has had a chance to write to localStorage.
  const seedingRef = useRef(false);

  useEffect(() => {
    const loaded = loadJSON<Reminder[]>(STORAGE_KEYS.reminders, []);
    if (loaded.length > 0) setLoading(false);
  }, []);

  const persistReminders = useCallback((data: Reminder[]) => {
    saveJSON(STORAGE_KEYS.reminders, data);
  }, []);

  const fetchReminders = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .gte('created_at', today)
      .order('scheduled_time', { ascending: true });

    if (!error && data && data.length > 0) {
      // Supabase has rows for today — dedupe and use as source of truth
      const unique = dedupeByContent(data);
      setReminders(unique);
      persistReminders(unique);
    } else {
      // No rows from Supabase — check localStorage before seeding
      const local = dedupeByContent(loadJSON<Reminder[]>(STORAGE_KEYS.reminders, []));
      if (local.length > 0) {
        // Local data exists; restore without touching Supabase
        setReminders(local);
      } else if (!seedingRef.current) {
        // Truly first run AND no concurrent seed in flight (StrictMode guard)
        seedingRef.current = true;
        const { data: seeded } = await supabase
          .from('reminders')
          .insert(DEFAULT_REMINDERS.map((r) => ({ ...r })))
          .select('*');
        if (seeded) {
          const unique = dedupeByContent(seeded);
          setReminders(unique);
          persistReminders(unique);
        }
        // Leave seedingRef.current = true so the second StrictMode run is skipped
      }
    }
    setLoading(false);
  }, [persistReminders]);

  useEffect(() => {
    fetchReminders();
    return () => stopSpeaking();
  }, [fetchReminders, stopSpeaking]);

  const handleListen = (e: React.MouseEvent, reminder: Reminder) => {
    e.stopPropagation();
    if (speakingId === reminder.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(reminder.id);
      const spokenKey = REMINDER_SPOKEN_KEY[reminder.title];
      if (spokenKey) {
        speakKey(spokenKey);
      } else {
        speak(`${reminder.title}. ${reminder.scheduled_time}`);
      }
      setTimeout(() => setSpeakingId(null), 3000);
    }
  };

  const toggleReminder = async (reminder: Reminder) => {
    const newCompleted = !reminder.completed;
    const optimistic = reminders.map((r) =>
      r.id === reminder.id
        ? { ...r, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : r
    );
    setReminders(optimistic);
    persistReminders(optimistic);

    if (newCompleted) {
      setCelebratingId(reminder.id);
      setTimeout(() => setCelebratingId(null), 600);
    }

    await supabase
      .from('reminders')
      .update({ completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq('id', reminder.id);
  };

  const completedCount = reminders.filter((r) => r.completed).length;
  const totalCount = reminders.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="animate-fade-in px-5 pb-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4 pt-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary-400 shadow-card">
          <Heart size={32} className="text-primary-900" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-heading text-3xl font-semibold text-primary-900">{t('dailyReminders')}</h1>
          <p className="text-lg text-primary-700">{t('appName')}</p>
        </div>
      </div>

      {/* Progress summary */}
      <div className="mb-6 rounded-2xl bg-primary-700 p-5 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-white">{t('todaysProgress')}</span>
          <span className="text-lg font-bold text-secondary-300">{progress}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-primary-800">
          <div
            className="h-full rounded-full bg-secondary-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-base text-primary-200">
          {completedCount} {t('of')} {totalCount} {t('tasksDone')}
        </p>
      </div>

      {/* Reminders list */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-lg text-primary-600">{t('loadingReminders')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((reminder, idx) => {
            const Icon = ICONS[reminder.type];
            const colors = COLORS[reminder.type];
            const isCelebrating = celebratingId === reminder.id;
            const isSpeaking = speakingId === reminder.id;
            return (
              <div
                key={reminder.id}
                className={`group flex items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200 animate-slide-up ${
                  reminder.completed
                    ? 'border-success-300 bg-success-50 shadow-card-pressed'
                    : `${colors.bg} border-transparent shadow-card`
                } ${isCelebrating ? 'animate-celebrate' : ''}`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Tap area to toggle completion */}
                <button
                  onClick={() => toggleReminder(reminder)}
                  className="flex flex-1 items-center gap-3 text-left active:scale-[0.98]"
                  aria-label={reminder.title}
                >
                  {/* Icon circle */}
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${colors.accent} ${
                      reminder.completed ? 'bg-success-500' : ''
                    }`}
                  >
                    <Icon size={32} className="text-white" strokeWidth={2.5} />
                  </div>

                  {/* Text */}
                  <div className="flex flex-1 flex-col gap-1">
                    <span
                      className={`text-xl font-bold leading-tight ${
                        reminder.completed ? 'text-success-700 line-through' : colors.text
                      }`}
                    >
                      {REMINDER_DISPLAY_KEY[reminder.title]
                        ? t(REMINDER_DISPLAY_KEY[reminder.title])
                        : reminder.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={18} className={reminder.completed ? 'text-success-500' : 'text-primary-500'} />
                      <span className={`text-base font-medium ${reminder.completed ? 'text-success-500' : 'text-primary-600'}`}>
                        {reminder.scheduled_time}
                      </span>
                    </div>
                  </div>

                  {/* Check circle */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      reminder.completed
                        ? 'border-success-500 bg-success-500 text-white'
                        : 'border-primary-300 bg-white text-transparent'
                    }`}
                  >
                    <Check size={24} strokeWidth={3} />
                  </div>
                </button>

                {/* Listen button */}
                <button
                  onClick={(e) => handleListen(e, reminder)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90 ${
                    isSpeaking
                      ? 'bg-primary-600 text-white shadow-card-lg animate-pop'
                      : 'bg-white text-primary-700 shadow-card hover:shadow-card-lg'
                  }`}
                  aria-label={t('listen')}
                  title={t('listen')}
                >
                  <Volume2 size={22} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Encouragement footer */}
      {progress === 100 && (
        <div className="mt-6 rounded-2xl bg-success-100 p-5 text-center shadow-card animate-pop">
          <p className="text-xl font-bold text-success-800">{t('allDone')}</p>
          <p className="mt-1 text-base text-success-600">{t('allDoneSub')}</p>
        </div>
      )}

      {/* Caregiver: Add Reminder */}
      {isCaregiverMode && (
        <div className="mt-6 rounded-2xl bg-white border border-primary-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary-900 text-lg">Manage Reminders</h3>
            <button
              onClick={() => {
                setEditingId(null);
                setNewTitle('');
                setNewTime('8:00 AM');
                setNewType('medicine');
                setShowAddForm((v) => !v);
              }}
              className="flex items-center gap-2 rounded-xl bg-accent-100 px-4 py-2 font-bold text-accent-700 active:scale-95"
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {showAddForm && (
            <div className="space-y-3 mb-5 p-4 bg-primary-50 rounded-2xl border border-primary-100">
              <div>
                <label className="block text-sm font-bold text-primary-700 mb-1">Reminder Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Take Blood Pressure Tablet"
                  className="w-full rounded-xl border border-primary-200 bg-white p-3 text-base font-semibold text-primary-900 focus:ring-2 focus:ring-accent-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-primary-700 mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ReminderType)}
                    className="w-full rounded-xl border border-primary-200 bg-white p-3 text-base font-semibold text-primary-900 focus:ring-2 focus:ring-accent-500 focus:outline-none"
                  >
                    <option value="medicine">💊 Medicine</option>
                    <option value="water">💧 Water</option>
                    <option value="doctor">🗓 Doctor</option>
                    <option value="walk">🚶 Walk</option>
                    <option value="meal">🍽 Meal</option>
                    <option value="custom">⭐ Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="e.g. 9:00 AM"
                    className="w-full rounded-xl border border-primary-200 bg-white p-3 text-base font-semibold text-primary-900 focus:ring-2 focus:ring-accent-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newTitle.trim()) return;
                  
                  let updated = [];
                  if (editingId) {
                    updated = reminders.map((r) => r.id === editingId ? {
                      ...r,
                      title: newTitle.trim(),
                      time: newTime,
                      scheduled_time: newTime,
                      type: newType,
                    } : r);
                  } else {
                    const newReminder: Reminder = {
                      id: Date.now().toString(),
                      type: newType,
                      title: newTitle.trim(),
                      completed: false,
                      scheduled_time: newTime,
                      created_at: new Date().toISOString(),
                      completed_at: null,
                    };
                    updated = [...reminders, newReminder];
                  }
                  
                  setReminders(updated);
                  saveJSON(STORAGE_KEYS.reminders, updated);
                  setNewTitle('');
                  setNewTime('8:00 AM');
                  setEditingId(null);
                  setShowAddForm(false);
                }}
                className="w-full rounded-xl bg-accent-600 py-3 font-bold text-white shadow-md active:scale-95 transition-all"
              >
                {editingId ? 'Update Reminder' : 'Save Reminder'}
              </button>
            </div>
          )}

          {/* Delete existing reminders */}
          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-primary-50 border border-primary-100 p-3">
                <div>
                  <p className="font-bold text-primary-900 text-sm">{r.title}</p>
                  <p className="text-xs text-primary-500">{r.scheduled_time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(r.id);
                      setNewTitle(r.title);
                      setNewTime(r.scheduled_time);
                      setNewType(r.type);
                      setShowAddForm(true);
                    }}
                    className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 active:scale-95"
                    aria-label="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const updated = reminders.filter((x) => x.id !== r.id);
                      setReminders(updated);
                      saveJSON(STORAGE_KEYS.reminders, updated);
                    }}
                    className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 active:scale-95"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
