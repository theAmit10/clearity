import { create } from 'zustand';
import { Habit, HabitStats } from '../types/habit';
import { loadHabits, saveHabits, loadReviewState, saveReviewState } from '../services/storage';
import { logEvent } from '../services/logger';
import { addDays, toDateKey, todayKey } from '../services/dateUtils';

interface HabitState {
  habits: Habit[];
  loaded: boolean;
  reviewPromptShown: boolean;
  init: () => Promise<void>;
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'completions'>) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (id: string, dateKey?: string) => Promise<void>;
  replaceAllHabits: (habits: Habit[]) => Promise<void>;
  mergeHabits: (incoming: Habit[]) => Promise<void>;
  markReviewPromptShown: () => Promise<void>;
  reorderHabits: (reordered: Habit[]) => Promise<void>;
}

function persist(habits: Habit[]) {
  saveHabits(habits).catch(err => logEvent('error', 'Failed to persist habits', err));
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loaded: false,
  reviewPromptShown: false,

  init: async () => {
    try {
      const [stored, reviewShown] = await Promise.all([
        loadHabits<Habit[]>(),
        loadReviewState(),
      ]);
      set({ habits: stored ?? [], loaded: true, reviewPromptShown: reviewShown });
      logEvent('info', 'Store initialized', { count: stored?.length ?? 0 });
    } catch (err) {
      logEvent('error', 'Failed to load habits', err);
      set({ habits: [], loaded: true });
    }
  },

  addHabit: async data => {
    const habit: Habit = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      archived: false,
      completions: {},
    };
    const habits = [...get().habits, habit];
    set({ habits });
    persist(habits);
    logEvent('info', 'Habit added', { id: habit.id, name: habit.name });
  },

  updateHabit: async (id, patch) => {
    const habits = get().habits.map(h => (h.id === id ? { ...h, ...patch } : h));
    set({ habits });
    persist(habits);
  },

  deleteHabit: async id => {
    const habits = get().habits.filter(h => h.id !== id);
    set({ habits });
    persist(habits);
    logEvent('info', 'Habit deleted', { id });
  },

  toggleCompletion: async (id, dateKey) => {
    const key = dateKey ?? todayKey();
    const habits = get().habits.map(h => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      if (completions[key]) {
        delete completions[key];
      } else {
        completions[key] = true;
      }
      return { ...h, completions };
    });
    set({ habits });
    persist(habits);
  },

  replaceAllHabits: async habits => {
    set({ habits });
    persist(habits);
    logEvent('info', 'Habits replaced via import', { count: habits.length });
  },

  mergeHabits: async incoming => {
    const existing = get().habits;
    const byId = new Map(existing.map(h => [h.id, h]));
    for (const h of incoming) {
      const current = byId.get(h.id);
      if (!current) {
        byId.set(h.id, h);
      } else {
        // merge completions, incoming wins on conflicting fields except completions union
        byId.set(h.id, {
          ...current,
          ...h,
          completions: { ...current.completions, ...h.completions },
        });
      }
    }
    const habits = Array.from(byId.values());
    set({ habits });
    persist(habits);
    logEvent('info', 'Habits merged via import', { count: habits.length });
  },

  markReviewPromptShown: async () => {
    set({ reviewPromptShown: true });
    await saveReviewState(true);
    logEvent('info', 'Review prompt marked as shown');
  },

  reorderHabits: async (reordered: Habit[]) => {
    set({ habits: reordered });
    persist(reordered);
    logEvent('info', 'Habits reordered');
  },
}));

// Pure function so it's easily unit-testable / reusable in UI.
export function computeStats(habit: Habit): HabitStats {
  const dates = Object.keys(habit.completions).filter(k => habit.completions[k]);
  const totalCompletions = dates.length;

  // current streak: walk backwards from today while completed
  let currentStreak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // allow today to be incomplete without breaking a streak that ended yesterday
  if (!habit.completions[toDateKey(cursor)]) {
    cursor = addDays(cursor, -1);
  }
  while (habit.completions[toDateKey(cursor)]) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  // best streak: scan all completion dates sorted
  const sorted = dates.slice().sort();
  let bestStreak = 0;
  let running = 0;
  let prevDate: Date | null = null;
  for (const key of sorted) {
    const d = new Date(key + 'T00:00:00');
    if (prevDate && toDateKey(addDays(prevDate, 1)) === key) {
      running++;
    } else {
      running = 1;
    }
    bestStreak = Math.max(bestStreak, running);
    prevDate = d;
  }

  // 30 day completion rate
  let completedLast30 = 0;
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    if (habit.completions[toDateKey(d)]) completedLast30++;
    d = addDays(d, -1);
  }
  const completionRate30d = Math.round((completedLast30 / 30) * 100);

  return { currentStreak, bestStreak, totalCompletions, completionRate30d };
}
