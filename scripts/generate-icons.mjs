#!/usr/bin/env node
/**
 * Single source of truth generator for habit/goal icons.
 *
 *   npm run icons:generate
 *
 * Reads the icon catalog in src/constants/habitIcons.tsx (key -> heroicon
 * component name), forks the geometry out of react-native-heroicons' solid
 * set, applies this app's custom style spec (solid fill, heavy strokes for
 * figure/line icons), and emits:
 *
 *   1. src/constants/iconShapes.json    — key -> shape data (widget pipeline + tests)
 *   2. src/constants/generatedIcons.tsx — named SVG components imported by habitIcons.tsx
 *   3. ios/HabitTrackerWidget/Assets.xcassets/icon_<key>.imageset/  (1x/2x/3x white PNGs)
 *   4. android/app/src/main/res/drawable-nodpi/icon_<key>.png        (white PNG)
 *
 * The widgets tint these white PNGs with the habit color natively (iOS
 * .template rendering, Android SRC_IN), so the app and both OS widgets always
 * draw the identical glyph from the same data. The in-app copy renders the
 * same shapes through react-native-svg.
 *
 * Icon geometry is forked from Heroicons' solid set (MIT,
 * https://github.com/tailwindlabs/heroicons); the style spec below is what
 * makes the set ours. Re-run after editing the catalog or STYLE —
 * __tests__/widgetIconParity.test.ts fails on drift.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptsDir, '..');

// ---------------------------------------------------------------------------
// Custom style spec — the ONE definition used by both the in-app components
// and the widget PNGs. Changing this changes every icon everywhere.
//
// Solid set: glyphs are filled silhouettes (Heroicons `solid` geometry), EXCEPT
// stroke-mode icons (stick figures + line-built objects like bikes) which keep
// strokes — heavy round strokes are what makes a figure read as solid at
// widget size instead of a thin wireframe.
// ---------------------------------------------------------------------------
const STYLE = {
  viewBox: '0 0 24 24',
  /** Stroke weight for stroke-mode icons (figures, line-built objects). */
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  /** Solid set: filled silhouettes by default. */
  fill: 'currentColor',
  /** Widgets rasterize white and tint with the habit color natively. */
  widgetFill: '#FFFFFF',
};

const IOS_IMAGE_SIZES = { '1x': 24, '2x': 48, '3x': 72 }; // logical 24pt
const ANDROID_IMAGE_SIZE = 192; // drawn at ~58px inside the 144px ring canvas

const CATALOG_PATH = path.join(root, 'src/constants/habitIcons.tsx');
const SHAPES_JSON_PATH = path.join(root, 'src/constants/iconShapes.json');
const GENERATED_TSX_PATH = path.join(root, 'src/constants/generatedIcons.tsx');
const CUSTOM_ICONS_PATH = path.join(scriptsDir, 'custom-icons.json');
const IOS_ASSETS_DIR = path.join(root, 'ios/HabitTrackerWidget/Assets.xcassets');
const ANDROID_DRAWABLE_DIR = path.join(
  root,
  'android/app/src/main/res/drawable-nodpi',
);

// ---------------------------------------------------------------------------
// 0. Redirect `react-native-svg` to a stub so the compiled heroicon files
//    (CJS, requires react-native-svg at load) can run in plain Node.
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const Module = require('module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native-svg') {
    return path.join(scriptsDir, 'react-native-svg-stub.cjs');
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

// ---------------------------------------------------------------------------
// 1. Parse the catalog: key + component name per entry, plus the import list.
// ---------------------------------------------------------------------------
function parseCatalog() {
  const source = fs.readFileSync(CATALOG_PATH, 'utf8');

  const entries = [];
  for (const line of source.split('\n')) {
    const m = line.match(
      /^\s*\{\s*key:\s*'([^']+)',\s*name:\s*'([^']*)',\s*category:\s*'([^']*)',\s*Icon:\s*([A-Za-z0-9_]+)\s*},?/,
    );
    if (m) entries.push({ key: m[1], name: m[2], category: m[3], icon: m[4] });
  }
  if (entries.length === 0) {
    throw new Error('Could not parse any entries from habitIcons.tsx');
  }

  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.key)) throw new Error(`Duplicate catalog key: ${e.key}`);
    seen.add(e.key);
  }

  // The catalog's component import — either the original heroicons source
  // (before the first migration) or the generated set it points at.
  const importMatch = source.match(
    /import\s*\{([\s\S]*?)\}\s*from\s*'(?:react-native-heroicons\/outline|\.\/generatedIcons)'/,
  );
  if (!importMatch) {
    throw new Error(
      'Could not find the icon component import block in habitIcons.tsx',
    );
  }
  const imported = importMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return { entries, imported };
}

