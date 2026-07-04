export type Frequency = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // hex
  frequency: Frequency;
  targetDaysPerWeek?: number; // used when frequency === 'custom'
  createdAt: string; // ISO date
  archived: boolean;
  // completions map: 'YYYY-MM-DD' -> true
  completions: Record<string, boolean>;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate30d: number; // 0-100
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
  meta?: string; // stringified extra context (stack trace, etc.)
}
