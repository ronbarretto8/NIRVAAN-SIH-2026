import { useState } from 'react';
import { User, ShieldCheck, Heart, KeyRound, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useMode } from '@/lib/ModeContext';


interface LoginScreenProps {
  onLoginSuccess: (role: 'patient' | 'caregiver') => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { login, enterCaregiverMode } = useMode();


  const [activeTab, setActiveTab] = useState<'patient' | 'caregiver'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [caregiverPin, setCaregiverPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePatientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login('patient', email || 'senior.patient@nirvaan.org');
    onLoginSuccess('patient');
  };

  const handleCaregiverLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (caregiverPin) {
      const ok = enterCaregiverMode(caregiverPin);
      if (ok) {
        login('caregiver', email || 'caregiver@nirvaan.org');
        onLoginSuccess('caregiver');
      } else {
        setErrorMsg('Invalid Caregiver PIN. Default PIN is 1234.');
      }
    } else {
      login('caregiver', email || 'caregiver@nirvaan.org');
      onLoginSuccess('caregiver');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 md:py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl"></div>
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl mb-3 backdrop-blur-sm border border-white/20">
            <Heart className="w-10 h-10 text-teal-200 fill-teal-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">NIRVAAN</h1>
          <p className="text-teal-100 text-sm mt-1 font-medium">Cognitive Support & Daily Care Companion</p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-100/70 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('patient'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'patient'
                ? 'bg-white text-teal-800 shadow-md border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-5 h-5 text-teal-600" />
            Patient Portal
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('caregiver'); setErrorMsg(''); }}
            className={`flex-1 py-3 px-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'caregiver'
                ? 'bg-white text-indigo-900 shadow-md border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Caregiver Mode
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 md:p-8">
          {activeTab === 'patient' ? (
            <form onSubmit={handlePatientLogin} className="space-y-5">
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-teal-900 text-sm leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span>
                  Welcome to <strong>Senior Patient Mode</strong>. Clean, friendly interface with memory games and daily reminders.
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Email / ID</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@sahayata.org"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Passcode (Optional)</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-base"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-lg shadow-teal-700/20 flex items-center justify-center gap-3 transition-all min-h-[56px]"
              >
                <span>Enter Patient Portal</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCaregiverLogin} className="space-y-5">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 text-indigo-900 text-sm leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Caregiver Management Mode</strong> grants full access to patient details, analytics scorecards, and reminder editing.
                </span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Caregiver Email</label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="caregiver@sahayata.org"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">4-Digit Security PIN</label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                  <input
                    type="password"
                    maxLength={4}
                    value={caregiverPin}
                    onChange={(e) => setCaregiverPin(e.target.value)}
                    placeholder="1234 (Default: 1234)"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base tracking-widest"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Default PIN is 1234 if not customized.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 bg-indigo-800 hover:bg-indigo-900 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-3 transition-all min-h-[56px]"
              >
                <span>Access Caregiver Mode</span>
                <ShieldCheck className="w-6 h-6" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
