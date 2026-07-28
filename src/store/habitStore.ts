import { create } from 'zustand';
import { Habit, HabitStats } from '../types/habit';
import type { HabitNotificationConfig, AdminNotificationConfig, NotificationStoreData } from '../types/notification';
import { loadHabits, saveHabits, loadReviewState, saveReviewState, loadNotificationData, saveNotificationData } from '../services/storage';
import { logEvent } from '../services/logger';
import { trackEvent } from '../services/analytics';
import { addDays, toDateKey, todayKey } from '../services/dateUtils';
import { scheduleHabitNotification, cancelHabitNotification, scheduleAdminNotification, cancelAdminNotification, DEFAULT_ADMIN_NOTIFICATIONS } from '../services/notification';
import { WidgetModule } from '../native/WidgetModule';

interface HabitState {
  habits: Habit[];
  loaded: boolean;
  reviewPromptShown: boolean;
  habitNotifications: HabitNotificationConfig[];
  adminNotifications: AdminNotificationConfig[];
  init: () => Promise<void>;
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'completions'>) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (id: string, dateKey?: string) => Promise<void>;
  addMissedNote: (id: string, dateKey: string, note: string) => Promise<void>;
  removeMissedNote: (id: string, dateKey: string) => Promise<void>;
  replaceAllHabits: (habits: Habit[]) => Promise<void>;
  mergeHabits: (incoming: Habit[]) => Promise<void>;
  markReviewPromptShown: () => Promise<void>;
  reorderHabits: (reordered: Habit[]) => Promise<void>;
  addHabitNotification: (habitId: string, config: { title: string; body: string; hour: number; minute: number }) => Promise<void>;
  updateHabitNotification: (id: string, patch: Partial<HabitNotificationConfig>) => Promise<void>;
  removeHabitNotification: (id: string) => Promise<void>;
  addAdminNotification: (config: AdminNotificationConfig) => Promise<void>;
  updateAdminNotification: (id: string, patch: Partial<AdminNotificationConfig>) => Promise<void>;
  removeAdminNotification: (id: string) => Promise<void>;
}

function persist(habits: Habit[]) {
  saveHabits(habits).catch(err => logEvent('error', 'Failed to persist habits', err));
}

