export type GoalStatus = 'active' | 'completed';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  startAt: string;
  endAt: string;
  status: GoalStatus;
  completedAt?: string;
  createdAt: string;
}
