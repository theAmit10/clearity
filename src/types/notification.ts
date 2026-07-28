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

export interface NotificationStoreData {
  habitNotifications: HabitNotificationConfig[];
  adminNotifications: AdminNotificationConfig[];
}
