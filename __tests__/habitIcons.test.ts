import {
  HABIT_ICONS,
  HABIT_ICON_QUICK_PICKS,
  ICON_CATEGORIES,
  getHabitIcon,
  getQuickPickIcons,
} from '../src/constants/habitIcons';

describe('habit icon catalog', () => {
  it('has unique, non-empty keys', () => {
    const keys = HABIT_ICONS.map(icon => icon.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every(key => key.length > 0)).toBe(true);
  });

  it('gives every icon a display name and a known category', () => {
    HABIT_ICONS.forEach(icon => {
      expect(icon.name.trim().length).toBeGreaterThan(0);
      expect(ICON_CATEGORIES).toContain(icon.category);
    });
  });

  it('resolves every quick pick to a catalog entry', () => {
    const quickPicks = getQuickPickIcons();
    expect(quickPicks).toHaveLength(HABIT_ICON_QUICK_PICKS.length);
    quickPicks.forEach(icon => expect(icon).toBeDefined());
  });

  it('appends a selected icon that lives only in the full catalog', () => {
    const quickPicks = getQuickPickIcons('cash');
    expect(quickPicks.map(icon => icon.key)).toContain('cash');
    expect(quickPicks).toHaveLength(HABIT_ICON_QUICK_PICKS.length + 1);
  });

  it('does not duplicate a selected icon that is already a quick pick', () => {
    expect(getQuickPickIcons('fire')).toHaveLength(HABIT_ICON_QUICK_PICKS.length);
  });

  it('falls back to the fire icon for unknown keys', () => {
    expect(getHabitIcon('not-a-real-icon')).toBe(getHabitIcon('fire'));
  });
});
