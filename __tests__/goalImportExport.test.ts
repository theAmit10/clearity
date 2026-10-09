jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
}));

jest.mock('../src/services/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn().mockResolvedValue(undefined),
  requestPermission: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  AndroidImportance: { HIGH: 'high' },
  EventType: { PRESS: 'press', ACTION_PRESS: 'action_press' },
  RepeatFrequency: { DAILY: 'daily' },
  TriggerType: { TIMESTAMP: 'timestamp' },
}));

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
}));

jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: '',
  REVENUECAT_API_KEY: '',
}));

import { useGoalStore } from '../src/store/goalStore';
import { useHabitStore } from '../src/store/habitStore';
import { trackEvent } from '../src/services/analytics';
import type { Goal } from '../src/types/goal';

const trackEventMock = trackEvent as jest.Mock;

function futureGoal(overrides: Partial<Goal> = {}): Goal {
  const now = Date.now();
  return {
    id: 'goal-1',
    title: 'Test Goal',
    icon: '🎯',
    color: '#FF0000',
    startAt: new Date(now - 1000).toISOString(),
    endAt: new Date(now + 30 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    createdAt: new Date(now - 1000).toISOString(),
    ...overrides,
  };
}

function resetStore() {
  useGoalStore.setState({ goals: [], goalNotifications: [], loaded: true });
  jest.clearAllMocks();
}

describe('goalStore import (replace/merge)', () => {
  beforeEach(resetStore);

  it('replaceAllGoals replaces goals and tracks goals_imported', async () => {
    useGoalStore.setState({ goals: [futureGoal({ id: 'old' })], goalNotifications: [] });
    const incoming = [futureGoal({ id: 'new-1' }), futureGoal({ id: 'new-2' })];
    await useGoalStore.getState().replaceAllGoals(incoming);
    const state = useGoalStore.getState();
    expect(state.goals.map(g => g.id).sort()).toEqual(['new-1', 'new-2']);
    expect(trackEventMock).toHaveBeenCalledWith('goals_imported', {
      count: 2,
      type: 'replace',
    });
  });

  it('mergeGoals unions by id with incoming winning', async () => {
    const existing = futureGoal({ id: 'same', title: 'Old title' });
    useGoalStore.setState({ goals: [existing], goalNotifications: [] });
    const incoming = [
      futureGoal({ id: 'same', title: 'New title' }),
      futureGoal({ id: 'added', title: 'Added' }),
    ];
    await useGoalStore.getState().mergeGoals(incoming);
    const state = useGoalStore.getState();
    expect(state.goals).toHaveLength(2);
    expect(state.goals.find(g => g.id === 'same')?.title).toBe('New title');
    expect(trackEventMock).toHaveBeenCalledWith('goals_imported', {
      count: 2,
      type: 'merge',
    });
  });

  it('replaceAllGoals with empty list clears goals', async () => {
    useHabitStore.setState({ isPro: false });
    useGoalStore.setState({ goals: [futureGoal()], goalNotifications: [] });
    await useGoalStore.getState().replaceAllGoals([]);
    expect(useGoalStore.getState().goals).toEqual([]);
  });
});

describe('goalStore Pro locks', () => {
  const seedExpiredWithThree = () => {
    useHabitStore.setState({ isPro: false });
    useGoalStore.setState({
      goals: [1, 2, 3].map(n =>
        futureGoal({
          id: `g${n}`,
          createdAt: `2026-0${n}-01T00:00:00.000Z`,
        }),
      ),
      goalNotifications: [],
    });
  };

  it('blocks complete/update/extend on locked goals', async () => {
    seedExpiredWithThree();
    const s = useGoalStore.getState();
    await expect(s.completeGoal('g3')).rejects.toThrow();
    await expect(s.updateGoal('g3', { title: 'Changed' })).rejects.toThrow();
    await expect(
      s.extendGoal('g3', new Date(Date.now() + 60 * 86400000).toISOString()),
    ).rejects.toThrow();
    expect(
      useGoalStore.getState().goals.find(g => g.id === 'g3')?.status,
    ).toBe('active');
  });

  it('allows free goals and deleting locked ones (auto-promote)', async () => {
    seedExpiredWithThree();
    await useGoalStore.getState().completeGoal('g1');
    expect(
      useGoalStore.getState().goals.find(g => g.id === 'g1')?.status,
    ).toBe('completed');
    // Complete removes its notifications; deleting the locked goal frees all.
    await useGoalStore.getState().deleteGoal('g3');
    await useGoalStore.getState().updateGoal('g2', { title: 'Edited' });
    expect(
      useGoalStore.getState().goals.find(g => g.id === 'g2')?.title,
    ).toBe('Edited');
  });

  it('lets Pro users touch every goal', async () => {
    seedExpiredWithThree();
    useHabitStore.setState({ isPro: true });
    await useGoalStore.getState().completeGoal('g3');
    expect(
      useGoalStore.getState().goals.find(g => g.id === 'g3')?.status,
    ).toBe('completed');
  });
});
