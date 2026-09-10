import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType,
} from '@notifee/react-native';
import type { HabitNotificationConfig, AdminNotificationConfig, GoalNotificationConfig, GoalNotificationKind } from '../types/notification';
import type { Goal } from '../types/goal';
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

export interface GoalAutoTimes {
  tenSecond: number;
  halfway: number;
  almostDue: number;
}

/** Fire times for the three automated goal reminders. Callers skip any
 * time that is already in the past (e.g. very short goals). */
export function computeGoalAutoTimes(goal: Pick<Goal, 'startAt' | 'endAt' | 'createdAt'>): GoalAutoTimes {
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.endAt).getTime();
  const created = new Date(goal.createdAt).getTime();
  const span = Math.max(0, end - start);
  return {
    tenSecond: created + 10 * 1000,
    halfway: start + span * 0.5,
    almostDue: start + span * 0.95,
  };
}

export function buildGoalAutoText(goal: Pick<Goal, 'title'>, kind: GoalNotificationKind): { title: string; body: string } {
  switch (kind) {
    case 'ten_second':
      return { title: t('goalNotifications.createdTitle'), body: t('goalNotifications.createdBody', { title: goal.title }) };
    case 'halfway':
      return { title: t('goalNotifications.halfwayTitle'), body: t('goalNotifications.halfwayBody', { title: goal.title }) };
    case 'almost_due':
      return { title: t('goalNotifications.almostDueTitle'), body: t('goalNotifications.almostDueBody', { title: goal.title }) };
    default:
      return { title: goal.title, body: '' };
  }
}

export function goalNotifId(config: Pick<GoalNotificationConfig, 'id'>): string {
  return `goal-${config.id}`;
}

export async function scheduleGoalNotification(config: GoalNotificationConfig) {
  const notifId = goalNotifId(config);
  await notifee.cancelNotification(notifId);
  if (!config.enabled) return;
  if (config.timestamp <= Date.now()) return;

  await notifee.createTriggerNotification(
    {
      id: notifId,
      title: config.title,
      body: config.body,
      android: { channelId: CHANNEL_ID },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: config.timestamp,
    },
  );
}

export async function cancelGoalNotification(id: string) {
  await notifee.cancelNotification(`goal-${id}`);
}

export async function cancelAllGoalNotifications(goalId: string, configs: GoalNotificationConfig[]) {
  await Promise.all(configs.filter(c => c.goalId === goalId).map(c => cancelGoalNotification(c.id)));
}

export async function rescheduleGoalNotifications(configs: GoalNotificationConfig[]) {
  await Promise.all(configs.map(c => scheduleGoalNotification(c)));
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
