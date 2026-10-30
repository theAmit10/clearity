// Minimal date helpers — avoids pulling in date-fns/moment to keep the app light.

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** User-selectable first day of the week (Settings → Week Starts On). */
export type WeekStartDay = 'monday' | 'sunday';

/** Days since the week's start weekday for `d` (0 = week's first day). */
export function weekdayOffset(d: Date, startDay: WeekStartDay): number {
  const day = d.getDay(); // 0 = Sunday
  if (startDay === 'monday') return day === 0 ? 6 : day - 1;
  return day;
}

/** First day (local midnight) of the week containing `d`. */
export function startOfWeek(d: Date, startDay: WeekStartDay = 'sunday'): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - weekdayOffset(copy, startDay));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Wire encoding for the widget payload: 0 = Sunday, 1 = Monday. */
export function weekStartsOnCode(startDay: WeekStartDay): 0 | 1 {
  return startDay === 'monday' ? 1 : 0;
}

/** Inverse of weekStartsOnCode; anything unknown falls back to Monday. */
export function weekStartsOnFromCode(code: number | null | undefined): WeekStartDay {
  return code === 0 ? 'sunday' : 'monday';
}

// Returns an array of Date objects, oldest first, ending today,
// covering `weeks` full weeks (used for the GitHub-style heatmap).
export function lastNWeeksGrid(weeks: number): Date[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = startOfWeek(today);
  const start = addDays(end, -7 * (weeks - 1));

  const grid: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(start, w * 7 + d));
    }
    grid.push(week);
  }
  return grid;
}

export function isFuture(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}