// ---------------------------------------------------------------------------
// 2. Extract shape data from a heroicon component by calling it directly and
//    walking the React element tree it returns (root <Svg> is dropped; its
//    props are replaced by STYLE).
// ---------------------------------------------------------------------------
const SVG_TAGS = new Set([
  'Path',
  'Circle',
  'Rect',
  'Line',
  'Polyline',
  'Polygon',
  'Ellipse',
  'G',
  'Defs',
  'Stop',
  'LinearGradient',
  'RadialGradient',
  'ClipPath',
  'Mask',
  'Use',
  'Text',
  'TSpan',
  'Image',
  'Symbol',
  'Pattern',
  'Marker',
  'ForeignObject',
]);

const tagHistogram = new Map();
const propNamesSeen = new Set();

function toNode(el, name) {
  if (!el || typeof el !== 'object' || typeof el.type !== 'string') {
    throw new Error(`${name}: unexpected child node`);
  }
  if (el.type === 'Svg') throw new Error(`${name}: nested <Svg> element`);
  if (!SVG_TAGS.has(el.type)) {
    throw new Error(`${name}: unknown SVG tag "${el.type}"`);
  }
  tagHistogram.set(el.type, (tagHistogram.get(el.type) ?? 0) + 1);

  const node = { t: el.type };
  for (const [key, value] of Object.entries(el.props ?? {})) {
    if (value === undefined || key === 'key' || key === 'ref') continue;
    if (key === 'children') continue;
    node[key] = value;
    propNamesSeen.add(key);
  }

  const children = normalizeChildren(el.props?.children, name);
  if (children.length > 0) node.children = children;
  return node;
}

function normalizeChildren(raw, name) {
  if (raw === undefined || raw === null || raw === false) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .filter(child => child && typeof child === 'object' && 'type' in child)
    .map(child => toNode(child, name));
}

// Hand-drawn custom icons (scripts/custom-icons.json) — glyphs heroicons
// doesn't ship (dumbbell, footprints, droplet, pill…). Loaded once and
// validated so bad authoring fails loudly at generate time, not at runtime.
//
// Each entry is either
//   [ ...nodes ]                      -> fill mode (solid silhouette)
//   { "mode": "stroke", "nodes": [...] } -> stroke mode (figures, line-built
//                                           objects; rendered with STYLE.strokeWidth)
function loadCustomIcons() {
  if (!fs.existsSync(CUSTOM_ICONS_PATH)) return {};
  const parsed = JSON.parse(fs.readFileSync(CUSTOM_ICONS_PATH, 'utf8'));
  const icons = parsed?.icons ?? {};
  const normalized = {};
  for (const [name, raw] of Object.entries(icons)) {
    let mode = 'fill';
    let nodes = raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      mode = raw.mode === 'stroke' ? 'stroke' : raw.mode === undefined ? 'fill' : raw.mode;
      if (mode !== 'fill' && mode !== 'stroke') {
        throw new Error(`custom-icons.json: ${name} has unknown mode "${raw.mode}"`);
      }
      nodes = raw.nodes;
    }
    if (!Array.isArray(nodes) || nodes.length === 0) {
      throw new Error(`custom-icons.json: ${name} has no shape nodes`);
    }
    for (const node of nodes) {
      if (!SVG_TAGS.has(node?.t)) {
        throw new Error(
          `custom-icons.json: ${name} has unknown shape tag "${node?.t}" (allowed: ${[...SVG_TAGS].join(', ')})`,
        );
      }
      if (node.t === 'Path' && typeof node.d !== 'string') {
        throw new Error(`custom-icons.json: ${name} Path node is missing "d"`);
      }
    }
    normalized[name] = { mode, nodes };
  }
  return normalized;
}

