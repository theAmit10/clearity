jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHabitStore } from '../src/store/habitStore';
import { Habit } from '../src/types/habit';

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'test-1',
  name: 'Test Habit',
  icon: '💪',
  color: '#FF5733',
  frequency: 'daily',
  createdAt: '2026-01-01T00:00:00.000Z',
  archived: false,
  completions: {},
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  useHabitStore.setState({
    habits: [],
    loaded: false,
    reviewPromptShown: false,
    habitNotifications: {},
    adminNotifications: [],
  });
});

describe('habitStore', () => {
  it('initializes with empty state', () => {
    const state = useHabitStore.getState();
    expect(state.habits).toEqual([]);
    expect(state.loaded).toBe(false);
    expect(state.reviewPromptShown).toBe(false);
    expect(state.habitNotifications).toEqual({});
    expect(state.adminNotifications).toEqual([]);
  });

  it('adds a habit', async () => {
    await useHabitStore.getState().addHabit({
      name: 'Test',
      icon: '💪',
      color: '#FF5733',
      frequency: 'daily',
    });
    const { habits } = useHabitStore.getState();
    expect(habits).toHaveLength(1);
    expect(habits[0].name).toBe('Test');
  });

  it('toggles completion', async () => {
    await useHabitStore.getState().addHabit({
      name: 'Test',
      icon: '💪',
      color: '#FF5733',
      frequency: 'daily',
    });
    const id = useHabitStore.getState().habits[0].id;
    await useHabitStore.getState().toggleCompletion(id, '2026-07-13');
    expect(useHabitStore.getState().habits[0].completions['2026-07-13']).toBe(true);
  });
});
