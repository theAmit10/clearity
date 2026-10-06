export type ParticleVariant = 'sphere' | 'scatter' | 'rings' | 'funnel';

export interface ParticleDot {
  /** 0..100 in viewBox space */
  x: number;
  y: number;
  /** radius in viewBox units */
  r: number;
  /** 0..1 */
  opacity: number;
}

export const PARTICLE_DOT_COUNT: Record<ParticleVariant, number> = {
  sphere: 750,
  scatter: 900,
  rings: 750,
  funnel: 800,
};

/** Fixed identity count for the shared-element morph engine: dot `i`
 *  is the same atom on every screen, so transitions read as reshaping
 *  rather than crossfading. Lower this single constant if low-end
 *  Android drops below ~45fps during morphs — no redesign needed. */
export const MORPH_COUNT = 650;

export const MORPH_ORDER: ParticleVariant[] = [
  'sphere',
  'scatter',
  'rings',
  'funnel',
];

export interface MorphMotion {
  phase: number;
  speed: number;
  amp: number;
  stagger: number;
}

/** Deterministic PRNG so layouts are stable across renders / snapshots. */
/* eslint-disable no-bitwise */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  // Box–Muller
  const u = Math.max(rand(), 1e-9);
  const v = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CX = 50;
const CY = 42;

function sphereLayout(count: number, rand: () => number): ParticleDot[] {
  const dots: ParticleDot[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const R = 30;
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // 1..-1
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x3 = Math.cos(theta) * rad;
    const z3 = Math.sin(theta) * rad;
    // Slight tilt so it reads as a ball, not a disc
    const x = CX + x3 * R + gaussian(rand) * 0.55;
    const yy = CY + y * R * 0.98 + gaussian(rand) * 0.55;
    // Depth from z: front brighter/bigger
    const depth = (z3 + 1) / 2;
    dots.push({
      x,
      y: yy,
      r: 0.55 + depth * 0.95 + rand() * 0.25,
      opacity: 0.25 + depth * 0.75,
    });
    // Sparse drifting satellites
    if (i % 9 === 0) {
      dots.push({
        x: CX + gaussian(rand) * 46,
        y: CY + gaussian(rand) * 40,
        r: 0.4 + rand() * 0.5,
        opacity: 0.12 + rand() * 0.25,
      });
    }
  }
  return dots;
}

function scatterLayout(count: number, rand: () => number): ParticleDot[] {
  const dots: ParticleDot[] = [];
  for (let i = 0; i < count; i++) {
    const outlier = rand() < 0.28;
    const x = outlier
      ? rand() * 100
      : CX + gaussian(rand) * 19 + (rand() - 0.5) * 10;
    const y = outlier
      ? rand() * 100
      : CY + gaussian(rand) * 16 + (rand() - 0.5) * 8;
    dots.push({
      x,
      y,
      r: 0.45 + rand() * 0.9,
      opacity: outlier ? 0.1 + rand() * 0.3 : 0.3 + rand() * 0.65,
    });
  }
  return dots;
}

function ringsLayout(count: number, rand: () => number): ParticleDot[] {
  const dots: ParticleDot[] = [];
  const rings = 10;
  const per = Math.floor(count / rings);
  for (let j = 0; j < rings; j++) {
    const t = j / (rings - 1); // 0 top .. 1 bottom
    const ringCY = 14 + t * 56;
    // Widest at the middle, pinched at poles (tipped-sphere look)
    const rx = 8 + Math.sin(t * Math.PI) * 30;
    const ry = rx * 0.3;
    for (let k = 0; k < per; k++) {
      const a = (k / per) * Math.PI * 2 + rand() * 0.08;
      const front = (Math.sin(a) + 1) / 2; // brighten front arc
      dots.push({
        x: CX + Math.cos(a) * rx + gaussian(rand) * 0.5,
        y: ringCY + Math.sin(a) * ry + gaussian(rand) * 0.5,
        r: 0.5 + front * 0.8 + rand() * 0.25,
        opacity: 0.2 + front * 0.75,
      });
    }
  }
  return dots;
}

