import React, { memo } from 'react';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function easeInOutCubic(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Props {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
  opacity: number;
  phase: number;
  speed: number;
  amp: number;
  stagger: number;
  progress: SharedValue<number>;
  time: SharedValue<number>;
}

/**
 * One living atom. `r`/`opacity` are static (halves UI-thread cost);
 * only `cx`/`cy` animate: morph lerp (staggered, eased) plus a continuous
 * energetic-swarm wobble driven by the shared clock.
 */
function MorphDot({
  ax,
  ay,
  bx,
  by,
  r,
  opacity,
  phase,
  speed,
  amp,
  stagger,
  progress,
  time,
}: Props) {
  const animatedProps = useAnimatedProps(
    () => {
      const p = progress.value;
      const t = time.value;
      const span = Math.max(1e-3, 1 - stagger);
      const local = Math.min(1, Math.max(0, (p - stagger) / span));
      const e = easeInOutCubic(local);
      const x =
        ax +
        (bx - ax) * e +
        Math.sin(t * speed + phase) * amp;
      const y =
        ay +
        (by - ay) * e +
        Math.cos(t * speed * 0.83 + phase * 1.7) * amp;
      return { cx: x, cy: y };
    },
    [ax, ay, bx, by, phase, speed, amp, stagger],
  );

  return (
    <AnimatedCircle
      cx={ax}
      cy={ay}
      r={r}
      fill="#FFFFFF"
      opacity={opacity}
      animatedProps={animatedProps}
    />
  );
}

export default memo(MorphDot);
