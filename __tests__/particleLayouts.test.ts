import {
  MORPH_COUNT,
  CHECK_SEGMENTS,
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
