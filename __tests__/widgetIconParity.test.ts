import { HABIT_ICONS } from '../src/constants/habitIcons';

// tsconfig only loads jest's globals, so declare the small slice of Node this
// test needs instead of pulling @types/node into the app compile.
declare const require: (id: string) => any;
declare const __dirname: string;

const fs = require('fs') as { readFileSync: (p: string, enc: string) => string };
const path = require('path') as { join: (...parts: string[]) => string };

/**
 * The OS widgets render habit icons natively (SwiftUI on iOS, Canvas on
 * Android) and each platform keeps its own key -> glyph table. Those tables
 * are copies of the catalog, so they silently went stale once before: every
 * icon added after the original 50 showed the habit's first letter instead.
 *
 * These tests read the native sources and fail as soon as the catalog and the
 * widget tables drift apart.
 */

const root = path.join(__dirname, '..');
const swiftPath = path.join(root, 'ios/HabitTrackerWidget/TodayRingsShared.swift');
const kotlinPath = path.join(
  root,
  'android/app/src/main/java/com/codethenic/habita/widget/RingsWidgetStore.kt',
);

const catalogKeys = HABIT_ICONS.map(icon => icon.key);

function sliceBlock(source: string, start: RegExp, end: RegExp): string {
  const startMatch = start.exec(source);
  if (!startMatch) throw new Error(`Could not find block start: ${start}`);
  const rest = source.slice(startMatch.index + startMatch[0].length);
  const endMatch = end.exec(rest);
  if (!endMatch) throw new Error(`Could not find block end: ${end}`);
  return rest.slice(0, endMatch.index);
}

function swiftMap(): Map<string, string> {
  const source = fs.readFileSync(swiftPath, 'utf8');
  const block = sliceBlock(
    source,
    /private static let map: \[String: String\] = \[/,
    /\n {2}\]/,
  );
  const entries = new Map<string, string>();
  for (const match of block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

function kotlinMap(): Map<string, string> {
  const source = fs.readFileSync(kotlinPath, 'utf8');
  const block = sliceBlock(source, /private val GLYPHS: Map<String, String> = mapOf\(/, /\n {2}\)/);
  const entries = new Map<string, string>();
  for (const match of block.matchAll(/"([^"]+)"\s+to\s+"([^"]+)"/g)) {
    entries.set(match[1], match[2]);
  }
  return entries;
}

function duplicatesByValue(entries: Map<string, string>): string[] {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const [key, value] of entries) {
    const existing = seen.get(value);
    if (existing) dupes.push(`${existing} & ${key} share "${value}"`);
    else seen.set(value, key);
  }
  return dupes;
}

describe('widget icon parity with the habit icon catalog', () => {
  it('maps every catalog key to an SF Symbol on iOS', () => {
    const map = swiftMap();
    expect(map.size).toBeGreaterThan(0);
    const missing = catalogKeys.filter(key => !map.has(key));
    expect(missing).toEqual([]);
  });

  it('maps every catalog key to an emoji on Android', () => {
    const map = kotlinMap();
    expect(map.size).toBeGreaterThan(0);
    const missing = catalogKeys.filter(key => !map.has(key));
    expect(missing).toEqual([]);
  });

  it('gives each icon a visually distinct SF Symbol', () => {
    expect(duplicatesByValue(swiftMap())).toEqual([]);
  });

  it('gives each icon a visually distinct emoji glyph', () => {
    expect(duplicatesByValue(kotlinMap())).toEqual([]);
  });

  it('has no native keys left over from removed catalog entries', () => {
    const known = new Set<string>(catalogKeys);
    expect([...swiftMap().keys()].filter(key => !known.has(key))).toEqual([]);
    expect([...kotlinMap().keys()].filter(key => !known.has(key))).toEqual([]);
  });
});