const CUSTOM_ICONS = loadCustomIcons();

const extractCache = new Map();

function extractIcon(name) {
  if (extractCache.has(name)) return extractCache.get(name);

  // Hand-drawn icons win over heroicons (and reserve names freely).
  if (CUSTOM_ICONS[name]) {
    const rec = CUSTOM_ICONS[name];
    extractCache.set(name, rec);
    return rec;
  }

  const file = require.resolve(`react-native-heroicons/solid/${name}`);
  const mod = require(file);
  const Component = mod?.default ?? mod;
  if (typeof Component !== 'function') {
    throw new Error(`${name}: module has no component export`);
  }

  const el = Component({ size: 24 });
  if (!el || el.type !== 'Svg') {
    throw new Error(`${name}: component did not render a root <Svg>`);
  }
  if (el.props.viewBox !== STYLE.viewBox) {
    throw new Error(
      `${name}: unexpected viewBox "${el.props.viewBox}" (want ${STYLE.viewBox})`,
    );
  }

  const shapes = normalizeChildren(el.props.children, name);
  if (shapes.length === 0) throw new Error(`${name}: no shapes extracted`);
  const rec = { mode: 'fill', nodes: shapes };
  extractCache.set(name, rec);
  return rec;
}

// ---------------------------------------------------------------------------
// 3. Emit src/constants/iconShapes.json
// ---------------------------------------------------------------------------
function writeShapesJson(entries) {
  const icons = {};
  const components = {};
  const iconModes = {};
  for (const entry of entries) {
    const rec = extractIcon(entry.icon);
    icons[entry.key] = rec.nodes;
    components[entry.key] = entry.icon;
    iconModes[entry.key] = rec.mode;
  }
  const payload = {
    $comment:
      'AUTO-GENERATED by scripts/generate-icons.mjs — do not edit. See that file for the pipeline.',
    style: {
      viewBox: STYLE.viewBox,
      strokeWidth: STYLE.strokeWidth,
      strokeLinecap: STYLE.strokeLinecap,
      strokeLinejoin: STYLE.strokeLinejoin,
      fill: STYLE.fill,
    },
    components,
    iconModes,
    icons,
  };
  fs.writeFileSync(SHAPES_JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

// ---------------------------------------------------------------------------
// 4. Emit src/constants/generatedIcons.tsx (self-contained SVG components)
// ---------------------------------------------------------------------------
function jsxAttrString(value) {
  if (typeof value === 'number') return `={${value}}`;
  if (typeof value === 'boolean') return value ? '' : `={${value}}`;
  return `={${JSON.stringify(String(value))}}`;
}

function emitJsxNode(node, indent) {
  const { t, children, ...attrs } = node;
  const pad = ' '.repeat(indent);
  const attrText = Object.entries(attrs)
    .map(([key, value]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        throw new Error(`Invalid JSX attribute name: ${key}`);
      }
      const rendered = jsxAttrString(value);
      return rendered === '' ? ` ${key}` : ` ${key}${rendered}`;
    })
    .join('');

  if (!children || children.length === 0) {
    return `${pad}<${t}${attrText} />`;
  }
  const inner = children.map(c => emitJsxNode(c, indent + 2)).join('\n');
  return `${pad}<${t}${attrText}>\n${inner}\n${pad}</${t}>`;
}

function writeGeneratedTsx(entries, imported) {
  const uniqueNames = [...new Set([...imported, ...entries.map(e => e.icon)])];

  // Every catalog/imported name must exist as a heroicon component.
  const nameToKey = new Map();
  for (const entry of entries) {
    if (nameToKey.has(entry.icon)) continue; // shared icons: first key wins
    nameToKey.set(entry.icon, entry.key);
  }

  const bodies = new Map();
  const modes = new Map();
  const usedTags = new Set();
  for (const name of uniqueNames) {
    const rec = extractIcon(name);
    bodies.set(name, rec.nodes);
    modes.set(name, rec.mode);
    const collectTags = nodes =>
      nodes.forEach(n => {
        usedTags.add(n.t);
        if (n.children) collectTags(n.children);
      });
    collectTags(rec.nodes);
  }

  const svgImports = [...usedTags].sort();
  const header = `// AUTO-GENERATED FILE — do not edit by hand. Run \`npm run icons:generate\`.
//
// Habit/goal icon set — SOLID style. Geometry forked from Heroicons' solid
// set (MIT, Tailwind Labs — https://github.com/tailwindlabs/heroicons); most
// glyphs are filled silhouettes, while figure/line icons (STROKE_WIDTH) keep
// heavy round strokes. The same spec feeds the widget PNG export in
// scripts/generate-icons.mjs, so the iOS/Android widgets draw the identical
// glyph the app renders here.
import Svg, { ${svgImports.join(', ')} } from 'react-native-svg';

export type GeneratedIconProps = {
  size?: number;
  color?: string;
};

/** Stroke weight for stroke-mode icons (figures, line-built objects).
 *  Regenerated from scripts/generate-icons.mjs — keep via \`npm run icons:generate\`. */
const STROKE_WIDTH = ${STYLE.strokeWidth};
`;

  const parts = [header];
  for (const name of uniqueNames) {
    const shapes = bodies.get(name);
    const mode = modes.get(name);
    const body = shapes.map(n => emitJsxNode(n, 4)).join('\n');
    const rootAttrs =
      mode === 'stroke'
        ? `    fill="none"\n` +
          `    stroke="currentColor"\n` +
          `    strokeWidth={STROKE_WIDTH}\n` +
          `    strokeLinecap="${STYLE.strokeLinecap}"\n` +
          `    strokeLinejoin="${STYLE.strokeLinejoin}"\n`
        : `    fill="currentColor"\n`;
    parts.push(
      `export const ${name} = ({ size = 24, color }: GeneratedIconProps) => (\n` +
        `  <Svg\n` +
        `    width={size}\n` +
        `    height={size}\n` +
        `    viewBox="${STYLE.viewBox}"\n` +
        rootAttrs +
        `    color={color}\n` +
        `  >\n` +
        `${body}\n` +
        `  </Svg>\n` +
        `);\n`,
    );
  }

  fs.writeFileSync(GENERATED_TSX_PATH, parts.join('\n'));
}

// ---------------------------------------------------------------------------
// 5. Widget PNGs (white on transparent — tinted natively on each platform)
// ---------------------------------------------------------------------------
function camelToKebab(name) {
  if (name === 'viewBox') {
    throw new Error('viewBox must not appear on a child node');
  }
  return name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgNodeMarkup(node) {
  // SVG tags are case-sensitive: the react-native-svg component name `<Path>`
  // is NOT the SVG element `<path>` — an unknown capitalized tag renders
  // nothing (resvg emits a blank image, which shipped as 668 empty widget
  // PNGs once). Lowercase only the first letter: multi-word tags stay valid
  // (`LinearGradient` -> `linearGradient`).
  const tag = node.t[0].toLowerCase() + node.t.slice(1);
  const { t: _tag, children, ...attrs } = node;
  const attrText = Object.entries(attrs)
    // Custom icons author colors as `currentColor` (the app's semantic);
    // the widget raster is a white stencil tinted natively, so resolve it here.
    .map(([key, value]) => {
      const rendered = String(value).replace(
        /currentColor/g,
        STYLE.widgetFill,
      );
      return `${camelToKebab(key)}="${escapeAttr(rendered)}"`;
    })
    .join(' ');
  const open = attrText ? `<${tag} ${attrText}` : `<${tag}`;
  if (!children || children.length === 0) return `${open} />`;
  return `${open}>\n${children.map(svgNodeMarkup).join('\n')}\n</${tag}>`;
}

function svgMarkup(shapes, px, mode) {
  const root =
    mode === 'stroke'
      ? `fill="none" stroke="${STYLE.widgetFill}" ` +
        `stroke-width="${STYLE.strokeWidth}" stroke-linecap="${STYLE.strokeLinecap}" ` +
        `stroke-linejoin="${STYLE.strokeLinejoin}"`
      : `fill="${STYLE.widgetFill}"`;
  const head =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${STYLE.viewBox}" ` +
    `width="${px}" height="${px}" ${root}>`;
  return `${head}\n${shapes.map(svgNodeMarkup).join('\n')}\n</svg>`;
}

function androidName(key) {
  if (!/^[a-z0-9-]+$/.test(key)) {
    throw new Error(`Icon key not asset-safe: "${key}"`);
  }
  const name = `icon_${key.replace(/-/g, '_')}`;
  if (!/^icon_[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error(`Sanitized Android name invalid: "${name}"`);
  }
  return name;
}

function iosAssetName(key) {
  if (!/^[a-z0-9-]+$/.test(key)) {
    throw new Error(`Icon key not asset-safe: "${key}"`);
  }
  return `icon_${key}`;
}

async function writeWidgetPngs(entries) {
  const { Resvg } = await import('@resvg/resvg-js');

  const render = (shapes, px, mode) =>
    // Icons are pure vector paths — skip font loading (it would enumerate
    // every system font per Resvg instance and dominate the runtime).
    new Resvg(svgMarkup(shapes, px, mode), {
      font: { loadSystemFonts: false },
    })
      .render()
      .asPng();

  const imagesets = new Set();
  const androidFiles = new Set();
  let pngCount = 0;

  fs.mkdirSync(path.join(IOS_ASSETS_DIR), { recursive: true });
  fs.mkdirSync(ANDROID_DRAWABLE_DIR, { recursive: true });

  // Stable root Contents.json for the widget asset catalog.
  const rootContents = path.join(IOS_ASSETS_DIR, 'Contents.json');
  if (!fs.existsSync(rootContents)) {
    fs.writeFileSync(
      rootContents,
      `${JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)}\n`,
    );
  }

  for (const entry of entries) {
    const rec = extractIcon(entry.icon);
    const shapes = rec.nodes;

    // iOS imageset (asset names may contain hyphens; no sanitizing needed)
    const assetName = iosAssetName(entry.key);
    imagesets.add(`${assetName}.imageset`);
    const imagesetDir = path.join(IOS_ASSETS_DIR, `${assetName}.imageset`);
    fs.mkdirSync(imagesetDir, { recursive: true });
    const iosImages = [];
    for (const [scale, px] of Object.entries(IOS_IMAGE_SIZES)) {
      const filename =
        scale === '1x' ? `${assetName}.png` : `${assetName}@${scale}.png`;
      fs.writeFileSync(
        path.join(imagesetDir, filename),
        render(shapes, px, rec.mode),
      );
      iosImages.push({ idiom: 'universal', filename, scale });
      pngCount += 1;
    }
    fs.writeFileSync(
      path.join(imagesetDir, 'Contents.json'),
      `${JSON.stringify({ images: iosImages, info: { author: 'xcode', version: 1 } }, null, 2)}\n`,
    );

    // Android drawable (hyphens are illegal in resource names -> underscores)
    const resName = androidName(entry.key);
    androidFiles.add(`${resName}.png`);
    fs.writeFileSync(
      path.join(ANDROID_DRAWABLE_DIR, `${resName}.png`),
      render(shapes, ANDROID_IMAGE_SIZE, rec.mode),
    );
    pngCount += 1;
  }

  prune(IOS_ASSETS_DIR, /^icon_.*\.imageset$/, imagesets, true);
  // drawable-nodpi is created and owned by this script — any PNG that isn't
  // in the keep set is a stale leftover from an older naming scheme.
  prune(ANDROID_DRAWABLE_DIR, /\.png$/, androidFiles, false);

  return pngCount;
}

function prune(dir, pattern, keep, isDir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!pattern.test(name) || keep.has(name)) continue;
    const target = path.join(dir, name);
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`  pruned stale ${path.relative(root, target)}`);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const { entries, imported } = parseCatalog();
  console.log(
    `Catalog: ${entries.length} keys, ${new Set(entries.map(e => e.icon)).size} unique icons`,
  );

  writeShapesJson(entries);
  writeGeneratedTsx(entries, imported);
  const pngCount = await writeWidgetPngs(entries);

  console.log(
    `Wrote ${path.relative(root, SHAPES_JSON_PATH)}, ${path.relative(root, GENERATED_TSX_PATH)}, ${pngCount} PNGs`,
  );
  console.log(
    `Tags: ${[...tagHistogram].map(([t, n]) => `${t}×${n}`).join(', ')}`,
  );
  console.log(`Child props: ${[...propNamesSeen].sort().join(', ')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
