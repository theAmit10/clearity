import { HABIT_ICONS } from '../src/constants/habitIcons';
import * as generatedIcons from '../src/constants/generatedIcons';
import iconShapes from '../src/constants/iconShapes.json';

// tsconfig only loads jest's globals, so declare the small slice of Node this
// test needs instead of pulling @types/node into the app compile.
declare const require: (id: string) => any;
declare const __dirname: string;
declare const Buffer: any;

const fs = require('fs') as {
  readFileSync: (p: string, enc?: string) => any;
  existsSync: (p: string) => boolean;
  readdirSync: (p: string) => string[];
  statSync: (p: string) => { size: number };
};
const zlib = require('zlib') as {
  inflateSync: (buf: any) => any;
};
const path = require('path') as { join: (...parts: string[]) => string };

/**
 * One icon source feeds everything: scripts/generate-icons.mjs forks the
 * catalog's Heroicon geometry into
 *
 *   - src/constants/generatedIcons.tsx  (in-app SVG components)
 *   - src/constants/iconShapes.json     (widget PNG source + these tests)
 *   - ios .../Assets.xcassets/icon_<key>.imageset  (1x/2x/3x white PNGs)
 *   - android .../res/drawable-nodpi/icon_<key>.png (white PNG)
 *
 * so the app, the iOS widget, and the Android widget draw the identical
 * glyph by construction. These tests fail the moment the catalog, the shape
 * data, and the committed assets drift apart — the failure mode the old
 * hand-maintained SF Symbol / emoji tables suffered from.
 */

const root = path.join(__dirname, '..');
const IOS_ASSETS = path.join(root, 'ios/HabitTrackerWidget/Assets.xcassets');
const ANDROID_DRAWABLES = path.join(
  root,
  'android/app/src/main/res/drawable-nodpi',
);

const catalogKeys: string[] = HABIT_ICONS.map(icon => icon.key);
const knownImagesets = new Set<string>(
  catalogKeys.map(key => `icon_${key}.imageset`),
);
const knownAndroidFiles = new Set<string>(
  catalogKeys.map(key => `icon_${key.replace(/-/g, '_')}.png`),
);

const shapes = iconShapes.icons as Record<string, unknown[]>;
const components = iconShapes.components as Record<string, string>;

function startsWithPng(filePath: string): boolean {
  const bytes = fs.readFileSync(filePath);
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

/**
 * Count pixels with non-zero alpha in a non-interlaced 8-bit RGBA PNG.
 *
 * A PNG header can be perfectly valid while the image is 100% transparent —
 * exactly what happened when the generator emitted capitalized `<Path>` tags
 * (unknown to SVG) and resvg rendered all 668 widget icons as blank images.
 * Magic-byte checks can't catch that, so decode the pixels and look.
 */
/* eslint-disable no-bitwise -- byte-level PNG unfiltering needs bitwise math */
function visiblePixelCount(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: any[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      // 8-bit RGBA, non-interlaced — what scripts/generate-icons.mjs emits.
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error(`${filePath}: unexpected PNG format`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    }
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const row = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const byte = raw[pos + x];
      const left = x >= 4 ? row[x - 4] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= 4 ? prev[x - 4] : 0;
      let value: number;
      switch (filter) {
        case 0: value = byte; break;
        case 1: value = byte + left; break;
        case 2: value = byte + up; break;
        case 3: value = byte + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value =
            byte + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          throw new Error(`${filePath}: bad PNG filter ${filter}`);
      }
      row[x] = value & 0xff;
    }
    pos += stride;
  }
  let visible = 0;
  for (let i = 3; i < out.length; i += 4) {
    if (out[i] > 0) visible += 1;
  }
  return visible;
}
/* eslint-enable no-bitwise */

