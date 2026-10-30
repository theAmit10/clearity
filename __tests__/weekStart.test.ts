import {
  startOfWeek,
  weekdayOffset,
  weekStartsOnCode,
  weekStartsOnFromCode,
} from '../src/services/dateUtils';
import { buildWidgetPayloadForState } from '../src/native/WidgetModule';

// 2026-10-28 is a Wednesday; the week containing it starts Mon 2026-10-26
// or Sun 2026-10-25 depending on the preference.
const wednesday = new Date(2026, 9, 28);
const sunday = new Date(2026, 9, 25);

const habits = [
  {
    id: 'h1',
    name: 'Run',
    color: '#FF0000',
    icon: 'fire',
    frequency: 'daily' as const,
    completions: {},
  },
];

describe('week start helpers', () => {
  it('startOfWeek honors monday', () => {
    expect(startOfWeek(wednesday, 'monday').getDate()).toBe(26);
    expect(startOfWeek(sunday, 'monday').getDate()).toBe(19);
  });

  it('startOfWeek honors sunday', () => {
    expect(startOfWeek(wednesday, 'sunday').getDate()).toBe(25);
    expect(startOfWeek(sunday, 'sunday').getDate()).toBe(25);
  });

  it('weekdayOffset maps both preferences', () => {
    expect(weekdayOffset(wednesday, 'monday')).toBe(2); // Wed = 3rd day
    expect(weekdayOffset(wednesday, 'sunday')).toBe(3); // Wed = 4th day
    expect(weekdayOffset(sunday, 'monday')).toBe(6); // Sun rolls to the end
    expect(weekdayOffset(sunday, 'sunday')).toBe(0);
  });

  it('encodes and decodes the widget payload value', () => {
    expect(weekStartsOnCode('monday')).toBe(1);
    expect(weekStartsOnCode('sunday')).toBe(0);
    expect(weekStartsOnFromCode(0)).toBe('sunday');
    expect(weekStartsOnFromCode(1)).toBe('monday');
    expect(weekStartsOnFromCode(undefined)).toBe('monday');
  });
});

describe('widget payload week start', () => {
  it('defaults to Monday for pro payloads', () => {
    const payload = buildWidgetPayloadForState(habits, {
      isPro: true,
      proExpired: false,
    });
    expect(payload.weekStartsOn).toBe(1);
  });

  it('carries Sunday when the user picks it', () => {
    const payload = buildWidgetPayloadForState(
      habits,
      { isPro: false, proExpired: false },
      'sunday',
    );
    expect(payload.weekStartsOn).toBe(0);
    const [y, m, d] = payload.weekStart.split('-').map(Number);
    expect(startOfWeek(new Date(y, m - 1, d), 'sunday').getDate()).toBe(d);
  });

  it('weekStart matches the preference on unlocked payloads', () => {
    const payload = buildWidgetPayloadForState(
      habits,
      { isPro: true, proExpired: false },
      'monday',
    );
    const [y, m, d] = payload.weekStart.split('-').map(Number);
    expect(startOfWeek(new Date(y, m - 1, d), 'monday').getDay()).toBe(1);
  });
});
