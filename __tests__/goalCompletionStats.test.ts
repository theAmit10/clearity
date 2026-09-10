import { getGoalCompletionStats, formatDuration, getTimelineBounds } from '../src/services/goalUtils';

const HOUR = 3600_000;
const DAY = 86400_000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

describe('getGoalCompletionStats', () => {
  const start = Date.parse('2026-01-01T00:00:00Z');
  const end = start + 10 * DAY;

  it('reports early completion with negative delay', () => {
    const done = end - 2 * DAY;
    const s = getGoalCompletionStats({
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(done),
    });
    expect(s.verdict).toBe('early');
    expect(s.delayMs).toBe(-2 * DAY);
    expect(s.takenMs).toBe(8 * DAY);
    expect(s.allottedMs).toBe(10 * DAY);
    expect(s.efficiencyPct).toBeCloseTo(125);
    expect(s.usedPct).toBeCloseTo(80);
  });

  it('reports on_time when finished within the final hour', () => {
    const done = end - 30 * 60_000;
    const s = getGoalCompletionStats({
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(done),
    });
    expect(s.verdict).toBe('on_time');
    expect(s.delayMs).toBe(-30 * 60_000);
  });

  it('reports late completion with positive delay', () => {
    const done = end + 2 * DAY + 3 * HOUR;
    const s = getGoalCompletionStats({
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(done),
    });
    expect(s.verdict).toBe('late');
    expect(s.delayMs).toBe(2 * DAY + 3 * HOUR);
    expect(s.efficiencyPct).toBeLessThan(100);
    expect(s.usedPct).toBeGreaterThan(100);
  });

  it('handles exact-deadline completion as on_time', () => {
    const s = getGoalCompletionStats({
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(end),
    });
    expect(s.verdict).toBe('on_time');
    expect(s.delayMs).toBe(0);
    expect(s.efficiencyPct).toBeCloseTo(100);
  });
});

describe('formatDuration', () => {
  it('formats days, hours, minutes and seconds', () => {
    expect(formatDuration(2 * DAY + 4 * HOUR)).toBe('2d 4h');
    expect(formatDuration(3 * HOUR + 12 * 60_000)).toBe('3h 12m');
    expect(formatDuration(45 * 60_000)).toBe('45m');
    expect(formatDuration(30_000)).toBe('30s');
  });

  it('uses absolute value for negative input', () => {
    expect(formatDuration(-(2 * DAY))).toBe('2d 0h');
  });
});

describe('getTimelineBounds', () => {
  const created = Date.parse('2025-12-28T00:00:00Z');
  const start = Date.parse('2026-01-01T00:00:00Z');
  const end = Date.parse('2026-01-11T00:00:00Z');

  it('spans from creation when created before start', () => {
    const b = getTimelineBounds({
      createdAt: iso(created),
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(end - DAY),
    });
    expect(b.t0).toBe(created);
    expect(b.t1).toBe(end);
  });

  it('spans from start when creation came later', () => {
    const b = getTimelineBounds({
      createdAt: iso(start + HOUR),
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(end),
    });
    expect(b.t0).toBe(start);
    expect(b.t1).toBe(end);
  });

  it('extends past the deadline when finished late', () => {
    const done = end + 2 * DAY;
    const b = getTimelineBounds({
      createdAt: iso(start),
      startAt: iso(start),
      endAt: iso(end),
      completedAt: iso(done),
    });
    expect(b.t1).toBe(done);
  });
});
