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

import notifee from '@notifee/react-native';
import { useGoalStore } from '../src/store/goalStore';
import { computeGoalAutoTimes } from '../src/services/notification';

const createTrigger = notifee.createTriggerNotification as jest.Mock;
const cancelNotification = notifee.cancelNotification as jest.Mock;

function resetStore() {
  useGoalStore.setState({ goals: [], goalNotifications: [], loaded: true });
  jest.clearAllMocks();
}

describe('computeGoalAutoTimes', () => {
  it('computes 10s, 50% and 95% fire times', () => {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    const end = new Date('2026-01-11T00:00:00Z').getTime();
    const created = new Date('2026-01-01T00:00:00Z').getTime();
    const times = computeGoalAutoTimes({
      startAt: new Date(start).toISOString(),
      endAt: new Date(end).toISOString(),
      createdAt: new Date(created).toISOString(),
    });
    expect(times.tenSecond).toBe(created + 10_000);
    expect(times.halfway).toBe(start + (end - start) * 0.5);
    expect(times.almostDue).toBe(start + (end - start) * 0.95);
  });
});

describe('goal notification scheduling', () => {
  beforeEach(resetStore);

  it('schedules all three automated reminders on goal creation', async () => {
    const now = Date.now();
    await useGoalStore.getState().addGoal({
      title: 'Test goal',
      icon: 'fire',
      color: '#FF3B30',
      startAt: new Date(now - 3600_000).toISOString(),
      endAt: new Date(now + 9 * 3600_000).toISOString(),
    });
    const notifs = useGoalStore.getState().goalNotifications;
    expect(notifs).toHaveLength(3);
    expect(createTrigger).toHaveBeenCalledTimes(3);
    const kinds = notifs.map(n => n.kind).sort();
    expect(kinds).toEqual(['almost_due', 'halfway', 'ten_second']);
  });

  it('skips automated reminders whose time already passed', async () => {
    const now = Date.now();
    await useGoalStore.getState().addGoal({
      title: 'Short goal',
      icon: 'fire',
      color: '#FF3B30',
      // 10-day window ending in a minute: 50% and 95% are in the past
      startAt: new Date(now - 10 * 86400_000).toISOString(),
      endAt: new Date(now + 60_000).toISOString(),
    });
    const notifs = useGoalStore.getState().goalNotifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].kind).toBe('ten_second');
    expect(createTrigger).toHaveBeenCalledTimes(1);
  });

  it('cancels all reminders when a goal is completed', async () => {
    const now = Date.now();
    await useGoalStore.getState().addGoal({
      title: 'Done goal',
      icon: 'fire',
      color: '#FF3B30',
      startAt: new Date(now - 3600_000).toISOString(),
      endAt: new Date(now + 9 * 3600_000).toISOString(),
    });
    const goalId = useGoalStore.getState().goals[0].id;
    await useGoalStore.getState().addGoalReminder(goalId, {
      title: 'Custom',
      body: 'body',
      timestamp: now + 3600_000,
    });
    expect(useGoalStore.getState().goalNotifications).toHaveLength(4);

    cancelNotification.mockClear();
    await useGoalStore.getState().completeGoal(goalId);
    expect(useGoalStore.getState().goalNotifications).toHaveLength(0);
    expect(cancelNotification).toHaveBeenCalledTimes(4);
  });

  it('adds and removes custom reminders', async () => {
    const now = Date.now();
    await useGoalStore.getState().addGoal({
      title: 'Custom goal',
      icon: 'fire',
      color: '#FF3B30',
      startAt: new Date(now - 3600_000).toISOString(),
      endAt: new Date(now + 9 * 3600_000).toISOString(),
    });
    const goalId = useGoalStore.getState().goals[0].id;
    createTrigger.mockClear();

    await useGoalStore.getState().addGoalReminder(goalId, {
      title: 'Check in',
      body: 'How is it going?',
      timestamp: now + 2 * 3600_000,
    });
    expect(createTrigger).toHaveBeenCalledTimes(1);
    const reminderId = useGoalStore
      .getState()
      .goalNotifications.find(n => n.kind === 'custom')!.id;

    cancelNotification.mockClear();
    await useGoalStore.getState().removeGoalReminder(reminderId);
    expect(cancelNotification).toHaveBeenCalledTimes(1);
    expect(
      useGoalStore.getState().goalNotifications.find(n => n.id === reminderId),
    ).toBeUndefined();
  });

  it('reschedules automated reminders when the deadline is extended', async () => {
    const now = Date.now();
    await useGoalStore.getState().addGoal({
      title: 'Extend goal',
      icon: 'fire',
      color: '#FF3B30',
      startAt: new Date(now - 3600_000).toISOString(),
      endAt: new Date(now + 9 * 3600_000).toISOString(),
    });
    const goalId = useGoalStore.getState().goals[0].id;
    const before = useGoalStore
      .getState()
      .goalNotifications.find(n => n.kind === 'halfway')!.timestamp;

    cancelNotification.mockClear();
    await useGoalStore
      .getState()
      .extendGoal(goalId, new Date(now + 19 * 3600_000).toISOString());

    // old autos cancelled (3) + cancel-before-schedule for the 3 new ones
    expect(cancelNotification).toHaveBeenCalledTimes(6);
    const after = useGoalStore
      .getState()
      .goalNotifications.find(n => n.kind === 'halfway')!.timestamp;
    expect(after).toBeGreaterThan(before);
  });
});
