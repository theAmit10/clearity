export type FrequencyType = 'daily' | 'every_n_days' | 'n_times_per_week' | 'n_times_per_month' | 'n_times_in_m_days';

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
  createdAt: string;
  archived: boolean;
  completions: Record<string, number>;
  missedNotes?: Record<string, string>;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate30d: number;
}

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  habits: Habit[];
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: string;
}
