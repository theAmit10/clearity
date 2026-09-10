export interface HabitNotificationConfig {
  id: string;
  habitId: string;
  enabled: boolean;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export interface AdminNotificationConfig {
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export type GoalNotificationKind = 'ten_second' | 'halfway' | 'almost_due' | 'custom';

export interface GoalNotificationConfig {
  id: string;
  goalId: string;
  kind: GoalNotificationKind;
  enabled: boolean;
  title: string;
  body: string;
  timestamp: number;
}

export interface NotificationStoreData {
  habitNotifications: HabitNotificationConfig[];
  adminNotifications: AdminNotificationConfig[];
  goalNotifications?: GoalNotificationConfig[];
}
