export type ReminderType = 'medicine' | 'water' | 'doctor' | 'walk' | 'meal' | 'custom';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  completed: boolean;
  scheduled_time: string;
  created_at: string;
  completed_at: string | null;
  notes?: string;
}

export interface GameScore {
  id: string;
  game_type: string;
  score: number;
  moves: number;
  duration_seconds: number;
  played_at: string;
  difficulty_level: number;
  errors: number;
  accuracy?: number;
}

export interface CaregiverAlert {
  id: string;
  label: string;
  enabled: boolean;
  created_at: string;
}

export interface CognitiveState {
  id: string;
  level: number;
  adjustment_note: string;
  updated_at: string;
}

export interface PatientProfile {
  id?: string;
  full_name: string;
  age_group: '60-70' | '71-80' | '81+';
  primary_language: Language;
  secondary_contacts: string;
  emergency_contacts: string;
  doctor_name: string;
  doctor_phone: string;
  caregiver_name: string;
  updated_at?: string;
}

export interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  phone: string;
  photo_url: string;
  audio_url?: string;
  notes?: string;
  created_at: string;
}

export interface GameSessionResult {
  id: string;
  game_type: string;
  accuracy: number;
  duration_seconds: number;
  errors: number;
  level: number;
  played_at: string;
  synced: boolean;
}

export interface SupportSignal {
  id: string;
  game_type: string;
  message: string;
  context_factors: string[];
  severity: 'info' | 'attention';
  created_at: string;
}

export type Screen = 'home' | 'reminders' | 'games' | 'caregiver' | 'family' | 'login';

export type Language = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'kn' | 'bn' | 'gu' | 'as' | 'mn' | 'kh' | 'mz' | 'bo';

export type DifficultyLevel = 1 | 2 | 3;
