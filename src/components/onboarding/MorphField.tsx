import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  MORPH_COUNT,
  MORPH_LAYOUT_KEYS,
  CHECK_LAYOUT_INDEX,
  TARGET_LAYOUT_INDEX,
  MOUNTAIN_LAYOUT_INDEX,
  getMorphSet,
} from './particleLayouts';
import MorphDot from './MorphDot';

export interface MorphHandle {
  /** Animate atoms from the current shape to `next`. `onMid` swaps copy
   *  ~55% through; `onDone` fires when settled. No-ops while reduced motion. */
  morphTo: (next: number, onMid: () => void, onDone: () => void) => void;
}

const MORPH_MS = 1100;

// Formation pulse loops (form → hold → disperse → rest), keyed by page.
// Page 1 assembles the check; page 2 assembles the goal target on a
// slower, weightier cadence. Drives the same `progress` value as page morphs.
const PULSE_SETTLE_MS = 250;
interface PulseConfig {
  layout: number;
  form: number;
  hold: number;
  disperse: number;
  rest: number;
}
const PULSE_BY_PAGE: Record<number, PulseConfig> = {
  1: { layout: CHECK_LAYOUT_INDEX, form: 1400, hold: 1200, disperse: 1400, rest: 1600 },
  2: { layout: TARGET_LAYOUT_INDEX, form: 1800, hold: 2000, disperse: 1800, rest: 1400 },
  3: { layout: MOUNTAIN_LAYOUT_INDEX, form: 1400, hold: 1200, disperse: 1400, rest: 1600 },
};

const MorphField = forwardRef<MorphHandle>(function MorphFieldInner(_, ref) {
  const { layouts, motion } = useMemo(() => getMorphSet(MORPH_COUNT), []);
  const [segment, setSegment] = useState({ from: 0, to: 0 });
  const currentRef = useRef(0);
  const pulsingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  // Shared clock (seconds) — one UI-thread loop feeds all dots.
  const time = useSharedValue(0);
  // Absolute-page morph progress within the current segment (0 → 1).
  const progress = useSharedValue(1);

  const frame = useFrameCallback(frameInfo => {
    'worklet';
    time.value = (frameInfo.timestamp ?? 0) / 1000;
  }, false);

  useEffect(() => {
    if (reduceMotion) {
      frame.setActive(false);
      return;
    }
    frame.setActive(true);
    return () => {
      frame.setActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Slow global drift behind the per-dot swarm (2 animated nodes total).
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    drift.value = withRepeat(withTiming(1, { duration: 18000 }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const driftStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(drift.value, [0, 1], [-5, 5])}deg` },
      { scale: interpolate(drift.value, [0, 1], [1, 1.03]) },
    ],
  }));

  useImperativeHandle(ref, () => ({
    morphTo(next, onMid, onDone) {
      const from = currentRef.current;
      if (next === from || reduceMotion) {
        onMid();
        onDone();
        return;
      }
      if (pulsingRef.current) {
        // Settle the formation first — reads as an intentional disperse
        // before travelling to the next shape. Assigning a new animation
        // also cancels the pulse repeat.
        pulsingRef.current = false;
        progress.value = withTiming(0, { duration: PULSE_SETTLE_MS }, finished => {
          'worklet';
          if (finished) runOnJS(beginMorph)(next, onMid, onDone);
        });
        return;
      }
      beginMorph(next, onMid, onDone);
    },
  }));

  const beginMorph = (next: number, onMid: () => void, onDone: () => void) => {
    const from = currentRef.current;
    setSegment({ from, to: next });
    progress.value = 0;
    timers.current.push(setTimeout(onMid, Math.round(MORPH_MS * 0.55)));
    progress.value = withTiming(
      1,
      { duration: MORPH_MS, easing: Easing.inOut(Easing.cubic) },
      finished => {
        'worklet';
        if (finished) {
          runOnJS(handleSettled)(next, onDone);
        }
      },
    );
  };

  const startPulse = (page: number) => {
    const cfg = PULSE_BY_PAGE[page];
    if (!cfg) return;
    pulsingRef.current = true;
    setSegment({ from: page, to: cfg.layout });
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: cfg.form,
          easing: Easing.inOut(Easing.cubic),
        }),
        // Same-value holds act as timed pauses.
        withTiming(1, { duration: cfg.hold }),
        withTiming(0, {
          duration: cfg.disperse,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(0, { duration: cfg.rest }),
      ),
      -1,
    );
  };

  const handleSettled = (next: number, onDone: () => void) => {
    currentRef.current = next;
    setSegment({ from: next, to: next });
    onDone();
    if (PULSE_BY_PAGE[next] && !reduceMotion) startPulse(next);
  };

  if (reduceMotion) {
    const dots = layouts[MORPH_LAYOUT_KEYS[segment.to]];
    return (
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {dots.map((d, i) => (
          <Circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={d.r * 0.32}
            fill="#FFFFFF"
            opacity={d.opacity}
          />
        ))}
      </Svg>
    );
  }

  const fromDots = layouts[MORPH_LAYOUT_KEYS[segment.from]];
  const toDots = layouts[MORPH_LAYOUT_KEYS[segment.to]];

  return (
    <Animated.View style={[styles.fill, driftStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {fromDots.map((d, i) => (
          <MorphDot
            key={i}
            ax={d.x}
            ay={d.y}
            bx={toDots[i].x}
            by={toDots[i].y}
            r={d.r * 0.32}
            opacity={d.opacity}
            phase={motion[i].phase}
            speed={motion[i].speed}
            amp={motion[i].amp}
            stagger={motion[i].stagger}
            progress={progress}
            time={time}
          />
        ))}
      </Svg>
    </Animated.View>
  );
});

export default MorphField;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
