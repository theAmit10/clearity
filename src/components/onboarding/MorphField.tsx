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
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  Canvas,
  Picture,
  Skia,
  type SkPicture,
} from '@shopify/react-native-skia';
import {
  CHECK_LAYOUT_INDEX,
  TARGET_LAYOUT_INDEX,
  MOUNTAIN_LAYOUT_INDEX,
  getCachedParticleTables,
} from './particleLayouts';

export interface MorphHandle {
  /** Animate atoms from the current shape to `next`. `onMid` swaps copy
   *  ~55% through; `onDone` fires when settled. Updates shared values
   *  only — no React re-render. No-ops while reduced motion. */
  morphTo: (next: number, onMid: () => void, onDone: () => void) => void;
}

const MORPH_MS = 1100;

// Formation pulse loops (form → hold → disperse → rest), keyed by page.
// Page 1 assembles the check, page 2 the goal target, page 3 the mountain.
// Drives the same `progress` value as page morphs.
const PULSE_SETTLE_MS = 250;
interface PulseConfig {
  layout: number;
  form: number;
  hold: number;
  disperse: number;
  rest: number;
}
const PULSE_BY_PAGE: Record<number, PulseConfig> = {
  1: {
    layout: CHECK_LAYOUT_INDEX,
    form: 1400,
    hold: 1200,
    disperse: 1400,
    rest: 1600,
  },
  2: {
    layout: TARGET_LAYOUT_INDEX,
    form: 1800,
    hold: 2000,
    disperse: 1800,
    rest: 1400,
  },
  3: {
    layout: MOUNTAIN_LAYOUT_INDEX,
    form: 1400,
    hold: 1200,
    disperse: 1400,
    rest: 1600,
  },
};

/**
 * Page → formation mapping. Pages 0..3 address their own shape; the theme
 * page (4) returns to the sphere — a full-circle "coming home" morph.
 */
const layoutFor = (page: number): number => (page >= 0 && page <= 3 ? page : 0);

function easeInOutCubic(t: number): number {
  'worklet';
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const MorphField = forwardRef<MorphHandle>(function MorphFieldInner(_, ref) {
  // Module-cached tables (warmed during the intro film): mounting here is
  // pure view creation, no layout math on the tap path.
  const tables = useMemo(() => getCachedParticleTables(), []);
  const tablesSV = useSharedValue(tables);
  const currentRef = useRef(0);
  const pulsingRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Static rest shape for the reduce-motion branch only.
  const [restIndex, setRestIndex] = useState(0);

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

  // Shared clock (seconds) — one UI-thread loop feeds the picture recorder.
  const time = useSharedValue(0);
  // Morph progress within the current from→to pair (0 → 1).
  const progress = useSharedValue(1);
  // Layout pair — the ONLY values morphs and pulses mutate.
  const fromIdx = useSharedValue(0);
  const toIdx = useSharedValue(0);
  // Canvas pixel size (written by Skia on layout, read by the recorder).
  const canvasSize = useSharedValue({ width: 0, height: 0 });

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

  // Slow global drift behind the per-dot swarm (2 animated nodes total:
  // this wrapper + the single Skia canvas).
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
        progress.value = withTiming(
          0,
          { duration: PULSE_SETTLE_MS },
          finished => {
            'worklet';
            if (finished) runOnJS(beginMorph)(next, onMid, onDone);
          },
        );
        return;
      }
      beginMorph(next, onMid, onDone);
    },
  }));

  const beginMorph = (next: number, onMid: () => void, onDone: () => void) => {
    const from = currentRef.current;
    fromIdx.value = layoutFor(from);
    toIdx.value = layoutFor(next);
    setRestIndex(layoutFor(next));
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
    fromIdx.value = page;
    toIdx.value = cfg.layout;
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
    fromIdx.value = layoutFor(next);
    toIdx.value = layoutFor(next);
    onDone();
    if (PULSE_BY_PAGE[next] && !reduceMotion) startPulse(next);
  };

  /**
   * The entire particle system as ONE Skia picture, re-recorded on the UI
   * thread whenever time/progress/layouts/size change. Pixel math mirrors
   * the old per-dot worklet exactly (staggered morph lerp + swarm wobble),
   * with exact per-dot radius and opacity — but 650 Fabric view updates
   * per frame collapse into a single GPU draw.
   */
  const picture = useDerivedValue<SkPicture>(() => {
    'worklet';
    const p = progress.value;
    const t = time.value;
    const tb = tablesSV.value;
    const f = fromIdx.value;
    const q = toIdx.value;
    const w = canvasSize.value.width;
    const h = canvasSize.value.height;
    const recorder = Skia.PictureRecorder();
    const c = recorder.beginRecording(
      w > 0 && h > 0 ? Skia.XYWHRect(0, 0, w, h) : undefined,
    );
    if (w > 0 && h > 0) {
      // Cover-fit the 100×100 viewBox exactly like the old SVG's
      // `preserveAspectRatio="xMidYMid slice"`.
      const s = Math.max(w, h) / 100;
      const ox = (w - 100 * s) / 2;
      const oy = (h - 100 * s) / 2;
      c.save();
      c.translate(ox, oy);
      c.scale(s, s);
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color('white'));
      const C = tb.count;
      for (let i = 0; i < C; i++) {
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
        const x =
          ax + (bx - ax) * e + Math.sin(t * speed + phase) * amp;
        const y =
          ay + (by - ay) * e + Math.cos(t * speed * 0.83 + phase * 1.7) * amp;
        paint.setAlphaf(tb.style[i * 2 + 1]);
        c.drawCircle(x, y, tb.style[i * 2], paint);
      }
      c.restore();
    }
    return recorder.finishRecordingAsPicture();
  });

  if (reduceMotion) {
    const C = tables.count;
    const dots = Array.from({ length: C }, (_unused, i) => ({
      x: tables.pos[(restIndex * C + i) * 2],
      y: tables.pos[(restIndex * C + i) * 2 + 1],
      r: tables.style[i * 2],
      opacity: tables.style[i * 2 + 1],
    }));
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
            r={d.r}
            fill="#FFFFFF"
            opacity={d.opacity}
          />
        ))}
      </Svg>
    );
  }

  return (
    <Animated.View style={[styles.fill, driftStyle]}>
      <Canvas style={styles.fill} onSize={canvasSize}>
        <Picture picture={picture} />
      </Canvas>
    </Animated.View>
  );
});

export default MorphField;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
