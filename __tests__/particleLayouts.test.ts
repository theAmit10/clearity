import {
  MORPH_COUNT,
  CHECK_SEGMENTS,
  TARGET_CENTER,
  TARGET_RADII,
  getMorphSet,
  getParticleLayout,
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
