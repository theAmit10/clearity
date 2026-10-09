import { create } from 'zustand';
import { Habit, HabitStats, HabitCategory } from '../types/habit';
import type { HabitNotificationConfig, AdminNotificationConfig, NotificationStoreData } from '../types/notification';
import { loadHabits, saveHabits, loadGoals, loadReviewPromptState, saveReviewPromptState, loadNotificationData, saveNotificationData, loadGeneralSettings, saveGeneralSettings, loadCustomCategories, saveCustomCategories } from '../services/storage';
import type { ReviewPromptState } from '../services/storage';
import { logEvent } from '../services/logger';
import {
  trackEvent,
  trackSubscriptionActivated,
} from '../services/analytics';
import { getStoredVariantSync } from './paywallVariantStore';
import { APP_VERSION } from '../constants/appInfo';
import { addDays, toDateKey, todayKey } from '../services/dateUtils';
import { scheduleHabitNotification, cancelHabitNotification, scheduleAdminNotification, cancelAdminNotification, DEFAULT_ADMIN_NOTIFICATIONS } from '../services/notification';
import { WidgetModule, buildWidgetPayloadForState } from '../native/WidgetModule';
import { getCustomerInfo, isPro as checkIsPro, hadProButExpired, setOnCustomerInfoUpdate } from '../services/revenueCat';
import { FREE_HABIT_LIMIT, FREE_NOTIF_LIMIT } from '../constants/appInfo';
import { getLockedHabitIds } from '../services/proAccess';
import type { CustomerInfo } from 'react-native-purchases';
import type { Goal } from '../types/goal';
import { t } from '../i18n';

interface HabitState {
  habits: Habit[];
  loaded: boolean;
  reviewPromptShown: boolean;
  reviewPrompt: ReviewPromptState;
  habitNotifications: HabitNotificationConfig[];
  adminNotifications: AdminNotificationConfig[];
  customCategories: HabitCategory[];
  showCategories: boolean;
  showStreaks: boolean;
  showCategoryBadges: boolean;
  showFrequency: boolean;
  crashlyticsEnabled: boolean;
  isPro: boolean;
  proExpired: boolean;
  init: () => Promise<void>;
  refreshProStatus: () => Promise<void>;
  /**
   * Central choke point for Pro flips from purchase / restore / dismiss
   * flows: sets state and pushes the matching widget payload on
   * transitions (bare setState skips the push and leaves OS widgets
   * showing a stale locked card after renew).
   */
  applyProState: (next: { isPro: boolean; proExpired: boolean }) => void;
  /**
   * Re-push the current payload and force a timeline reload. Called on app
   * foreground so a desynced widget (throttled reloads, failed writes)
   * repairs itself within seconds without waiting for the next mutation.
   */
  resyncWidget: () => void;
  /** Apply ops queued by native widget taps (absolute values). No-op when none. */
  syncWidgetToggles: () => Promise<number>;
  addHabit: (h: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'completions'>) => Promise<void>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleCompletion: (id: string, dateKey?: string) => Promise<void>;
  decrementCompletion: (id: string, dateKey?: string) => Promise<void>;
  addMissedNote: (id: string, dateKey: string, note: string) => Promise<void>;
  removeMissedNote: (id: string, dateKey: string) => Promise<void>;
  replaceAllHabits: (habits: Habit[]) => Promise<void>;
  mergeHabits: (incoming: Habit[]) => Promise<void>;
  markReviewPromptShown: () => Promise<void>;
  markStreakPromptShown: () => Promise<void>;
  markManualReviewPromptShown: () => Promise<void>;
  reorderHabits: (reordered: Habit[]) => Promise<void>;
  addHabitNotification: (habitId: string, config: { title: string; body: string; hour: number; minute: number }) => Promise<void>;
  updateHabitNotification: (id: string, patch: Partial<HabitNotificationConfig>) => Promise<void>;
  removeHabitNotification: (id: string) => Promise<void>;
  addAdminNotification: (config: AdminNotificationConfig) => Promise<void>;
  updateAdminNotification: (id: string, patch: Partial<AdminNotificationConfig>) => Promise<void>;
  removeAdminNotification: (id: string) => Promise<void>;
  addCustomCategory: (cat: HabitCategory) => void;
  removeCustomCategory: (key: string) => void;
  setShowCategories: (val: boolean) => Promise<void>;
  setShowStreaks: (val: boolean) => Promise<void>;
  setShowCategoryBadges: (val: boolean) => Promise<void>;
  setShowFrequency: (val: boolean) => Promise<void>;
  setCrashlyticsEnabled: (val: boolean) => Promise<void>;
}

