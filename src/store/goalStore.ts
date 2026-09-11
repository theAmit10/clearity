import { create } from 'zustand';
import type { Goal } from '../types/goal';
import type { GoalNotificationConfig, GoalNotificationKind } from '../types/notification';
import { loadGoals, saveGoals, loadGoalNotifications, saveGoalNotifications } from '../services/storage';
import { logEvent } from '../services/logger';
import { trackEvent } from '../services/analytics';
import { t } from '../i18n';
import { FREE_GOAL_LIMIT } from '../constants/appInfo';
import { useHabitStore } from './habitStore';
import {
  scheduleGoalNotification,
  cancelGoalNotification,
  computeGoalAutoTimes,
  buildGoalAutoText,
  requestPermission,
} from '../services/notification';

interface GoalState {
  goals: Goal[];
  goalNotifications: GoalNotificationConfig[];
  loaded: boolean;
  init: () => Promise<void>;
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  completeGoal: (id: string) => Promise<void>;
  extendGoal: (id: string, newEndAt: string) => Promise<void>;
  addGoalReminder: (goalId: string, data: { title: string; body: string; timestamp: number }) => Promise<void>;
  updateGoalReminder: (id: string, patch: Partial<GoalNotificationConfig>) => Promise<void>;
  removeGoalReminder: (id: string) => Promise<void>;
  replaceAllGoals: (goals: Goal[]) => Promise<void>;
  mergeGoals: (incoming: Goal[]) => Promise<void>;
  rescheduleActive: () => Promise<void>;
}

function persist(goals: Goal[]) {
  saveGoals(goals).catch(err => logEvent('error', 'Failed to persist goals', err));
}