function updateWidget(habits: Habit[]) {
  const active = habits.filter(h => !h.archived);
  const payload = WidgetModule.buildPayload(active);
  WidgetModule.updateWidgetData(payload).catch(() => {});
  WidgetModule.reloadWidget().catch(() => {});
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loaded: false,
  reviewPromptShown: false,
  habitNotifications: [],
  adminNotifications: DEFAULT_ADMIN_NOTIFICATIONS,

  init: async () => {
    try {
      const [stored, reviewShown, notifData] = await Promise.all([
        loadHabits<Habit[]>(),
        loadReviewState(),
        loadNotificationData<NotificationStoreData>(),
      ]);

      const raw = notifData?.habitNotifications;
      let habitNotifs: HabitNotificationConfig[];
      if (Array.isArray(raw)) {
        habitNotifs = raw;
      } else if (raw && typeof raw === 'object') {
        const oldMap = raw as Record<string, { habitId: string; enabled: boolean; title: string; body: string; hour: number; minute: number }>;
        habitNotifs = Object.values(oldMap).map(n => ({
          habitId: n.habitId,
          enabled: n.enabled,
          title: n.title,
          body: n.body ?? '',
          hour: n.hour,
          minute: n.minute,
          id: `notif-${n.habitId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }));
      } else {
        habitNotifs = [];
      }

      const migrated = (stored ?? []).map(h => ({
        ...h,
        completions: Object.fromEntries(
          Object.entries((h as any).completions || {}).map(([k, v]: [string, any]) => [k, v === true ? 1 : (v || 0)])
        ),
        missedNotes: (h as any).missedNotes ?? {},
        frequency: (h as any).frequency === 'weekly' || (h as any).frequency === 'custom' || (h as any).frequency === ''
          ? ('daily' as const)
          : h.frequency,
        frequencyValue: (h as any).frequencyValue,
        frequencyWindow: (h as any).frequencyWindow,
      }));

      set({
        habits: migrated,
        loaded: true,
        reviewPromptShown: reviewShown,
        habitNotifications: habitNotifs,
        adminNotifications: notifData?.adminNotifications ?? DEFAULT_ADMIN_NOTIFICATIONS,
      });

      if (!Array.isArray(raw)) {
        saveNotificationData({ habitNotifications: habitNotifs, adminNotifications: get().adminNotifications });
      }

      trackEvent('app_opened', { habit_count: stored?.length ?? 0 });
      logEvent('info', 'Store initialized', { count: stored?.length ?? 0 });
      const h = stored ?? [];
      const active = h.filter((x: { archived: boolean }) => !x.archived);
      const payload = WidgetModule.buildPayload(active);
      WidgetModule.updateWidgetData(payload).catch(() => {});
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
      missedNotes: {},
    };
    const habits = [...get().habits, habit];
    set({ habits });
    persist(habits);
    updateWidget(habits);
    trackEvent('habit_added', { icon: data.icon, frequency: data.frequency });
    logEvent('info', 'Habit added', { id: habit.id, name: habit.name });
  },

  updateHabit: async (id, patch) => {
    const habits = get().habits.map(h => (h.id === id ? { ...h, ...patch } : h));
    set({ habits });
    persist(habits);
    updateWidget(habits);
  },

  deleteHabit: async id => {
    const habits = get().habits.filter(h => h.id !== id);
    set({ habits });
    persist(habits);
    updateWidget(habits);
    trackEvent('habit_deleted');
    logEvent('info', 'Habit deleted', { id });
  },

  toggleCompletion: async (id, dateKey) => {
    const key = dateKey ?? todayKey();
    const habits = get().habits.map(h => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      const missedNotes = { ...(h.missedNotes ?? {}) };
      const current = completions[key] || 0;

      if (h.frequency === 'n_times_in_m_days') {
        const target = h.frequencyValue ?? 1;
        if (current >= target) {
          delete completions[key];
        } else {
          completions[key] = current + 1;
        }
      } else {
        if (current > 0) {
          delete completions[key];
        } else {
          completions[key] = 1;
        }
      }

      delete missedNotes[key];
      return { ...h, completions, missedNotes };
    });
    const wasChecked = !get().habits.find(h => h.id === id)?.completions[key];
    trackEvent(wasChecked ? 'habit_uncompleted' : 'habit_completed');
    set({ habits });
    persist(habits);
    updateWidget(habits);
  },

  addMissedNote: async (id, dateKey, note) => {
    const habits = get().habits.map(h => {
      if (h.id !== id) return h;
      return {
        ...h,
        completions: { ...h.completions, [dateKey]: 1 },
        missedNotes: { ...(h.missedNotes ?? {}), [dateKey]: note },
      };
    });
    set({ habits });
    persist(habits);
    updateWidget(habits);
    logEvent('info', 'Missed note added', { habitId: id, date: dateKey });
  },

  removeMissedNote: async (id, dateKey) => {
    const habits = get().habits.map(h => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      const missedNotes = { ...(h.missedNotes ?? {}) };
      delete completions[dateKey];
      delete missedNotes[dateKey];
      return { ...h, completions, missedNotes };
    });
    set({ habits });
    persist(habits);
    updateWidget(habits);
  },

  replaceAllHabits: async habits => {
    set({ habits });
    persist(habits);
    updateWidget(habits);
    trackEvent('habits_imported', { count: habits.length, type: 'replace' });
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
    updateWidget(habits);
    trackEvent('habits_imported', { count: habits.length, type: 'merge' });
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
    updateWidget(reordered);
    trackEvent('habits_reordered');
    logEvent('info', 'Habits reordered');
  },

  addHabitNotification: async (habitId, data) => {
    const config: HabitNotificationConfig = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      habitId,
      enabled: true,
      title: data.title,
      body: data.body,
      hour: data.hour,
      minute: data.minute,
    };
    const habitNotifications = [...get().habitNotifications, config];
    set({ habitNotifications });
    await saveNotificationData({
      habitNotifications,
      adminNotifications: get().adminNotifications,
    });
    await scheduleHabitNotification(config);
    logEvent('info', 'Habit notification added', { habitId, id: config.id });
  },

  updateHabitNotification: async (id, patch) => {
    const habitNotifications = get().habitNotifications.map(n =>
      n.id === id ? { ...n, ...patch } : n,
    );
    set({ habitNotifications });
    await saveNotificationData({
      habitNotifications,
      adminNotifications: get().adminNotifications,
    });
    const updated = habitNotifications.find(n => n.id === id);
    if (updated) await scheduleHabitNotification(updated);
    logEvent('info', 'Habit notification updated', { id });
  },

  removeHabitNotification: async id => {
    const habitNotifications = get().habitNotifications.filter(n => n.id !== id);
    set({ habitNotifications });
    await saveNotificationData({
      habitNotifications,
      adminNotifications: get().adminNotifications,
    });
    await cancelHabitNotification(id);
    logEvent('info', 'Habit notification removed', { id });
  },

  addAdminNotification: async config => {
    const adminNotifications = [...get().adminNotifications, config];
    set({ adminNotifications });
    await saveNotificationData({
      habitNotifications: get().habitNotifications,
      adminNotifications,
    });
    await scheduleAdminNotification(config);
    logEvent('info', 'Admin notification added', { id: config.id });
  },

  updateAdminNotification: async (id, patch) => {
    const adminNotifications = get().adminNotifications.map(n =>
      n.id === id ? { ...n, ...patch } : n,
    );
    set({ adminNotifications });
    await saveNotificationData({
      habitNotifications: get().habitNotifications,
      adminNotifications,
    });
    const updated = adminNotifications.find(n => n.id === id);
    if (updated) {
      await scheduleAdminNotification(updated);
    }
    logEvent('info', 'Admin notification updated', { id });
  },

  removeAdminNotification: async id => {
    const adminNotifications = get().adminNotifications.filter(n => n.id !== id);
    set({ adminNotifications });
    await saveNotificationData({
      habitNotifications: get().habitNotifications,
      adminNotifications,
    });
    await cancelAdminNotification(id);
    logEvent('info', 'Admin notification removed', { id });
  },
}));

function countCompletionsInRange(habit: Habit, start: Date, end: Date): number {
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (habit.completions[toDateKey(cursor)]) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

const effectiveSetCache = new WeakMap<Habit, Set<string>>();

export function computeEffectiveDateSet(habit: Habit): Set<string> {
  const cached = effectiveSetCache.get(habit);
  if (cached) return cached;

  const set = new Set<string>();
  const dates = Object.keys(habit.completions).filter(k => habit.completions[k]).sort();

  if (habit.frequency === 'n_times_in_m_days') {
    const target = habit.frequencyValue ?? 1;
    const windowSize = habit.frequencyWindow ?? 7;
    for (let i = 0; i < dates.length; i++) {
      const startKey = dates[i];
      const start = new Date(startKey + 'T00:00:00');
      const end = addDays(start, windowSize - 1);
      let count = 0;
      for (let j = i; j < dates.length; j++) {
        const d = new Date(dates[j] + 'T00:00:00');
        if (d > end) break;
        count += (habit.completions[dates[j]] || 0);
      }
      if (count >= target) {
        let cursor = new Date(start);
        while (cursor <= end) {
          set.add(toDateKey(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    effectiveSetCache.set(habit, set);
    return set;
  }

  for (const k of dates) set.add(k);

  if (habit.frequency === 'n_times_per_week') {
    const target = habit.frequencyValue ?? 3;
    const seen = new Set<string>();
    for (const k of dates) {
      const d = new Date(k + 'T00:00:00');
      const ws = getWeekStart(d);
      const key = toDateKey(ws);
      if (seen.has(key)) continue;
      seen.add(key);
      const count = countCompletionsInRange(habit, ws, addDays(ws, 6));
      if (count >= target) {
        for (let i = 0; i < 7; i++) set.add(toDateKey(addDays(ws, i)));
      }
    }
  } else if (habit.frequency === 'n_times_per_month') {
    const target = habit.frequencyValue ?? 1;
    const seen = new Set<string>();
    for (const k of dates) {
      const d = new Date(k + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = countCompletionsInRange(habit, monthStart, monthEnd);
      if (count >= target) {
        let cursor = new Date(monthStart);
        while (cursor <= monthEnd) {
          set.add(toDateKey(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
  }

  effectiveSetCache.set(habit, set);
  return set;
}

export function isDayCompleted(habit: Habit, dateKey: string): boolean {
  return computeEffectiveDateSet(habit).has(dateKey);
}

export function isDayMissed(habit: Habit, dateKey: string): boolean {
  return !!habit.missedNotes?.[dateKey];
}

function shouldCountAsCompleted(habit: Habit, dateKey: string): boolean {
  return !!habit.completions[dateKey];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getCompletionsInWeek(habit: Habit, weekStart: Date): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (habit.completions[toDateKey(addDays(weekStart, i))]) count++;
  }
  return count;
}

function weekMeetsTarget(habit: Habit, weekStart: Date): boolean {
  if (habit.frequency !== 'n_times_per_week') return false;
  const target = habit.frequencyValue ?? 3;
  return getCompletionsInWeek(habit, weekStart) >= target;
}

function monthMeetsTarget(habit: Habit, year: number, month: number): boolean {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const target = habit.frequencyValue ?? 1;
  return countCompletionsInRange(habit, monthStart, monthEnd) >= target;
}

export function computeStats(habit: Habit): HabitStats {
  const dates = Object.keys(habit.completions).filter(k => habit.completions[k]);
  const totalCompletions = dates.reduce((sum, k) => sum + (habit.completions[k] || 0), 0);

  let currentStreak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (habit.frequency === 'daily' || !habit.frequency || habit.frequency === 'every_n_days') {
    if (!shouldCountAsCompleted(habit, toDateKey(cursor))) {
      cursor = addDays(cursor, -1);
    }
    while (shouldCountAsCompleted(habit, toDateKey(cursor))) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }
  } else if (habit.frequency === 'n_times_per_week') {
    let weekStart = getWeekStart(cursor);
    if (!weekMeetsTarget(habit, weekStart)) {
      weekStart = addDays(weekStart, -7);
    }
    while (weekMeetsTarget(habit, weekStart)) {
      currentStreak++;
      weekStart = addDays(weekStart, -7);
    }
  } else if (habit.frequency === 'n_times_per_month') {
    let cy = cursor.getFullYear();
    let cm = cursor.getMonth();
    if (!monthMeetsTarget(habit, cy, cm)) {
      cm -= 1;
      if (cm < 0) { cm = 11; cy -= 1; }
    }
    while (monthMeetsTarget(habit, cy, cm)) {
      currentStreak++;
      cm -= 1;
      if (cm < 0) { cm = 11; cy -= 1; }
    }
  } else if (habit.frequency === 'n_times_in_m_days') {
    const target = habit.frequencyValue ?? 1;
    const windowSize = habit.frequencyWindow ?? 7;
    const windowStart = addDays(cursor, -windowSize);
    let sum = 0;
    const check = new Date(windowStart);
    while (check <= cursor) {
      sum += (habit.completions[toDateKey(check)] || 0);
      check.setDate(check.getDate() + 1);
    }
    currentStreak = sum >= target ? sum : 0;
  }

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

  let completedLast30 = 0;
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    if (shouldCountAsCompleted(habit, toDateKey(d))) completedLast30++;
    d = addDays(d, -1);
  }
  const completionRate30d = Math.round((completedLast30 / 30) * 100);

  return { currentStreak, bestStreak, totalCompletions, completionRate30d };
}