function computeProState(info: CustomerInfo | null, wasPro: boolean) {
  const nowPro = checkIsPro(info);
  return {
    isPro: nowPro,
    proExpired: !nowPro && (wasPro || hadProButExpired(info)),
  };
}

function persist(habits: Habit[]) {
  saveHabits(habits).catch(err => logEvent('error', 'Failed to persist habits', err));
}

/** Throw when a free/expired user touches a Pro-locked habit (over the
 * free limit). Delete / reorder / archived items stay open so users can
 * always recover without paying and nothing is ever force-deleted. */
function assertHabitUnlocked(
  habits: Habit[],
  isPro: boolean,
  id: string,
): void {
  if (isPro) return;
  if (getLockedHabitIds(habits).has(id)) {
    logEvent('info', 'Habit interaction blocked — Pro-locked habit');
    throw new Error(
      t('proAccess.habitLockedBody', { count: FREE_HABIT_LIMIT }),
    );
  }
}

let lastWidgetReloadAt = 0;
const WIDGET_RELOAD_THROTTLE_MS = 5000;

/** Test-only: reset the reload throttle so specs stay deterministic. */
export function __resetWidgetReloadThrottleForTests(): void {
  lastWidgetReloadAt = 0;
}

function updateWidget(
  habits: Habit[],
  pro: { isPro: boolean; proExpired: boolean },
  forceReload = false,
) {
  const active = habits.filter(h => !h.archived);
  const payload = buildWidgetPayloadForState(active, pro);
  // Data writes always go through (cheap shared-defaults write); surface
  // failures instead of stranding the widget on a stale payload silently.
  WidgetModule.updateWidgetData(payload).catch(err =>
    logEvent('error', 'Failed to push widget data', err),
  );
  // Timeline reloads are daily-budgeted by the OS — coalesce bursts (rapid
  // toggles/edits) so heavy use can't freeze the widget on a stale timeline.
  const now = Date.now();
  if (!forceReload && now - lastWidgetReloadAt < WIDGET_RELOAD_THROTTLE_MS) {
    return;
  }
  lastWidgetReloadAt = now;
  WidgetModule.reloadWidget().catch(err =>
    logEvent('error', 'Failed to reload widget', err),
  );
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  loaded: false,
  reviewPromptShown: false,
  reviewPrompt: { firstPromptAt: null, streakPromptAt: null, promptCount: 0, lastPromptAt: null },
  habitNotifications: [],
  adminNotifications: DEFAULT_ADMIN_NOTIFICATIONS,
  customCategories: [],
  showCategories: true,
  showStreaks: true,
  showCategoryBadges: true,
  showFrequency: true,
  crashlyticsEnabled: true,
  isPro: false,
  proExpired: false,

  refreshProStatus: async () => {
    const info = await getCustomerInfo();
    const prev = get();
    const next = computeProState(info, prev.isPro);
    set(next);
    if (next.proExpired && !prev.proExpired) trackEvent('subscription_expired');
    // Renewals / external activations land here (purchase + restore handlers
    // track their own with package details; the shared dedupe in
    // trackSubscriptionActivated keeps the funnel endpoint counted once).
    if (next.isPro && !prev.isPro) {
      trackSubscriptionActivated({
        via: 'auto',
        previous_state: prev.proExpired ? 'expired' : 'free',
      });
    }
    // Push the matching widget payload on Pro transitions so expiry locks
    // the OS widgets (Pro upsell card) and renew restores data instantly.
    if (next.isPro !== prev.isPro || next.proExpired !== prev.proExpired) {
      updateWidget(get().habits, {
        isPro: next.isPro,
        proExpired: next.proExpired,
      });
    }
  },

  applyProState: next => {
    const prev = get();
    set(next);
    if (next.isPro !== prev.isPro || next.proExpired !== prev.proExpired) {
      updateWidget(get().habits, {
        isPro: next.isPro,
        proExpired: next.proExpired,
      });
    }
  },

  resyncWidget: () => {
    const s = get();
    updateWidget(s.habits, { isPro: s.isPro, proExpired: s.proExpired }, true);
  },

  syncWidgetToggles: async () => {
    if (!get().isPro) {
      // Locked widgets render the Pro upsell with no toggle targets — drain
      // any stale queued ops so they can never write after expiry.
      await WidgetModule.consumePendingToggles().catch(() => []);
      logEvent('info', 'Widget toggles dropped (locked)');
      return 0;
    }
    const ops = await WidgetModule.consumePendingToggles();
    if (ops.length === 0) return 0;
    // Last-write-wins per habit+date so rapid double-taps converge.
    const latest = new Map<string, (typeof ops)[number]>();
    for (const op of ops) {
      latest.set(`${op.habitId}\u0000${op.dateKey}`, op);
    }
    const knownIds = new Set(get().habits.map(h => h.id));
    let applied = 0;
    const habits = get().habits.map(h => {
      let changed = false;
      const completions = { ...h.completions };
      const missedNotes = { ...(h.missedNotes ?? {}) };
      for (const op of latest.values()) {
        if (op.habitId !== h.id) continue;
        if (op.value > 0) {
          if (completions[op.dateKey] !== op.value) {
            completions[op.dateKey] = op.value;
            changed = true;
          }
        } else if (op.dateKey in completions) {
          delete completions[op.dateKey];
          changed = true;
        }
        if (op.dateKey in missedNotes) {
          delete missedNotes[op.dateKey];
          changed = true;
        }
      }
      if (changed) {
        applied++;
        return { ...h, completions, missedNotes };
      }
      return h;
    });
    // Drop ops for unknown/deleted habits — nothing to apply.
    const unknown = [...latest.values()].filter(op => !knownIds.has(op.habitId)).length;
    if (applied > 0) {
      set({ habits });
      persist(habits);
      updateWidget(habits, get());
      logEvent('info', 'Widget toggles applied', { applied, unknown });
    } else if (unknown > 0) {
      logEvent('info', 'Widget toggles dropped (unknown habits)', { unknown });
    }
    return applied;
  },

  init: async () => {
    try {
      const [stored, storedGoals, reviewPromptState, notifData, generalSettings, customCategories] = await Promise.all([
        loadHabits<Habit[]>(),
        loadGoals<Goal[]>(),
        loadReviewPromptState(),
        loadNotificationData<NotificationStoreData>(),
        loadGeneralSettings(),
        loadCustomCategories<HabitCategory[]>(),
      ]);

      const info = await getCustomerInfo();
      const proState = computeProState(info, false);
      set(proState);
      if (proState.proExpired) trackEvent('subscription_expired');
      setOnCustomerInfoUpdate(() => {
        get().refreshProStatus();
      });

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
        category: (h as any).category || 'none',
        frequency: (h as any).frequency === 'weekly' || (h as any).frequency === 'custom' || (h as any).frequency === '' || (h as any).frequency === 'every_n_days'
          ? ('daily' as const)
          : h.frequency,
        frequencyValue: (h as any).frequencyValue,
        frequencyWindow: (h as any).frequencyWindow,
      }));

      set({
        habits: migrated,
        loaded: true,
        reviewPromptShown: reviewPromptState.promptCount > 0,
        reviewPrompt: reviewPromptState,
        habitNotifications: habitNotifs,
        adminNotifications: notifData?.adminNotifications ?? DEFAULT_ADMIN_NOTIFICATIONS,
        customCategories: customCategories ?? [],
        showCategories: generalSettings?.showCategories ?? true,
        showStreaks: generalSettings?.showStreaks ?? true,
        showCategoryBadges: generalSettings?.showCategoryBadges ?? true,
        showFrequency: generalSettings?.showFrequency ?? true,
        crashlyticsEnabled: generalSettings?.crashlyticsEnabled ?? true,
      });

      if (!Array.isArray(raw)) {
        saveNotificationData({ habitNotifications: habitNotifs, adminNotifications: get().adminNotifications });
      }

      trackEvent('app_opened', {
        habit_count: stored?.length ?? 0,
        goal_count: storedGoals?.length ?? 0,
        is_pro: proState.isPro,
        paywall_variant: getStoredVariantSync(),
        app_version: APP_VERSION,
      });
      logEvent('info', 'Store initialized', { count: stored?.length ?? 0 });
      const h = stored ?? [];
      const active = h.filter((x: { archived: boolean }) => !x.archived);
      const payload = buildWidgetPayloadForState(active, {
        isPro: proState.isPro,
        proExpired: proState.proExpired,
      });
      WidgetModule.updateWidgetData(payload).catch(() => {});
      // Apply any widget taps that happened while the app was closed.
      // Fire-and-forget: failures are non-critical (queue stays native-side
      // only until consumed, and consume clears it atomically where supported).
      get().syncWidgetToggles().catch(() => {});
    } catch (err) {
      logEvent('error', 'Failed to load habits', err);
      set({ habits: [], loaded: true });
    }
  },

  addHabit: async data => {
    const state = get();
    const activeCount = state.habits.filter(h => !h.archived).length;
    if (!state.isPro && activeCount >= FREE_HABIT_LIMIT) {
      logEvent('info', 'Habit creation blocked — free limit reached');
      throw new Error(t('habitStore.habitLimitBody', { count: FREE_HABIT_LIMIT }));
    }
    const habit: Habit = {
      ...data,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      archived: false,
      completions: {},
      missedNotes: {},
    };
    const habits = [...state.habits, habit];
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
    trackEvent('habit_added', { icon: data.icon, frequency: data.frequency });
    logEvent('info', 'Habit added', { id: habit.id, name: habit.name });
  },

  updateHabit: async (id, patch) => {
    assertHabitUnlocked(get().habits, get().isPro, id);
    const habits = get().habits.map(h => (h.id === id ? { ...h, ...patch } : h));
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
  },

  deleteHabit: async id => {
    const habits = get().habits.filter(h => h.id !== id);
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
    trackEvent('habit_deleted');
    logEvent('info', 'Habit deleted', { id });
  },

  toggleCompletion: async (id, dateKey) => {
    assertHabitUnlocked(get().habits, get().isPro, id);
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
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
  },

  decrementCompletion: async (id, dateKey) => {
    assertHabitUnlocked(get().habits, get().isPro, id);
    const key = dateKey ?? todayKey();
    const habits = get().habits.map(h => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      const missedNotes = { ...(h.missedNotes ?? {}) };
      const current = completions[key] || 0;
      if (current <= 0) return h;
      if (current <= 1) {
        delete completions[key];
        delete missedNotes[key];
      } else {
        completions[key] = current - 1;
      }
      return { ...h, completions, missedNotes };
    });
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
  },

  addMissedNote: async (id, dateKey, note) => {
    assertHabitUnlocked(get().habits, get().isPro, id);
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
    updateWidget(habits, get());
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
    updateWidget(habits, get());
  },

  replaceAllHabits: async habits => {
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
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
    updateWidget(habits, get());
    logEvent('info', 'Habits merged via import', { count: habits.length });
  },

  markReviewPromptShown: async () => {
    // First-habit one-shot. Cap-guarded so a stale double-call can't inflate
    // the lifetime count and block the future streak prompt.
    const prev = get().reviewPrompt;
    if (prev.promptCount >= 2) {
      set({ reviewPromptShown: true });
      return;
    }
    const now = new Date().toISOString();
    const next: ReviewPromptState = {
      firstPromptAt: prev.firstPromptAt ?? now,
      streakPromptAt: prev.streakPromptAt,
      promptCount: prev.promptCount + 1,
      lastPromptAt: now,
    };
    set({ reviewPromptShown: true, reviewPrompt: next });
    await saveReviewPromptState(next);
    logEvent('info', 'Review prompt marked as shown');
  },

  markStreakPromptShown: async () => {
    const prev = get().reviewPrompt;
    if (prev.promptCount >= 2) {
      set({ reviewPromptShown: true });
      return;
    }
    const now = new Date().toISOString();
    const next: ReviewPromptState = {
      firstPromptAt: prev.firstPromptAt,
      streakPromptAt: now,
      promptCount: prev.promptCount + 1,
      lastPromptAt: now,
    };
    set({ reviewPromptShown: true, reviewPrompt: next });
    await saveReviewPromptState(next);
    logEvent('info', 'Review prompt marked as shown (streak)');
  },

  markManualReviewPromptShown: async () => {
    // Manual Settings → Rate row. Records the attempt so the auto streak
    // prompt respects the 90-day cooldown instead of double-prompting.
    const prev = get().reviewPrompt;
    if (prev.promptCount >= 2) {
      set({ reviewPromptShown: true });
      return;
    }
    const now = new Date().toISOString();
    const next: ReviewPromptState = {
      ...prev,
      promptCount: prev.promptCount + 1,
      lastPromptAt: now,
    };
    set({ reviewPromptShown: true, reviewPrompt: next });
    await saveReviewPromptState(next);
    logEvent('info', 'Review prompt marked as shown (manual)');
  },

  reorderHabits: async (reordered: Habit[]) => {
    // Drop corrupt entries (see goalStore.isValidGoal) — draggable lists
    // crash in `keyExtractor` on undefined items, so never persist those.
    const habits = reordered.filter(h => !!h && typeof h.id === 'string');
    set({ habits });
    persist(habits);
    updateWidget(habits, get());
    logEvent('info', 'Habits reordered');
  },

  addHabitNotification: async (habitId, data) => {
    const state = get();
    assertHabitUnlocked(state.habits, state.isPro, habitId);
    const existingCount = state.habitNotifications.filter(n => n.habitId === habitId).length;
    if (!state.isPro && existingCount >= FREE_NOTIF_LIMIT) {
      logEvent('info', 'Notification creation blocked — free limit reached');
      throw new Error(t('habitStore.notifLimitBody', { count: FREE_NOTIF_LIMIT }));
    }
    const config: HabitNotificationConfig = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      habitId,
      enabled: true,
      title: data.title,
      body: data.body,
      hour: data.hour,
      minute: data.minute,
    };
    const habitNotifications = [...state.habitNotifications, config];
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
    if (updated) {
      // A suspended (Pro-locked) habit must not come back to life via edit.
      const st = get();
      if (!st.isPro && getLockedHabitIds(st.habits).has(updated.habitId)) {
        await cancelHabitNotification(updated.id);
      } else {
        await scheduleHabitNotification(updated);
      }
    }
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
    await     cancelAdminNotification(id);
    logEvent('info', 'Admin notification removed', { id });
  },

  addCustomCategory: cat => {
    if (!get().isPro) {
      logEvent('info', 'Custom category creation blocked — Pro required');
      return;
    }
    const existing = get().customCategories;
    if (existing.find(c => c.key === cat.key)) return;
    const customCategories = [...existing, cat];
    set({ customCategories });
    saveCustomCategories(customCategories).catch(err =>
      logEvent('error', 'Failed to persist custom categories', err),
    );
  },

  removeCustomCategory: key => {
    const customCategories = get().customCategories.filter(c => c.key !== key);
    set({
      customCategories,
      habits: get().habits.map(h =>
        h.category === key ? { ...h, category: 'none' } : h
      ),
    });
    saveCustomCategories(customCategories).catch(err =>
      logEvent('error', 'Failed to persist custom categories', err),
    );
  },

  setShowCategories: async val => {
    set({ showCategories: val });
    await saveGeneralSettings({ showCategories: val, showStreaks: get().showStreaks, showCategoryBadges: get().showCategoryBadges, showFrequency: get().showFrequency, crashlyticsEnabled: get().crashlyticsEnabled });
    logEvent('info', 'Show categories toggled', { val });
  },

  setShowStreaks: async val => {
    set({ showStreaks: val });
    await saveGeneralSettings({ showCategories: get().showCategories, showStreaks: val, showCategoryBadges: get().showCategoryBadges, showFrequency: get().showFrequency, crashlyticsEnabled: get().crashlyticsEnabled });
    logEvent('info', 'Show streaks toggled', { val });
  },

  setShowCategoryBadges: async val => {
    set({ showCategoryBadges: val });
    await saveGeneralSettings({ showCategories: get().showCategories, showStreaks: get().showStreaks, showCategoryBadges: val, showFrequency: get().showFrequency, crashlyticsEnabled: get().crashlyticsEnabled });
    logEvent('info', 'Show category badges toggled', { val });
  },

  setShowFrequency: async val => {
    set({ showFrequency: val });
    await saveGeneralSettings({ showCategories: get().showCategories, showStreaks: get().showStreaks, showCategoryBadges: get().showCategoryBadges, showFrequency: val, crashlyticsEnabled: get().crashlyticsEnabled });
    logEvent('info', 'Show frequency toggled', { val });
  },

  setCrashlyticsEnabled: async val => {
    set({ crashlyticsEnabled: val });
    await saveGeneralSettings({ showCategories: get().showCategories, showStreaks: get().showStreaks, showCategoryBadges: get().showCategoryBadges, showFrequency: get().showFrequency, crashlyticsEnabled: val });
    logEvent('info', 'Crashlytics toggled', { val });
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

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeStats(habit: Habit): HabitStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let cursor = new Date(today);
  if (!habit.completions[toDateKey(cursor)]) {
    cursor = addDays(cursor, -1);
  }
  while (habit.completions[toDateKey(cursor)]) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  const dates = Object.keys(habit.completions).filter(k => habit.completions[k]).sort();
  let bestStreak = 0;
  let running = 0;
  let prev: string | null = null;
  for (const key of dates) {
    if (prev && toDateKey(addDays(new Date(prev + 'T00:00:00'), 1)) === key) {
      running++;
    } else {
      running = 1;
    }
    bestStreak = Math.max(bestStreak, running);
    prev = key;
  }

  const totalCompletions = dates.reduce((sum, k) => sum + (habit.completions[k] || 0), 0);

  let completedLast30 = 0;
  const d = new Date(today);
  for (let i = 0; i < 30; i++) {
    if (habit.completions[toDateKey(d)]) completedLast30++;
    d.setDate(d.getDate() - 1);
  }
  const completionRate30d = Math.round((completedLast30 / 30) * 100);

  return { currentStreak, bestStreak, totalCompletions, completionRate30d };
}