describe('icon shape data', () => {
  it('gives every catalog key shape data from its exact generated component', () => {
    for (const entry of HABIT_ICONS) {
      // Key present in the shared JSON the widget pipeline reads.
      expect(Array.isArray(shapes[entry.key])).toBe(true);
      expect(shapes[entry.key]!.length).toBeGreaterThan(0);

      // JSON says this key belongs to component X; the catalog must reference
      // that very export (catches changed key/component pairings).
      const exported = (generatedIcons as Record<string, unknown>)[
        components[entry.key]
      ];
      expect(typeof exported).toBe('function');
      expect(entry.Icon).toBe(exported);
    }
  });

  it('has no shape entries left over from removed catalog keys', () => {
    const known = new Set(catalogKeys);
    expect(Object.keys(shapes).filter(key => !known.has(key))).toEqual([]);
    expect(Object.keys(components).filter(key => !known.has(key))).toEqual([]);
  });

  it('keeps the generated stroke spec in sync with the shape data', () => {
    const tsx = fs.readFileSync(
      path.join(root, 'src/constants/generatedIcons.tsx'),
      'utf8',
    );
    const match = tsx.match(/const STROKE_WIDTH = ([\d.]+);/);
    expect(Number(match && match[1])).toBe(iconShapes.style.strokeWidth);
  });
});

describe('iOS widget assets', () => {
  it('ships a 1x/2x/3x imageset of real PNGs for every catalog key', () => {
    const problems: string[] = [];
    for (const key of catalogKeys) {
      const dir = path.join(IOS_ASSETS, `icon_${key}.imageset`);
      const contentsPath = path.join(dir, 'Contents.json');
      if (!fs.existsSync(contentsPath)) {
        problems.push(`${key}: missing Contents.json`);
        continue;
      }
      let contents: { images?: { filename?: string }[] };
      try {
        contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
      } catch {
        problems.push(`${key}: unreadable Contents.json`);
        continue;
      }
      const images = contents.images ?? [];
      if (images.length !== 3) {
        problems.push(`${key}: ${images.length} scales (want 3)`);
      }
      for (const image of images) {
        const file = image.filename
          ? path.join(dir, image.filename)
          : undefined;
        if (!file || !fs.existsSync(file)) {
          problems.push(`${key}: missing ${image.filename}`);
        } else if (!startsWithPng(file)) {
          problems.push(`${key}: ${image.filename} is not a PNG`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no orphaned imagesets from removed catalog keys', () => {
    const orphans = fs
      .readdirSync(IOS_ASSETS)
      .filter(name => name.endsWith('.imageset') && !knownImagesets.has(name));
    expect(orphans).toEqual([]);
  });

  it('draws actual strokes — no fully transparent PNGs', () => {
    // Resvg renders an unknown/invalid element to a valid-but-empty PNG, so
    // header checks pass while the widget shows nothing. Sample the 3x scale
    // (largest, what devices use) and require real visible pixels.
    const blank: string[] = [];
    for (const key of catalogKeys) {
      const file = path.join(
        IOS_ASSETS,
        `icon_${key}.imageset`,
        `icon_${key}@3x.png`,
      );
      if (!fs.existsSync(file) || visiblePixelCount(file) === 0) {
        blank.push(key);
      }
    }
    expect(blank).toEqual([]);
  });
});

describe('Android widget assets', () => {
  it('ships a real PNG drawable for every catalog key', () => {
    const problems: string[] = [];
    for (const key of catalogKeys) {
      const file = path.join(
        ANDROID_DRAWABLES,
        `icon_${key.replace(/-/g, '_')}.png`,
      );
      if (!fs.existsSync(file)) {
        problems.push(`${key}: missing drawable`);
      } else if (!startsWithPng(file)) {
        problems.push(`${key}: not a PNG`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no orphaned drawables from removed catalog keys', () => {
    const orphans = fs
      .readdirSync(ANDROID_DRAWABLES)
      .filter(name => name.endsWith('.png') && !knownAndroidFiles.has(name));
    expect(orphans).toEqual([]);
  });

  it('maps hyphenated keys to resource names without collisions', () => {
    const names = catalogKeys.map(key => `icon_${key.replace(/-/g, '_')}`);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^icon_[a-z][a-z0-9_]*$/);
    }
  });

  it('draws actual strokes — no fully transparent PNGs', () => {
    // Same blank-PNG trap as iOS: a valid header over an empty image. The
    // widget tints this bitmap into the ring center, so transparent means an
    // invisible icon on the home screen.
    const blank: string[] = [];
    for (const key of catalogKeys) {
      const file = path.join(
        ANDROID_DRAWABLES,
        `icon_${key.replace(/-/g, '_')}.png`,
      );
      if (!fs.existsSync(file) || visiblePixelCount(file) === 0) {
        blank.push(key);
      }
    }
    expect(blank).toEqual([]);
  });
});
