import {
  MORPH_COUNT,
  CHECK_SEGMENTS,
  TARGET_CENTER,
  TARGET_RADII,
  MOUNTAIN_PEAK,
  MOUNTAIN_BASE_LEFT,
  MOUNTAIN_BASE_RIGHT,
  MORPH_LAYOUT_KEYS,
  getMorphSet,
  getParticleLayout,
  getCachedParticleTables,
  warmParticleTables,
} from '../src/components/onboarding/particleLayouts';

function distanceToCheck(x: number, y: number): number {
  let best = Infinity;
  for (const [x1, y1, x2, y2] of CHECK_SEGMENTS) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t = Math.min(1, Math.max(0, ((x - x1) * dx + (y - y1) * dy) / lenSq));
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

test('check layout returns the morph identity count', () => {
  const dots = getParticleLayout('check', MORPH_COUNT);
  expect(dots).toHaveLength(MORPH_COUNT);
});

test('check dots hug the checkmark path (thin stroke)', () => {
  const dots = getParticleLayout('check', MORPH_COUNT);
  for (const d of dots) {
    expect(distanceToCheck(d.x, d.y)).toBeLessThan(6);
  }
  const mean =
    dots.reduce((a, d) => a + distanceToCheck(d.x, d.y), 0) / dots.length;
  expect(mean).toBeLessThan(2);
});

test('morph set includes a stable check formation', () => {
  const first = getMorphSet(MORPH_COUNT);
  const second = getMorphSet(MORPH_COUNT);
  expect(first.layouts.check).toHaveLength(MORPH_COUNT);
  expect(first.layouts.check).toEqual(second.layouts.check);
});

function distanceToTarget(x: number, y: number): number {
  const [ccx, ccy] = TARGET_CENTER;
  const centerDist = Math.hypot(x - ccx, y - ccy);
  let best = centerDist; // bullseye dots cluster near the center
  for (const r of TARGET_RADII) {
    best = Math.min(best, Math.abs(centerDist - r));
  }
  return best;
}

test('target layout returns the morph identity count', () => {
  expect(getParticleLayout('target', MORPH_COUNT)).toHaveLength(MORPH_COUNT);
});

test('target dots trace rings with a dense bullseye', () => {
  const dots = getParticleLayout('target', MORPH_COUNT);
  for (const d of dots) {
    expect(distanceToTarget(d.x, d.y)).toBeLessThan(6);
  }
  const [ccx, ccy] = TARGET_CENTER;
  const bullseye = dots.filter(
    d => Math.hypot(d.x - ccx, d.y - ccy) < TARGET_RADII[0] / 2,
  ).length;
  expect(bullseye).toBeGreaterThan(MORPH_COUNT * 0.05);
});

test('morph set includes a stable target formation', () => {
  const first = getMorphSet(MORPH_COUNT);
  const second = getMorphSet(MORPH_COUNT);
  expect(first.layouts.target).toHaveLength(MORPH_COUNT);
  expect(first.layouts.target).toEqual(second.layouts.target);
});

function insideMountain(x: number, y: number): boolean {
  // Barycentric half-plane check against the peak triangle.
  const [px, py] = MOUNTAIN_PEAK;
  const [blx, bly] = MOUNTAIN_BASE_LEFT;
  const [brx, bry] = MOUNTAIN_BASE_RIGHT;
  const sign = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  const d1 = sign(x, y, px, py, blx, bly);
  const d2 = sign(x, y, blx, bly, brx, bry);
  const d3 = sign(x, y, brx, bry, px, py);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

test('mountain layout returns the morph identity count', () => {
  expect(getParticleLayout('mountain', MORPH_COUNT)).toHaveLength(
    MORPH_COUNT,
  );
});

test('mountain dots pack inside the peak triangle', () => {
  const dots = getParticleLayout('mountain', MORPH_COUNT);
  for (const d of dots) {
    expect(insideMountain(d.x, d.y)).toBe(true);
  }
});

test('morph set includes a stable mountain formation', () => {
  const first = getMorphSet(MORPH_COUNT);
  const second = getMorphSet(MORPH_COUNT);
  expect(first.layouts.mountain).toHaveLength(MORPH_COUNT);
  expect(first.layouts.mountain).toEqual(second.layouts.mountain);
});

test('cached tables are computed once with correct dimensions', () => {
  warmParticleTables();
  const first = getCachedParticleTables();
  const second = getCachedParticleTables();
  expect(second).toBe(first);
  const L = MORPH_LAYOUT_KEYS.length;
  expect(first.count).toBe(MORPH_COUNT);
  expect(first.layouts).toBe(L);
  expect(first.pos.length).toBe(L * MORPH_COUNT * 2);
  expect(first.mot.length).toBe(MORPH_COUNT * 4);
  expect(first.style.length).toBe(MORPH_COUNT * 2);
  for (let i = 0; i < first.pos.length; i++) {
    expect(Number.isFinite(first.pos[i])).toBe(true);
  }
});
