import { useState, useEffect, useMemo } from 'react';
import {
  Activity, Settings, ShieldAlert, Download, Brain, Clock, Users, Database, HeartPulse, UserRound
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { useLanguage } from '@/lib/LanguageContext';
import { useMode } from '@/lib/ModeContext';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import { getGameSessions, getPendingSyncCount, flushPendingToSupabase } from '@/lib/indexedDB';
import type { PatientProfile, FamilyMember, GameSessionResult, SupportSignal } from '@/types';
import jsPDF from 'jspdf';

type CaregiverTab = 'dashboard' | 'patient' | 'family' | 'settings';

export function CaregiverScreen() {
  const { t } = useLanguage();
  const { changePin, exitCaregiverMode } = useMode();
  const [activeTab, setActiveTab] = useState<CaregiverTab>('dashboard');

  const [patient, setPatient] = useState<PatientProfile>(() =>
    loadJSON<PatientProfile>(STORAGE_KEYS.patientProfile, {
      full_name: '', age_group: '60-70', primary_language: 'en', secondary_contacts: '',
      emergency_contacts: '', doctor_name: '', doctor_phone: '', caregiver_name: ''
    })
  );

  const [family, setFamily] = useState<FamilyMember[]>(() =>
    loadJSON<FamilyMember[]>(STORAGE_KEYS.familyMembers, [])
  );

  const [highContrast, setHighContrast] = useState<boolean>(() =>
    loadJSON<boolean>(STORAGE_KEYS.highContrast, false)
  );

  const [pinState, setPinState] = useState({ old: '', new1: '', new2: '', msg: '' });

  const [games, setGames] = useState<GameSessionResult[]>([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    getGameSessions(100).then(setGames);
    getPendingSyncCount().then(setPendingSync);
  }, []);

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    saveJSON(STORAGE_KEYS.patientProfile, patient);
    alert(t('profileSaved'));
  };

  const handleAddFamily = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      full_name: '',
      relationship: '',
      phone: '',
      photo_url: '',
      created_at: new Date().toISOString()
    };
    const updated = [...family, newMember];
    setFamily(updated);
    saveJSON(STORAGE_KEYS.familyMembers, updated);
  };

  const updateFamily = (id: string, updates: Partial<FamilyMember>) => {
    const updated = family.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setFamily(updated);
    saveJSON(STORAGE_KEYS.familyMembers, updated);
  };

  const removeFamily = (id: string) => {
    const updated = family.filter((m) => m.id !== id);
    setFamily(updated);
    saveJSON(STORAGE_KEYS.familyMembers, updated);
  };

  const handlePhotoUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      updateFamily(id, { photo_url: url });
    };
    reader.readAsDataURL(file);
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinState.new1 !== pinState.new2) {
      setPinState((p) => ({ ...p, msg: 'New PINs do not match' }));
      return;
    }
    if (pinState.new1.length !== 4) {
      setPinState((p) => ({ ...p, msg: 'PIN must be 4 digits' }));
      return;
    }
    const success = changePin(pinState.old, pinState.new1);
    if (success) {
      setPinState({ old: '', new1: '', new2: '', msg: 'PIN updated successfully!' });
    } else {
      setPinState((p) => ({ ...p, msg: 'Incorrect Old PIN' }));
    }
  };

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    saveJSON(STORAGE_KEYS.highContrast, next);
    if (next) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  const forceSync = async () => {
    setIsSyncing(true);
    await flushPendingToSupabase();
    const remain = await getPendingSyncCount();
    setPendingSync(remain);
    setIsSyncing(false);
    if (remain === 0) alert(t('syncSuccess'));
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(t('weeklyReport'), 20, 20);
    doc.setFontSize(12);
    doc.text(`Patient: ${patient.full_name || 'N/A'}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Total Games Played: ${games.length}`, 20, 50);
    doc.text(t('nonMedicalDisclaimer'), 20, 280);
    doc.save('NIRVAAN_Report.pdf');
  };

  // Analytics derivation
  const chartData = useMemo(() => {
    // Reverse games to chronological
    const chron = [...games].reverse();
    return chron.map((g, idx) => ({
      name: `Game ${idx + 1}`,
      accuracy: Math.round(g.accuracy || 0),
      duration: g.duration_seconds
    }));
  }, [games]);

  const supportSignals: SupportSignal[] = useMemo(() => {
    const signals: SupportSignal[] = [];
    if (games.length < 3) return signals;
    const recent = games.slice(0, 3);
    const lowAccuracyCount = recent.filter((g) => g.accuracy < 60).length;
    if (lowAccuracyCount >= 2) {
      signals.push({
        id: 'acc-drop',
        game_type: 'General',
        severity: 'attention',
        message: 'Observed a drop in game accuracy (<60%) over the last few sessions.',
        context_factors: ['Ensure patient is well-rested', 'Check if room lighting is adequate', 'Check if hearing/vision aids are used'],
        created_at: new Date().toISOString()
      });
    }
    return signals;
  }, [games]);

  return (
    <div className="min-h-screen bg-primary-50 pb-20">
      {/* Tabs */}
      <div className="sticky top-[64px] z-30 flex overflow-x-auto bg-white shadow-sm border-b border-primary-200 hide-scrollbar">
        {[
          { id: 'dashboard', icon: Activity, label: t('tabDashboard') },
          { id: 'patient', icon: UserRound, label: t('tabPatient') },
          { id: 'family', icon: Users, label: t('tabFamily') },
          { id: 'settings', icon: Settings, label: t('tabSettings') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CaregiverTab)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-4 text-sm font-bold transition-colors ${
              activeTab === tab.id
                ? 'border-b-4 border-accent-500 text-accent-700 bg-accent-50/50'
                : 'border-b-4 border-transparent text-primary-500 hover:bg-primary-50'
            }`}
          >
            <tab.icon size={18} strokeWidth={2.5} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-primary-900">{t('caregiverDashboard')}</h2>
              <button
                onClick={downloadPDF}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-200 text-primary-700 active:scale-95"
              >
                <Download size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Sync Card */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${pendingSync > 0 ? 'bg-warning-100 text-warning-600' : 'bg-success-100 text-success-600'}`}>
                  <Database size={24} />
                </div>
                <div>
                  <p className="font-bold text-primary-900">
                    {pendingSync > 0 ? `${pendingSync} ${t('pendingSync')}` : t('onlineSynced')}
                  </p>
                </div>
              </div>
              {pendingSync > 0 && (
                <button
                  onClick={forceSync}
                  disabled={isSyncing}
                  className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isSyncing ? t('syncing') : t('syncData')}
                </button>
              )}
            </div>

            {/* Support Signals */}
            <div className="rounded-2xl bg-white shadow-sm border border-primary-100 overflow-hidden">
              <div className="bg-warning-50 px-4 py-3 flex items-center gap-2 border-b border-warning-100">
                <HeartPulse size={20} className="text-warning-600" />
                <h3 className="font-bold text-warning-800">{t('supportSignals')}</h3>
              </div>
              <div className="p-4">
                {supportSignals.length === 0 ? (
                  <p className="text-primary-600 italic">{t('noSignals')}</p>
                ) : (
                  <div className="space-y-4">
                    {supportSignals.map(sig => (
                      <div key={sig.id} className="rounded-xl border border-warning-200 bg-warning-50/30 p-3">
                        <p className="font-bold text-warning-900 mb-2">{sig.message}</p>
                        <p className="text-xs font-semibold text-primary-500 mb-1 uppercase tracking-wider">{t('contextFactors')}</p>
                        <ul className="list-disc pl-4 text-sm text-primary-700 space-y-1">
                          {sig.context_factors.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs font-semibold text-primary-400 bg-primary-50 p-2 rounded-lg leading-relaxed">
                  <ShieldAlert size={14} className="inline mr-1 -mt-0.5" />
                  {t('nonMedicalDisclaimer')}
                </p>
              </div>
            </div>

            {/* Charts */}
            {games.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100">
                <h3 className="font-bold text-primary-900 mb-4">{t('accuracyTrend')}</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#0ea5e9"
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, fill: '#0284c7', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PATIENT TAB */}
        {activeTab === 'patient' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-heading text-2xl font-bold text-primary-900">{t('patientInfo')}</h2>
            <form onSubmit={handleSavePatient} className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-primary-100 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-primary-700">{t('fullName')}</label>
                  <input
                    type="text"
                    value={patient.full_name}
                    onChange={(e) => setPatient({ ...patient, full_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-semibold text-primary-900 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-primary-700">{t('ageGroup')}</label>
                    <select
                      value={patient.age_group}
                      onChange={(e) => setPatient({ ...patient, age_group: e.target.value as any })}
                      className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-semibold text-primary-900 focus:border-accent-500 focus:outline-none"
                    >
                      <option value="60-70">60-70</option>
                      <option value="71-80">71-80</option>
                      <option value="81+">81+</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-primary-700">{t('primaryLanguage')}</label>
                    <select
                      value={patient.primary_language}
                      onChange={(e) => setPatient({ ...patient, primary_language: e.target.value as any })}
                      className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-semibold text-primary-900 focus:border-accent-500 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="as">Assamese</option>
                      <option value="mn">Manipuri</option>
                      <option value="kh">Khasi</option>
                      <option value="mz">Mizo</option>
                      <option value="bo">Bodo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-primary-700">{t('doctorName')}</label>
                  <input
                    type="text"
                    value={patient.doctor_name}
                    onChange={(e) => setPatient({ ...patient, doctor_name: e.target.value })}
                    className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-semibold text-primary-900 focus:border-accent-500 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-accent-600 py-4 text-lg font-bold text-white shadow-md active:scale-95 transition-all"
              >
                {t('saveProfile')}
              </button>
            </form>
          </div>
        )}

        {/* FAMILY TAB */}
        {activeTab === 'family' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-primary-900">{t('familyDirectory')}</h2>
              <button
                onClick={handleAddFamily}
                className="rounded-xl bg-accent-100 px-4 py-2 font-bold text-accent-700 active:scale-95"
              >
                + {t('addFamilyMember')}
              </button>
            </div>
            
            <div className="space-y-4">
              {family.map((member) => (
                <div key={member.id} className="rounded-2xl bg-white p-5 shadow-sm border border-primary-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-primary-100 border-2 border-primary-200">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users className="absolute inset-0 m-auto text-primary-300" size={32} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(member.id, file);
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder={t('memberName')}
                        value={member.full_name}
                        onChange={(e) => updateFamily(member.id, { full_name: e.target.value })}
                        className="w-full rounded-lg border border-primary-200 bg-primary-50 p-2 font-bold text-primary-900 text-lg"
                      />
                      <input
                        type="text"
                        placeholder={t('relationship')}
                        value={member.relationship}
                        onChange={(e) => updateFamily(member.id, { relationship: e.target.value })}
                        className="w-full rounded-lg border border-primary-200 bg-primary-50 p-2 text-sm font-semibold text-primary-700"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      placeholder={t('phoneNumber')}
                      value={member.phone}
                      onChange={(e) => updateFamily(member.id, { phone: e.target.value })}
                      className="flex-1 rounded-lg border border-primary-200 bg-primary-50 p-2 font-mono font-semibold text-primary-900"
                    />
                    <button
                      onClick={() => removeFamily(member.id)}
                      className="rounded-lg bg-error-100 px-4 py-2 font-bold text-error-700 active:scale-95"
                    >
                      {t('deleteMember')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="font-heading text-2xl font-bold text-primary-900">{t('tabSettings')}</h2>
            
            {/* Accessibility Toggle */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-primary-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary-900 text-lg">{t('highContrast')}</h3>
                <p className="text-sm text-primary-500">Enable stark black/white/yellow UI</p>
              </div>
              <button
                onClick={toggleHighContrast}
                className={`relative h-8 w-14 rounded-full transition-colors ${highContrast ? 'bg-accent-500' : 'bg-primary-200'}`}
              >
                <div className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${highContrast ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* PIN Change */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-primary-100">
              <h3 className="font-bold text-primary-900 mb-4 text-lg">Change Caregiver PIN</h3>
              <form onSubmit={handleChangePin} className="space-y-4">
                <input
                  type="password"
                  placeholder="Old PIN"
                  value={pinState.old}
                  onChange={(e) => setPinState({ ...pinState, old: e.target.value })}
                  className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-mono font-bold tracking-widest text-primary-900"
                  maxLength={4}
                  pattern="\d{4}"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="password"
                    placeholder="New PIN"
                    value={pinState.new1}
                    onChange={(e) => setPinState({ ...pinState, new1: e.target.value })}
                    className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-mono font-bold tracking-widest text-primary-900"
                    maxLength={4}
                    pattern="\d{4}"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New PIN"
                    value={pinState.new2}
                    onChange={(e) => setPinState({ ...pinState, new2: e.target.value })}
                    className="w-full rounded-xl border-2 border-primary-200 bg-primary-50 p-3 font-mono font-bold tracking-widest text-primary-900"
                    maxLength={4}
                    pattern="\d{4}"
                  />
                </div>
                {pinState.msg && (
                  <p className={`font-semibold ${pinState.msg.includes('success') ? 'text-success-600' : 'text-error-600'}`}>
                    {pinState.msg}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary-700 py-3 font-bold text-white shadow-sm active:scale-95"
                >
                  Update PIN
                </button>
              </form>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