function persistNotifs(list: GoalNotificationConfig[]) {
  saveGoalNotifications(list).catch(err => logEvent('error', 'Failed to persist goal notifications', err));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AUTO_KINDS: GoalNotificationKind[] = ['ten_second', 'halfway', 'almost_due'];

/** Build the automated reminders for a goal. Times already in the past
 * are skipped (e.g. very short deadlines). IDs are stable per goal+kind
 * so recomputing after an edit replaces rather than duplicates. */
function autoConfigsFor(goal: Goal): GoalNotificationConfig[] {
  const times = computeGoalAutoTimes(goal);
  const now = Date.now();
  const pairs: [GoalNotificationKind, number][] = [
    ['ten_second', times.tenSecond],
    ['halfway', times.halfway],
    ['almost_due', times.almostDue],
  ];
  return pairs
    .filter(([, timestamp]) => timestamp > now)
    .map(([kind, timestamp]) => {
      const { title, body } = buildGoalAutoText(goal, kind);
      return {
        id: `${goal.id}-${kind}`,
        goalId: goal.id,
        kind,
        enabled: true,
        title,
        body,
        timestamp,
      };
    });
}

async function requestPermissionBestEffort() {
  try {
    await requestPermission();
  } catch (err) {
    logEvent('warn', 'Goal notification permission request failed', err);
  }
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  goalNotifications: [],
  loaded: false,

  init: async () => {
    try {
      const [stored, storedNotifs] = await Promise.all([
        loadGoals<Goal[]>(),
        loadGoalNotifications<GoalNotificationConfig[]>(),
      ]);
      const migrated = (stored ?? []).map(g => ({
        ...g,
        status: g.status ?? 'active' as const,
      }));
      const liveIds = new Set(migrated.map(g => g.id));
      const notifs = (storedNotifs ?? []).filter(n => liveIds.has(n.goalId));
      set({ goals: migrated, goalNotifications: notifs, loaded: true });
      logEvent('info', 'Goal store initialized', { count: migrated.length });
    } catch (err) {
      logEvent('error', 'Failed to load goals', err);
      set({ goals: [], goalNotifications: [], loaded: true });
    }
  },

  /** Re-schedule all pending reminders for active goals (app launch). */
  rescheduleActive: async () => {
    const { goals, goalNotifications } = get();
    const activeIds = new Set(goals.filter(g => g.status === 'active').map(g => g.id));
    const pending = goalNotifications.filter(
      n => n.enabled && activeIds.has(n.goalId) && n.timestamp > Date.now(),
    );
    await Promise.all(pending.map(n => scheduleGoalNotification(n)));
    logEvent('info', 'Goal notifications rescheduled', { count: pending.length });
  },

  addGoal: async data => {
    const isPro = useHabitStore.getState().isPro;
    if (!isPro && get().goals.length >= FREE_GOAL_LIMIT) {
      logEvent('info', 'Goal creation blocked — free limit reached');
      throw new Error(t('goalStore.goalLimitBody', { count: FREE_GOAL_LIMIT }));
    }
    const goal: Goal = {
      ...data,
      id: makeId(),
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const autos = autoConfigsFor(goal);
    const goals = [...get().goals, goal];
    const goalNotifications = [...get().goalNotifications, ...autos];
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    trackEvent('goal_added', { icon: data.icon });
    logEvent('info', 'Goal added', { id: goal.id });
    await requestPermissionBestEffort();
    await Promise.all(autos.map(n => scheduleGoalNotification(n)));
  },

  updateGoal: async (id, patch) => {
    const current = get().goals.find(g => g.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    const goals = get().goals.map(g => (g.id === id ? updated : g));
    let goalNotifications = get().goalNotifications;
    if (patch.startAt !== undefined || patch.endAt !== undefined || patch.title !== undefined) {
      const oldAutoIds = goalNotifications
        .filter(n => n.goalId === id && AUTO_KINDS.includes(n.kind))
        .map(n => n.id);
      await Promise.all(oldAutoIds.map(cancelGoalNotification));
      const autos = autoConfigsFor(updated);
      goalNotifications = [
        ...goalNotifications.filter(n => !(n.goalId === id && AUTO_KINDS.includes(n.kind))),
        ...autos,
      ];
      await Promise.all(autos.map(n => scheduleGoalNotification(n)));
    }
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    logEvent('info', 'Goal updated', { id });
  },

  deleteGoal: async id => {
    const removed = get().goalNotifications.filter(n => n.goalId === id);
    await Promise.all(removed.map(n => cancelGoalNotification(n.id)));
    const goals = get().goals.filter(g => g.id !== id);
    const goalNotifications = get().goalNotifications.filter(n => n.goalId !== id);
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    trackEvent('goal_deleted');
    logEvent('info', 'Goal deleted', { id });
  },

  completeGoal: async id => {
    const goal = get().goals.find(g => g.id === id);
    const removed = get().goalNotifications.filter(n => n.goalId === id);
    await Promise.all(removed.map(n => cancelGoalNotification(n.id)));
    const overdue = goal ? Date.now() - new Date(goal.endAt).getTime() > 0 : false;
    const goals = get().goals.map(g =>
      g.id === id ? { ...g, status: 'completed' as const, completedAt: new Date().toISOString() } : g,
    );
    const goalNotifications = get().goalNotifications.filter(n => n.goalId !== id);
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    trackEvent('goal_completed', { overdue });
    logEvent('info', 'Goal completed', { id });
  },

  extendGoal: async (id, newEndAt) => {
    const current = get().goals.find(g => g.id === id);
    if (!current) return;
    const updated = { ...current, endAt: newEndAt };
    const goals = get().goals.map(g => (g.id === id ? updated : g));
    const oldAutoIds = get().goalNotifications
      .filter(n => n.goalId === id && AUTO_KINDS.includes(n.kind))
      .map(n => n.id);
    await Promise.all(oldAutoIds.map(cancelGoalNotification));
    const autos = autoConfigsFor(updated);
    const goalNotifications = [
      ...get().goalNotifications.filter(n => !(n.goalId === id && AUTO_KINDS.includes(n.kind))),
      ...autos,
    ];
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    await Promise.all(autos.map(n => scheduleGoalNotification(n)));
    trackEvent('goal_extended');
    logEvent('info', 'Goal extended', { id });
  },

  addGoalReminder: async (goalId, data) => {
    const config: GoalNotificationConfig = {
      id: makeId(),
      goalId,
      kind: 'custom',
      enabled: true,
      title: data.title,
      body: data.body,
      timestamp: data.timestamp,
    };
    const goalNotifications = [...get().goalNotifications, config];
    set({ goalNotifications });
    persistNotifs(goalNotifications);
    await requestPermissionBestEffort();
    await scheduleGoalNotification(config);
    trackEvent('goal_reminder_set');
    logEvent('info', 'Goal reminder added', { goalId, id: config.id });
  },

  updateGoalReminder: async (id, patch) => {
    const goalNotifications = get().goalNotifications.map(n =>
      n.id === id ? { ...n, ...patch } : n,
    );
    set({ goalNotifications });
    persistNotifs(goalNotifications);
    const updated = goalNotifications.find(n => n.id === id);
    if (updated) await scheduleGoalNotification(updated);
    logEvent('info', 'Goal reminder updated', { id });
  },

  removeGoalReminder: async id => {
    await cancelGoalNotification(id);
    const goalNotifications = get().goalNotifications.filter(n => n.id !== id);
    set({ goalNotifications });
    persistNotifs(goalNotifications);
    trackEvent('goal_reminder_removed');
    logEvent('info', 'Goal reminder removed', { id });
  },

  replaceAllGoals: async goals => {
    const incoming = goals.map(g => ({
      ...g,
      status: g.status ?? ('active' as const),
    }));
    const oldIds = get().goalNotifications.map(n => n.id);
    await Promise.all(oldIds.map(cancelGoalNotification));
    const autos = incoming.flatMap(g => autoConfigsFor(g));
    set({ goals: incoming, goalNotifications: autos });
    persist(incoming);
    persistNotifs(autos);
    await Promise.all(autos.map(n => scheduleGoalNotification(n)));
    trackEvent('goals_imported', { count: incoming.length, type: 'replace' });
    logEvent('info', 'Goals replaced via import', { count: incoming.length });
  },

  mergeGoals: async incomingRaw => {
    const incoming = incomingRaw.map(g => ({
      ...g,
      status: g.status ?? ('active' as const),
    }));
    const existing = get().goals;
    const byId = new Map(existing.map(g => [g.id, g]));
    for (const g of incoming) {
      byId.set(g.id, { ...byId.get(g.id), ...g });
    }
    const goals = Array.from(byId.values());
    const incomingIds = new Set(incoming.map(g => g.id));
    const keptNotifs = get().goalNotifications.filter(
      n => !incomingIds.has(n.goalId) || n.kind === 'custom',
    );
    const keptAutoIds = new Set(
      keptNotifs.filter(n => AUTO_KINDS.includes(n.kind)).map(n => n.id),
    );
    const removedAutoIds = get()
      .goalNotifications.filter(
        n => incomingIds.has(n.goalId) && AUTO_KINDS.includes(n.kind) && !keptAutoIds.has(n.id),
      )
      .map(n => n.id);
    await Promise.all(removedAutoIds.map(cancelGoalNotification));
    const autos = incoming.flatMap(g => {
      const merged = byId.get(g.id);
      return merged ? autoConfigsFor(merged) : [];
    });
    const goalNotifications = [
      ...keptNotifs.filter(n => !(incomingIds.has(n.goalId) && AUTO_KINDS.includes(n.kind))),
      ...autos,
    ];
    set({ goals, goalNotifications });
    persist(goals);
    persistNotifs(goalNotifications);
    await Promise.all(autos.map(n => scheduleGoalNotification(n)));
    trackEvent('goals_imported', { count: goals.length, type: 'merge' });
    logEvent('info', 'Goals merged via import', { count: goals.length });
  },
}));
