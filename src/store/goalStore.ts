import { create } from 'zustand';
import type { Goal } from '../types/goal';
import { loadGoals, saveGoals } from '../services/storage';
import { logEvent } from '../services/logger';
import { trackEvent } from '../services/analytics';

interface GoalState {
  goals: Goal[];
  loaded: boolean;
  init: () => Promise<void>;
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  completeGoal: (id: string) => Promise<void>;
  extendGoal: (id: string, newEndAt: string) => Promise<void>;
}

function persist(goals: Goal[]) {
  saveGoals(goals).catch(err => logEvent('error', 'Failed to persist goals', err));
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loaded: false,

  init: async () => {
    try {
      const stored = await loadGoals<Goal[]>();
      const migrated = (stored ?? []).map(g => ({
        ...g,
        status: g.status ?? 'active' as const,
      }));
      set({ goals: migrated, loaded: true });
      logEvent('info', 'Goal store initialized', { count: migrated.length });
    } catch (err) {
      logEvent('error', 'Failed to load goals', err);
      set({ goals: [], loaded: true });
    }
  },

  addGoal: async data => {
    const goal: Goal = {
      ...data,
      id: makeId(),
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const goals = [...get().goals, goal];
    set({ goals });
    persist(goals);
    trackEvent('goal_added', { icon: data.icon });
    logEvent('info', 'Goal added', { id: goal.id });
  },

  updateGoal: async (id, patch) => {
    const goals = get().goals.map(g => (g.id === id ? { ...g, ...patch } : g));
    set({ goals });
    persist(goals);
    logEvent('info', 'Goal updated', { id });
  },

  deleteGoal: async id => {
    const goals = get().goals.filter(g => g.id !== id);
    set({ goals });
    persist(goals);
    trackEvent('goal_deleted');
    logEvent('info', 'Goal deleted', { id });
  },

  completeGoal: async id => {
    const goal = get().goals.find(g => g.id === id);
    const overdue = goal ? Date.now() - new Date(goal.endAt).getTime() > 0 : false;
    const goals = get().goals.map(g =>
      g.id === id ? { ...g, status: 'completed' as const, completedAt: new Date().toISOString() } : g,
    );
    set({ goals });
    persist(goals);
    trackEvent('goal_completed', { overdue });
    logEvent('info', 'Goal completed', { id });
  },

  extendGoal: async (id, newEndAt) => {
    const goals = get().goals.map(g => (g.id === id ? { ...g, endAt: newEndAt } : g));
    set({ goals });
    persist(goals);
    trackEvent('goal_extended');
    logEvent('info', 'Goal extended', { id });
  },
}));
