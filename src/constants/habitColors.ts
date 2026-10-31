/**
 * Full habit color catalog, grouped for the "See all" color sheet.
 *
 * The inline quick-pick row on Add/Edit Habit uses `QUICK_PICK_COLORS`
 * (kept byte-identical to the previous inline list so existing selections
 * and layout don't shift); everything else is reachable through the sheet.
 * Every catalog entry is unique across groups — `ALL_HABIT_COLORS` is the
 * flattened, de-duplicated source the sheet renders.
 */

export interface HabitColorOption {
  /** Uppercase 7-char hex, e.g. `#FF3B30`. */
  hex: string;
  /** Display name shown under the swatch in the sheet. */
  name: string;
}

export interface ColorGroup {
  key: string;
  colors: HabitColorOption[];
}

/** Inline quick picks — the original 27 swatches, same order as before. */
export const QUICK_PICK_COLORS: readonly string[] = [
  '#FF3B30', '#FF5A5F', '#FF6B35', '#FF9500',
  '#FFCC00', '#FFD60A', '#4CD964', '#34C759', '#30D158',
  '#00C7BE', '#00E5A0', '#32ADE6', '#64D2FF', '#007AFF', '#0A84FF',
  '#5856D6', '#5E5CE6', '#AF52DE', '#BF5AF2',
  '#FF2D55', '#FF375F',
  '#A2845E', '#C2703D', '#556B2F', '#2E7D32',
  '#8E8E93', '#6E6E73', '#48484A',
];

export const COLOR_GROUPS: readonly ColorGroup[] = [
  {
    key: 'red',
    colors: [
      { hex: '#FF3B30', name: 'Red' },
      { hex: '#FF5A5F', name: 'Coral' },
      { hex: '#E63946', name: 'Crimson' },
      { hex: '#D62828', name: 'Scarlet' },
      { hex: '#FF6B6B', name: 'Watermelon' },
      { hex: '#8B1A1A', name: 'Dark Red' },
    ],
  },
  {
    key: 'orange',
    colors: [
      { hex: '#FF6B35', name: 'Vermilion' },
      { hex: '#FF9500', name: 'Orange' },
      { hex: '#FF7A00', name: 'Bright Orange' },
      { hex: '#FFA340', name: 'Tangerine' },
      { hex: '#CC5500', name: 'Burnt Orange' },
    ],
  },
  {
    key: 'yellow',
    colors: [
      { hex: '#FFCC00', name: 'Amber' },
      { hex: '#FFD60A', name: 'Yellow' },
      { hex: '#FFE066', name: 'Lemon' },
      { hex: '#F4D03F', name: 'Sunflower' },
      { hex: '#DAA520', name: 'Goldenrod' },
    ],
  },
  {
    key: 'green',
    colors: [
      { hex: '#4CD964', name: 'Light Green' },
      { hex: '#34C759', name: 'Green' },
      { hex: '#30D158', name: 'Emerald' },
      { hex: '#00E5A0', name: 'Mint' },
      { hex: '#556B2F', name: 'Olive' },
      { hex: '#2E7D32', name: 'Forest' },
      { hex: '#1B5E20', name: 'Pine' },
      { hex: '#A8D5A2', name: 'Sage' },
    ],
  },
  {
    key: 'teal',
    colors: [
      { hex: '#00C7BE', name: 'Teal' },
      { hex: '#2EC4B6', name: 'Turquoise' },
      { hex: '#00BCD4', name: 'Cyan' },
      { hex: '#4DD0E1', name: 'Aqua' },
      { hex: '#00838F', name: 'Dark Teal' },
    ],
  },
  {
    key: 'blue',
    colors: [
      { hex: '#32ADE6', name: 'Sky Blue' },
      { hex: '#64D2FF', name: 'Light Blue' },
      { hex: '#007AFF', name: 'Blue' },
      { hex: '#0A84FF', name: 'Royal Blue' },
      { hex: '#1E88E5', name: 'Azure' },
      { hex: '#0056B3', name: 'Dark Blue' },
      { hex: '#5AC8FA', name: 'Ice Blue' },
    ],
  },
  {
    key: 'indigo',
    colors: [
      { hex: '#5856D6', name: 'Indigo' },
      { hex: '#5E5CE6', name: 'Periwinkle' },
      { hex: '#3F51B5', name: 'Cobalt' },
      { hex: '#283593', name: 'Deep Indigo' },
    ],
  },
  {
    key: 'purple',
    colors: [
      { hex: '#AF52DE', name: 'Purple' },
      { hex: '#BF5AF2', name: 'Violet' },
      { hex: '#9575CD', name: 'Lavender' },
      { hex: '#7B1FA2', name: 'Grape' },
      { hex: '#4A148C', name: 'Plum' },
    ],
  },
  {
    key: 'pink',
    colors: [
      { hex: '#FF2D55', name: 'Pink' },
      { hex: '#FF375F', name: 'Rose' },
      { hex: '#FF6B9D', name: 'Bubblegum' },
      { hex: '#F48FB1', name: 'Blush' },
      { hex: '#C2185B', name: 'Magenta' },
    ],
  },
  {
    key: 'brown',
    colors: [
      { hex: '#A2845E', name: 'Tan' },
      { hex: '#C2703D', name: 'Brown' },
      { hex: '#8D6E63', name: 'Light Brown' },
      { hex: '#6F4E37', name: 'Coffee' },
      { hex: '#5D4037', name: 'Chocolate' },
    ],
  },
  {
    key: 'gray',
    colors: [
      { hex: '#8E8E93', name: 'Gray' },
      { hex: '#6E6E73', name: 'Mid Gray' },
      { hex: '#48484A', name: 'Dark Gray' },
      { hex: '#3A3A3C', name: 'Charcoal' },
      { hex: '#C7C7CC', name: 'Silver' },
      { hex: '#D1D1D6', name: 'Light Gray' },
    ],
  },
];

/** Flattened catalog with hex uniqueness enforced (first group wins). */
export const ALL_HABIT_COLORS: readonly HabitColorOption[] = (() => {
  const seen = new Set<string>();
  const all: HabitColorOption[] = [];
  for (const group of COLOR_GROUPS) {
    for (const option of group.colors) {
      if (seen.has(option.hex)) continue;
      seen.add(option.hex);
      all.push(option);
    }
  }
  return all;
})();

/** Inline quick picks, plus the selected color when it lives in the full
 * catalog only — so a color picked from the sheet is never invisible. */
export function getQuickPickColors(selectedHex?: string): readonly string[] {
  if (
    !selectedHex ||
    QUICK_PICK_COLORS.includes(selectedHex.toUpperCase())
  ) {
    return QUICK_PICK_COLORS;
  }
  return [...QUICK_PICK_COLORS, selectedHex];
}
