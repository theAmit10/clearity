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

      set({
        habits: stored ?? [],
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
      if (completions[key]) {
        delete completions[key];
      } else {
        completions[key] = true;
      }
      return { ...h, completions };
    });
    const wasChecked = !get().habits.find(h => h.id === id)?.completions[key];
    trackEvent(wasChecked ? 'habit_uncompleted' : 'habit_completed');
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
