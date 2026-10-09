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

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
}));

jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: '',
  REVENUECAT_API_KEY: '',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useHabitStore,
  __resetWidgetReloadThrottleForTests,
} from '../src/store/habitStore';
import { WidgetModule } from '../src/native/WidgetModule';
import { Habit } from '../src/types/habit';

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'test-1',
  name: 'Test Habit',
  icon: '💪',
  color: '#FF5733',
  frequency: 'daily',
  category: 'none',
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
    habitNotifications: [],
    adminNotifications: [],
    customCategories: [],
  });
});

describe('habitStore', () => {
  it('initializes with empty state', () => {
    const state = useHabitStore.getState();
    expect(state.habits).toEqual([]);
    expect(state.loaded).toBe(false);
    expect(state.reviewPromptShown).toBe(false);
    expect(state.habitNotifications).toEqual([]);
    expect(state.adminNotifications).toEqual([]);
  });

  it('adds a habit', async () => {
    await useHabitStore.getState().addHabit({
      name: 'Test',
      icon: '💪',
      color: '#FF5733',
      frequency: 'daily',
      category: 'none',
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
      category: 'none',
    });
    const id = useHabitStore.getState().habits[0].id;
    await useHabitStore.getState().toggleCompletion(id, '2026-07-13');
    expect(useHabitStore.getState().habits[0].completions['2026-07-13']).toBe(1);
  });
});

describe('habitStore Pro locks', () => {
  const seedExpiredWithFive = () => {
    useHabitStore.setState({
      habits: [1, 2, 3, 4, 5].map(n =>
        makeHabit({
          id: `h${n}`,
          createdAt: `2026-0${n}-01T00:00:00.000Z`,
        }),
      ),
      isPro: false,
      proExpired: true,
    });
  };

  it('blocks toggle/update/decrement on locked habits', async () => {
    seedExpiredWithFive();
    const s = useHabitStore.getState();
    await expect(s.toggleCompletion('h5', '2026-07-13')).rejects.toThrow();
    await expect(s.updateHabit('h5', { name: 'Changed' })).rejects.toThrow();
    await expect(
      s.decrementCompletion('h5', '2026-07-13'),
    ).rejects.toThrow();
    expect(
      useHabitStore.getState().habits.find(h => h.id === 'h5')?.name,
    ).not.toBe('Changed');
  });

  it('allows free habits and deleting locked ones (auto-promote)', async () => {
    seedExpiredWithFive();
    await useHabitStore.getState().toggleCompletion('h1', '2026-07-13');
    expect(
      useHabitStore.getState().habits.find(h => h.id === 'h1')?.completions[
        '2026-07-13'
      ],
    ).toBe(1);
    await useHabitStore.getState().deleteHabit('h5');
    // 4 remain → nothing locked; the previously-locked h4 works.
    await useHabitStore.getState().toggleCompletion('h4', '2026-07-14');
    expect(
      useHabitStore.getState().habits.find(h => h.id === 'h4')?.completions[
        '2026-07-14'
      ],
    ).toBe(1);
  });

  it('lets Pro users touch every habit', async () => {
    seedExpiredWithFive();
    useHabitStore.setState({ isPro: true, proExpired: false });
    await useHabitStore.getState().toggleCompletion('h5', '2026-07-13');
    expect(
      useHabitStore.getState().habits.find(h => h.id === 'h5')?.completions[
        '2026-07-13'
      ],
    ).toBe(1);
  });
});

describe('habitStore applyProState', () => {
  const seedExpiredWithFive = () => {
    useHabitStore.setState({
      habits: [1, 2, 3, 4, 5].map(n =>
        makeHabit({
          id: `h${n}`,
          createdAt: `2026-0${n}-01T00:00:00.000Z`,
        }),
      ),
      isPro: false,
      proExpired: true,
    });
  };

  it('pushes an unlocked widget payload on renew', () => {
    seedExpiredWithFive();
    const spy = jest.spyOn(WidgetModule, 'updateWidgetData');
    try {
      useHabitStore.getState().applyProState({ isPro: true, proExpired: false });
      expect(useHabitStore.getState().isPro).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({ locked: false });
      expect(spy.mock.calls[0][0].habits).toHaveLength(5);
    } finally {
      spy.mockRestore();
    }
  });

  it('pushes a locked widget payload on expiry', () => {
    useHabitStore.setState({ habits: [], isPro: true, proExpired: false });
    const spy = jest.spyOn(WidgetModule, 'updateWidgetData');
    try {
      useHabitStore
        .getState()
        .applyProState({ isPro: false, proExpired: true });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({
        locked: true,
        lockMode: 'expired',
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('skips the widget push when state is unchanged', () => {
    seedExpiredWithFive();
    const spy = jest.spyOn(WidgetModule, 'updateWidgetData');
    try {
      useHabitStore
        .getState()
        .applyProState({ isPro: false, proExpired: true });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('always writes widget data but coalesces rapid reloads', () => {
    seedExpiredWithFive();
    __resetWidgetReloadThrottleForTests();
    const dataSpy = jest.spyOn(WidgetModule, 'updateWidgetData');
    const reloadSpy = jest.spyOn(WidgetModule, 'reloadWidget');
    try {
      // Renew transition: write + reload.
      useHabitStore.getState().applyProState({ isPro: true, proExpired: false });
      // Immediate expiry transition: data written, reload throttled.
      useHabitStore
        .getState()
        .applyProState({ isPro: false, proExpired: true });
      expect(dataSpy).toHaveBeenCalledTimes(2);
      expect(reloadSpy).toHaveBeenCalledTimes(1);
      expect(dataSpy.mock.calls[1][0]).toMatchObject({ locked: true });
    } finally {
      dataSpy.mockRestore();
      reloadSpy.mockRestore();
    }
  });

  it('resyncWidget forces a reload with current state', () => {
    seedExpiredWithFive();
    __resetWidgetReloadThrottleForTests();
    const dataSpy = jest.spyOn(WidgetModule, 'updateWidgetData');
    const reloadSpy = jest.spyOn(WidgetModule, 'reloadWidget');
    try {
      useHabitStore.getState().resyncWidget();
      useHabitStore.getState().resyncWidget();
      // Forced reloads bypass the throttle; payload reflects locked state.
      expect(dataSpy).toHaveBeenCalledTimes(2);
      expect(reloadSpy).toHaveBeenCalledTimes(2);
      expect(dataSpy.mock.calls[0][0]).toMatchObject({
        locked: true,
        lockMode: 'expired',
      });
    } finally {
      dataSpy.mockRestore();
      reloadSpy.mockRestore();
    }
  });
});
