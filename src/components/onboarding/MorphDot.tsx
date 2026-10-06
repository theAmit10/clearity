import React, { memo } from 'react';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle } from 'react-native-svg';
import type { ParticleTables } from './particleLayouts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function easeInOutCubic(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Props {
  index: number;
  r: number;
  opacity: number;
  progress: SharedValue<number>;
  time: SharedValue<number>;
  fromIdx: SharedValue<number>;
  toIdx: SharedValue<number>;
  tables: SharedValue<ParticleTables>;
}

/**
 * One living atom. Props are immutable after mount (shared values carry
 * all motion state), so `memo` holds forever: morphs and pulse loops
 * update two shared numbers and zero React components re-render.
 * Only `cx`/`cy` animate: morph lerp (staggered, eased) plus a continuous
 * energetic-swarm wobble driven by the shared clock.
 */
function MorphDot({
  index,
  r,
  opacity,
  progress,
  time,
  fromIdx,
  toIdx,
  tables,
}: Props) {
  const animatedProps = useAnimatedProps(() => {
    const p = progress.value;
    const t = time.value;
    const tb = tables.value;
    const C = tb.count;
    const i = index;
    const f = fromIdx.value;
    const q = toIdx.value;
    const ax = tb.pos[(f * C + i) * 2];
    const ay = tb.pos[(f * C + i) * 2 + 1];
    const bx = tb.pos[(q * C + i) * 2];
    const by = tb.pos[(q * C + i) * 2 + 1];
    const phase = tb.mot[i * 4];
    const speed = tb.mot[i * 4 + 1];
    const amp = tb.mot[i * 4 + 2];
    const stagger = tb.mot[i * 4 + 3];
    const span = Math.max(1e-3, 1 - stagger);
    const local = Math.min(1, Math.max(0, (p - stagger) / span));
    const e = easeInOutCubic(local);
    const x = ax + (bx - ax) * e + Math.sin(t * speed + phase) * amp;
    const y = ay + (by - ay) * e + Math.cos(t * speed * 0.83 + phase * 1.7) * amp;
    return { cx: x, cy: y };
  });

  return (
    <AnimatedCircle
      cx={0}
      cy={0}
      r={r}
      fill="#FFFFFF"
      opacity={opacity}
      animatedProps={animatedProps}
    />
  );
}

export default memo(MorphDot);
