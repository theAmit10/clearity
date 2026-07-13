export interface HabitNotificationConfig {
  habitId: string;
  enabled: boolean;
  title: string;
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

export interface NotificationStoreData {
  habitNotifications: Record<string, HabitNotificationConfig>;
  adminNotifications: AdminNotificationConfig[];
}
