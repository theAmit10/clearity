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

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
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