function funnelLayout(count: number, rand: () => number): ParticleDot[] {
  const dots: ParticleDot[] = [];
  const rings = 30;
  const vpx = 50;
  const vpy = 24; // vanishing point near top-center
  let placed = 0;
  for (let j = 0; j < rings && placed < count; j++) {
    const t = j / (rings - 1); // 0 center .. 1 outer
    const radius = 3 + Math.pow(t, 1.35) * 62;
    const ringCY = vpy + Math.pow(t, 1.2) * 52;
    const per = Math.max(8, Math.floor(radius * 1.15));
    for (let k = 0; k < per && placed < count; k++, placed++) {
      const a = (k / per) * Math.PI * 2 + j * 0.22 + rand() * 0.05;
      const stretchY = 1.12;
      dots.push({
        x: vpx + Math.cos(a) * radius + gaussian(rand) * 0.4,
        y: ringCY + Math.sin(a) * radius * 0.62 * stretchY + gaussian(rand) * 0.4,
        // Inner (near hole) slightly brighter — draws the eye inward
        r: 0.5 + (1 - t) * 0.55 + rand() * 0.3,
        opacity: 0.9 - t * 0.55 + rand() * 0.1,
      });
    }
  }
  return dots;
}

export function getParticleLayout(
  variant: ParticleVariant,
  count?: number,
  seed = 20261006,
): ParticleDot[] {
  const rand = mulberry32(seed + variant.length * 7919);
  const n = count ?? PARTICLE_DOT_COUNT[variant];
  switch (variant) {
    case 'sphere':
      return sphereLayout(n, rand);
    case 'scatter':
      return scatterLayout(n, rand);
    case 'rings':
      return ringsLayout(n, rand);
    case 'funnel':
      return funnelLayout(n, rand);
  }
}

/**
 * Morph-ready set: every variant returns exactly `count` dots in a stable
 * spatial order (angle around center, then radius), so index `i` refers to
 * roughly the same region of the composition on every screen and lerps
 * flow instead of crossing chaotically. Motion params are precomputed once
 * (seeded) — the frame worklet only reads them.
 */
export function getMorphSet(count: number = MORPH_COUNT): {
  layouts: Record<ParticleVariant, ParticleDot[]>;
  motion: MorphMotion[];
} {
  const orderDots = (dots: ParticleDot[]): ParticleDot[] =>
    [...dots]
      .sort((a, b) => {
        const aa = Math.atan2(a.y - CY, a.x - CX);
        const bb = Math.atan2(b.y - CY, b.x - CX);
        if (aa !== bb) return aa - bb;
        const ra = (a.x - CX) ** 2 + (a.y - CY) ** 2;
        const rb = (b.x - CX) ** 2 + (b.y - CY) ** 2;
        return ra - rb;
      })
      .slice(0, count);

  const layouts = {
    sphere: orderDots(getParticleLayout('sphere', count + 80)),
    scatter: orderDots(getParticleLayout('scatter', count + 80)),
    rings: orderDots(getParticleLayout('rings', count + 80)),
    funnel: orderDots(getParticleLayout('funnel', count + 80)),
  } as Record<ParticleVariant, ParticleDot[]>;

  const rand = mulberry32(0xC10C);
  const motion: MorphMotion[] = Array.from({ length: count }, () => ({
    phase: rand() * Math.PI * 2,
    // Energetic swarm: 0.6–2.2 Hz per-dot oscillation
    speed: 0.6 + rand() * 1.6,
    // 1.5–4.0 viewBox units of drift — visible atoms, stays on canvas
    amp: 1.5 + rand() * 2.5,
    // Depth-staggered morph: leading dots reshape first
    stagger: rand() * 0.35,
  }));

  return { layouts, motion };
}
