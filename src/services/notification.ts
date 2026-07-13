import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
  EventType,
  type TriggerNotification,
} from '@notifee/react-native';
import type { HabitNotificationConfig, AdminNotificationConfig } from '../types/notification';

const CHANNEL_ID = 'habit_reminders';
const CHANNEL_NAME = 'Habit Reminders';

export async function setupChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
  });
}

export async function requestPermission() {
  await notifee.requestPermission();
}

export function onNotificationEvent(callback: (event: any) => void) {
  return notifee.onForegroundEvent(event => {
    callback(event);
  });
}

export function onBackgroundEvent(callback: (event: any) => void) {
  notifee.onBackgroundEvent(async event => {
    callback(event);
  });
}

export async function cancelHabitNotification(habitId: string) {
  await notifee.cancelNotification(`habit-${habitId}`);
}

export async function scheduleHabitNotification(config: HabitNotificationConfig) {
  const id = `habit-${config.habitId}`;
  await notifee.cancelNotification(id);
  if (!config.enabled) return;

  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(config.hour, config.minute, 0, 0);
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id,
      title: config.title,
      body: 'Time to work on your habit!',
      android: { channelId: CHANNEL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: scheduled.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    },
  );
}

export async function cancelAdminNotification(adminId: string) {
  await notifee.cancelNotification(`admin-${adminId}`);
}

export async function scheduleAdminNotification(config: AdminNotificationConfig) {
  const id = `admin-${config.id}`;
  await notifee.cancelNotification(id);
  if (!config.enabled) return;

  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(config.hour, config.minute, 0, 0);
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id,
      title: config.title,
      body: config.body,
      android: { channelId: CHANNEL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: scheduled.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    },
  );
}

export async function cancelAllNotifications() {
  await notifee.cancelAllNotifications();
}

export async function rescheduleAll(
  habitConfigs: HabitNotificationConfig[],
  adminConfigs: AdminNotificationConfig[],
) {
  await notifee.cancelAllNotifications();
  const jobs = [
    ...habitConfigs.map(c => scheduleHabitNotification(c)),
    ...adminConfigs.map(c => scheduleAdminNotification(c)),
  ];
  await Promise.all(jobs);
}

export const DEFAULT_ADMIN_NOTIFICATIONS: AdminNotificationConfig[] = [
  {
    id: 'admin-morning',
    enabled: false,
    title: 'Good morning!',
    body: 'Start your day strong — check your habits!',
    hour: 8,
    minute: 0,
  },
  {
    id: 'admin-afternoon',
    enabled: false,
    title: 'Keep going!',
    body: 'You are halfway through the day. Stay on track!',
    hour: 14,
    minute: 0,
  },
  {
    id: 'admin-evening',
    enabled: false,
    title: 'Evening reflection',
    body: 'How did you do today? Review your habits.',
    hour: 20,
    minute: 0,
  },
];
