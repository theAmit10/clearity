import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import type { HabitNotificationConfig, AdminNotificationConfig } from '../types/notification';
import { t } from '../i18n';

const CHANNEL_ID = 'habit_reminders';

export async function setupChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: t('notificationChannel.name'),
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

export async function cancelHabitNotification(id: string) {
  await notifee.cancelNotification(`habit-${id}`);
}

export async function scheduleHabitNotification(config: HabitNotificationConfig) {
  const notifId = `habit-${config.id}`;
  await notifee.cancelNotification(notifId);
  if (!config.enabled) return;

  const now = new Date();
  const scheduled = new Date(now);
  scheduled.setHours(config.hour, config.minute, 0, 0);
  if (scheduled <= now) {
    scheduled.setDate(scheduled.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id: notifId,
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

export async function cancelAdminNotification(adminId: string) {
  await notifee.cancelNotification(`admin-${adminId}`);
}

export function localizeAdminNotification(config: AdminNotificationConfig) {
  switch (config.id) {
    case 'admin-morning':
      return {
        ...config,
        title: t('defaultAdminNotifications.morningTitle'),
        body: t('defaultAdminNotifications.morningBody'),
      };
    case 'admin-afternoon':
      return {
        ...config,
        title: t('defaultAdminNotifications.afternoonTitle'),
        body: t('defaultAdminNotifications.afternoonBody'),
      };
    case 'admin-evening':
      return {
        ...config,
        title: t('defaultAdminNotifications.eveningTitle'),
        body: t('defaultAdminNotifications.eveningBody'),
      };
    default:
      return config;
  }
}

export async function scheduleAdminNotification(config: AdminNotificationConfig) {
  const localized = localizeAdminNotification(config);
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
      title: localized.title,
      body: localized.body,
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
