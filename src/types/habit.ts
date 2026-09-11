import type { Goal } from './goal';

export type FrequencyType = 'daily' | 'n_times_per_week' | 'n_times_per_month' | 'n_times_in_m_days';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: FrequencyType;
  frequencyValue?: number;
  frequencyWindow?: number;
  goal?: string;
  category: string;
  createdAt: string;
  archived: boolean;
  completions: Record<string, number>;
  missedNotes?: Record<string, string>;
}

export interface HabitCategory {
  key: string;
  name: string;
  icon: string;
  isCustom: boolean;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate30d: number;
}

export interface ExportPayload {
  version: 1 | 2;
  exportedAt: string;
  habits: Habit[];
  goals?: Goal[];
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: string;
}
