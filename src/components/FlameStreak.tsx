import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  streak: number;
  size?: number;
  showLabel?: boolean;
}

// Endlessly oscillates 0 -> 1 -> 0.
function useOscillator(duration: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);
  return v;
}

// Endlessly loops 0 -> 1 (no reverse) — for things that travel one direction, like rising embers.
function useLoop(duration: number, delay = 0) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, []);
  return v;
}

// The flame's base sits around y=31 in the 0..40 viewBox. Anchoring every
// transform there (instead of the SVG default top-left origin) is what makes
// the stretch/rotate/sway read as "rooted fire flickering" instead of "shape
// sliding around the canvas".
const BASE_Y = 31;
const CX = 14;

export default function FlameStreak({
  streak,
  size = 16,
  showLabel = true,
}: Props) {
  const { theme } = useTheme();

  // Streak-based "heat" tier — longer streaks burn hotter/brighter as a visible reward.
  const tier = useMemo(() => {
    if (streak >= 100) return 'blazing';
    if (streak >= 30) return 'hot';
    return 'base';
  }, [streak]);

  // --- Oscillators, one pair per layer, each pair mixing two different periods
  // so the motion never falls into an obvious metronomic loop. Outer layers get
  // bigger amplitude + slower period (big lazy licks), inner layers get smaller
  // amplitude + faster period (jittery hot core) — matches how real fire behaves.
  const outerA = useOscillator(760, 0);
  const outerB = useOscillator(540, 120);
  const midA = useOscillator(610, 60);
  const midB = useOscillator(430, 200);
  const innerA = useOscillator(470, 30);
  const innerB = useOscillator(330, 160);
  const coreA = useOscillator(340, 0);
  const coreB = useOscillator(230, 90);
  const hotA = useOscillator(210, 0);
  const hotB = useOscillator(140, 50);

  const bodySwayA = useOscillator(1900, 0);
  const bodySwayB = useOscillator(1200, 150);
  const bodyTilt = useOscillator(2300, 80);

  const glowPulse = useOscillator(1500, 0);
  const wispFlicker = useOscillator(340, 0);
  const wispRise = useLoop(950, 0);

  const ember1 = useLoop(2600, 0);
  const ember2 = useLoop(3100, 500);
  const ember3 = useLoop(2200, 900);
  const ember4 = useLoop(2900, 1300);

  // Whole-flame drift, like a candle in a soft draft.
  const sway = useDerivedValue(
    () => (bodySwayA.value - 0.5) * 1.2 + (bodySwayB.value - 0.5) * 0.5,
  );
  const tilt = useDerivedValue(() => (bodyTilt.value - 0.5) * 2.2);
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sway.value }, { rotate: `${tilt.value}deg` }],
  }));

  // Builds a base-anchored SVG transform string: gentle horizontal wag,
  // vertical stretch/squash, and a touch of rotation, all pinned to (CX, BASE_Y)
  // so the flame looks rooted rather than sliding.
  // NOTE: we deliberately return `matrix` (a plain 6-number array), never a prop
  // literally named `transform`. Reanimated intercepts any prop called `transform`
  // and tries to parse it as a React Native style transform array, which breaks
  // with SVG's transform-string/matrix conventions and throws "invalidTransform".
  // `matrix` isn't special-cased, so it passes straight through to react-native-svg.
  const makeLayerTransform = (
    oscA: SharedValue<number>,
    oscB: SharedValue<number>,
    swayAmp: number,
    stretchAmp: number,
    rotateAmp: number,
  ) =>
    useAnimatedProps(() => {
      'worklet';
      const a = oscA.value - 0.5;
      const b = oscB.value - 0.5;
      const dx = a * swayAmp + b * swayAmp * 0.5;
      const sy = 1 + a * stretchAmp - b * stretchAmp * 0.6;
      const theta = (b * rotateAmp * Math.PI) / 180;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Combined affine matrix for: translate(dx, 0) + anchored-rotate(theta) +
      // anchored-scale(1, sy) around (CX, BASE_Y). Derived by composing
      // translate -> origin-shift -> scale -> rotate -> origin-shift-back, so the
      // layer stretches/rotates from the flame's base instead of (0,0).
      const matrix = [
        cos,
        sin,
        -sin * sy,
        cos * sy,
        -cos * CX + sin * sy * BASE_Y + CX + dx,
        -sin * CX - cos * sy * BASE_Y + BASE_Y,
      ];
      return { matrix } as any;
    });
 
  const outerTransform = makeLayerTransform(outerA, outerB, 0.9, 0.05, 2.2);
  const midTransform = makeLayerTransform(midA, midB, 0.65, 0.045, 1.7);
  const innerTransform = makeLayerTransform(innerA, innerB, 0.45, 0.04, 1.2);
  const coreTransform = makeLayerTransform(coreA, coreB, 0.3, 0.035, 0.8);
  const hotTransform = makeLayerTransform(hotA, hotB, 0.2, 0.05, 0.5);

  const outerOpacity = useAnimatedProps(() => ({
    opacity: 0.88 + (outerA.value - 0.5) * 0.24,
  }));
  const midOpacity = useAnimatedProps(() => ({
    opacity: 0.72 + (midB.value - 0.5) * 0.4,
  }));
  const innerOpacity = useAnimatedProps(() => ({
    opacity: 0.55 + (innerB.value - 0.5) * 0.6,
  }));
  const coreOpacity = useAnimatedProps(() => ({
    opacity: 0.65 + (coreB.value - 0.5) * 0.7,
  }));
  const hotOpacity = useAnimatedProps(() => ({
    opacity: 0.5 + (hotB.value - 0.5) * 1.0,
  }));

  const glowProps = useAnimatedProps(() => ({
    opacity: 0.1 + glowPulse.value * 0.22,
    rx: 12 + glowPulse.value * 1.6,
    ry: 15 + glowPulse.value * 2,
  }));

  // Small breakaway wisp: reuses the same "core" silhouette, scaled down and
  // floated above the tip, rising and fading on a loop. Because it's the same
  // proven path (just repositioned), there's no risk of a malformed shape.
  const wispProps = useAnimatedProps(() => {
    'worklet';
    const rise = wispRise.value;
    const flicker = wispFlicker.value - 0.5;
    const dy = -rise * 9;
    const dx = flicker * 1.4;
    const s = 0.55 - rise * 0.25;
    const opacity = Math.max(0, 0.55 - rise * 0.6) * (0.6 + Math.abs(flicker));
    // Pure translate+scale (no rotation), expressed as a matrix for the same
    // reason as makeLayerTransform above: avoid the `transform`-prop clash.
    return {
      matrix: [s, 0, 0, s, 14 + dx - 14 * s, 4 + dy - 13 * s],
      opacity,
    } as any;
  });

  const makeEmberProps = (
    osc: SharedValue<number>,
    startY: number,
    endY: number,
    baseX: number,
    fadeIn: number,
    driftAmp: number,
    freq: number,
  ) =>
    useAnimatedProps(() => {
      'worklet';
      const p = osc.value;
      const cy = startY - p * (startY - endY);
      const cx = baseX + Math.sin(p * Math.PI * freq) * driftAmp;
      const opacity =
        p < fadeIn ? p / fadeIn : Math.max(0, 1 - (p - fadeIn) / (1 - fadeIn));
      const r = 0.5 + (1 - p) * 0.4;
      return { rx: r, ry: r * 1.4, cx, cy, opacity };
    });

  const ember1Props = makeEmberProps(ember1, 24, 1, 8, 0.5, 1.1, 3);
  const ember2Props = makeEmberProps(ember2, 26, 3, 20, 0.4, 1.0, 2.6);
  const ember3Props = makeEmberProps(ember3, 22, -1, 14, 0.6, 1.3, 3.6);
  const ember4Props = makeEmberProps(ember4, 25, 2, 11, 0.45, 0.9, 2.2);

  const w = size;
  const h = size * 1.45;

  const palette = {
    base: {
      outer: ['#B8301A', '#D9451A', '#F56820', '#FF8C00'],
      mid: ['#D9451A', '#F57A20', '#FFA500'],
      inner: ['#F57A20', '#FFA500', '#FFCC00'],
      core: ['#FFA500', '#FFD700', '#FFEA00'],
      hot: '#FFF9C4',
      glow: '#FF4500',
    },
    hot: {
      outer: ['#C23A15', '#E4551A', '#FF7A1F', '#FFA500'],
      mid: ['#E4551A', '#FF9020', '#FFC700'],
      inner: ['#FF9020', '#FFC700', '#FFE566'],
      core: ['#FFC700', '#FFE566', '#FFF7B0'],
      hot: '#FFFDE7',
      glow: '#FF6A00',
    },
    blazing: {
      outer: ['#5A2CA0', '#9B3ED6', '#4FC3F7', '#B3E5FC'],
      mid: ['#7B3FE4', '#4FC3F7', '#B3E5FC'],
      inner: ['#4FC3F7', '#81D4FA', '#E1F5FE'],
      core: ['#81D4FA', '#E1F5FE', '#FFFFFF'],
      hot: '#FFFFFF',
      glow: '#5AC8FA',
    },
  }[tier];

  return (
    <View style={styles.row}>
      <Animated.View style={bodyStyle}>
        <Svg width={w} height={h} viewBox="0 0 28 40">
          <Defs>
            <LinearGradient id="fOuter" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palette.outer[0]} />
              <Stop offset="0.35" stopColor={palette.outer[1]} />
              <Stop offset="0.7" stopColor={palette.outer[2]} />
              <Stop offset="1" stopColor={palette.outer[3]} />
            </LinearGradient>
            <LinearGradient id="fMid" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palette.mid[0]} />
              <Stop offset="0.5" stopColor={palette.mid[1]} />
              <Stop offset="1" stopColor={palette.mid[2]} />
            </LinearGradient>
            <LinearGradient id="fInner" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palette.inner[0]} />
              <Stop offset="0.45" stopColor={palette.inner[1]} />
              <Stop offset="1" stopColor={palette.inner[2]} />
            </LinearGradient>
            <LinearGradient id="fCore" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={palette.core[0]} />
              <Stop offset="0.5" stopColor={palette.core[1]} />
              <Stop offset="1" stopColor={palette.core[2]} />
            </LinearGradient>
            <RadialGradient id="fGlowGrad" cx="0.5" cy="0.55" r="0.6">
              <Stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
              <Stop offset="1" stopColor={palette.glow} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Ambient glow bleed behind everything */}
          <AnimatedEllipse
            cx={14}
            cy={20}
            rx={12}
            ry={15}
            fill="url(#fGlowGrad)"
            animatedProps={glowProps}
          />

          {/* Breakaway tip wisp — a fragment that peels off the top and fades as it rises */}
          <AnimatedPath
            d="M14 13 C15.5 16 17.5 17 17 21 C16.5 23.5 15 25 14 25 C13 25 11.5 23.5 11 21 C10.5 17 12.5 16 14 13 Z"
            fill="url(#fCore)"
            animatedProps={wispProps}
          />

          {/* Outer body — same silhouette as the original, but now each layer
              independently stretches/wags/rotates around the flame's base
              instead of the whole icon moving as one rigid block. */}
          <AnimatedG animatedProps={outerTransform}>
            <AnimatedPath
              d="M14 4 C17.5 9 23 13 22 21 C21 27 18 31 14 31 C10 31 7 27 6 21 C5 13 10.5 9 14 4 Z"
              fill="url(#fOuter)"
              animatedProps={outerOpacity}
            />
          </AnimatedG>

          <AnimatedG animatedProps={midTransform}>
            <AnimatedPath
              d="M14 7 C16.5 11 21 14 20 21 C19 26 16.5 29 14 29 C11.5 29 9 26 8 21 C7 14 11.5 11 14 7 Z"
              fill="url(#fMid)"
              animatedProps={midOpacity}
            />
          </AnimatedG>

          <AnimatedG animatedProps={innerTransform}>
            <AnimatedPath
              d="M14 10 C16 13 19 15 18.5 21 C18 25 16 27 14 27 C12 27 10 25 9.5 21 C9 15 12 13 14 10 Z"
              fill="url(#fInner)"
              animatedProps={innerOpacity}
            />
          </AnimatedG>

          <AnimatedG animatedProps={coreTransform}>
            <AnimatedPath
              d="M14 13 C15.5 16 17.5 17 17 21 C16.5 23.5 15 25 14 25 C13 25 11.5 23.5 11 21 C10.5 17 12.5 16 14 13 Z"
              fill="url(#fCore)"
              animatedProps={coreOpacity}
            />
          </AnimatedG>

          <AnimatedG animatedProps={hotTransform}>
            <AnimatedPath
              d="M14 16 C15 18 16 19 15.5 21 C15 22.5 14.5 23 14 23 C13.5 23 13 22.5 12.5 21 C12 19 13 18 14 16 Z"
              fill={palette.hot}
              animatedProps={hotOpacity}
            />
          </AnimatedG>

          {/* Rising embers */}
          <AnimatedEllipse fill={palette.core[2]} animatedProps={ember1Props} />
          <AnimatedEllipse
            fill={palette.outer[2]}
            animatedProps={ember2Props}
          />
          <AnimatedEllipse fill={palette.hot} animatedProps={ember3Props} />
          <AnimatedEllipse fill={palette.mid[2]} animatedProps={ember4Props} />
        </Svg>
      </Animated.View>
      {showLabel && streak > 0 && (
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>
          {streak}d
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// import React, { useEffect, useMemo } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import Svg, {
//   Path,
//   Ellipse,
//   Defs,
//   LinearGradient,
//   RadialGradient,
//   Stop,
// } from 'react-native-svg';
// import Animated, {
//   useAnimatedProps,
//   useAnimatedStyle,
//   useSharedValue,
//   useDerivedValue,
//   withRepeat,
//   withTiming,
//   withDelay,
//   Easing,
//   SharedValue,
// } from 'react-native-reanimated';
// import { useTheme } from '../theme/ThemeProvider';

// const AnimatedPath = Animated.createAnimatedComponent(Path);
// const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// interface Props {
//   streak: number;
//   size?: number;
//   showLabel?: boolean;
// }

// // Endlessly oscillates 0 -> 1 -> 0. Multiple of these, summed with different
// // periods/phases/weights, is what makes the flame feel alive instead of
// // mechanically looping.
// function useOscillator(duration: number, delay = 0) {
//   const v = useSharedValue(0);
//   useEffect(() => {
//     v.value = withDelay(
//       delay,
//       withRepeat(
//         withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
//         -1,
//         true,
//       ),
//     );
//   }, []);
//   return v;
// }

// // Endlessly loops 0 -> 1 (no reverse) — used for things that travel one direction,
// // like rising embers.
// function useLoop(duration: number, delay = 0) {
//   const v = useSharedValue(0);
//   useEffect(() => {
//     v.value = withDelay(
//       delay,
//       withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
//     );
//   }, []);
//   return v;
// }

// // Builds a smooth, closed flame silhouette from a small set of shape parameters.
// // Everything is expressed as an offset from the vertical centerline (x = 14) so
// // the whole outline can bow left/right/asymmetrically as the params change —
// // this is what replaces the old separate "side lobe" shapes with one continuous
// // living outline.
// function flamePath(
//   topY: number,
//   botY: number,
//   halfW: number,
//   tipShift: number,
//   rBulge: number,
//   lBulge: number,
//   rWaist: number,
//   lWaist: number,
// ) {
//   'worklet';
//   const cx = 14;
//   const h = botY - topY;
//   const topX = cx + tipShift;
//   const bulgeY = topY + h * 0.32;
//   const waistY = topY + h * 0.66;
//   const bR = cx + halfW * rBulge;
//   const bL = cx - halfW * lBulge;
//   const wR = cx + halfW * rWaist;
//   const wL = cx - halfW * lWaist;
//   const baseR = cx + halfW * 0.5;
//   const baseL = cx - halfW * 0.5;

//   return (
//     `M${topX.toFixed(2)},${topY.toFixed(2)} ` +
//     `C${(bR + 1.5).toFixed(2)},${(topY + h * 0.18).toFixed(2)} ${bR.toFixed(
//       2,
//     )},${bulgeY.toFixed(2)} ${wR.toFixed(2)},${waistY.toFixed(2)} ` +
//     `C${(wR + 0.6).toFixed(2)},${(botY - h * 0.14).toFixed(2)} ${(
//       baseR + 0.4
//     ).toFixed(2)},${(botY - 2).toFixed(2)} ${baseR.toFixed(2)},${botY.toFixed(
//       2,
//     )} ` +
//     `Q${cx.toFixed(2)},${(botY + 0.6).toFixed(2)} ${baseL.toFixed(
//       2,
//     )},${botY.toFixed(2)} ` +
//     `C${(baseL - 0.4).toFixed(2)},${(botY - 2).toFixed(2)} ${(wL - 0.6).toFixed(
//       2,
//     )},${(botY - h * 0.14).toFixed(2)} ${wL.toFixed(2)},${waistY.toFixed(2)} ` +
//     `C${bL.toFixed(2)},${bulgeY.toFixed(2)} ${(bL - 1.5).toFixed(2)},${(
//       topY +
//       h * 0.18
//     ).toFixed(2)} ${topX.toFixed(2)},${topY.toFixed(2)} Z`
//   );
// }

// export default function FlameStreak({
//   streak,
//   size = 16,
//   showLabel = true,
// }: Props) {
//   const { theme } = useTheme();

//   // Streak-based "heat" tier — longer streaks burn hotter/brighter as a visible reward.
//   const tier = useMemo(() => {
//     if (streak >= 100) return 'blazing';
//     if (streak >= 30) return 'hot';
//     return 'base';
//   }, [streak]);

//   // --- Shape oscillators (drive the actual outline, not just opacity) ---
//   const rBulgeOsc = useOscillator(640, 0);
//   const lBulgeOsc = useOscillator(780, 140);
//   const rWaistOsc = useOscillator(520, 260);
//   const lWaistOsc = useOscillator(700, 60);
//   const tipOsc = useOscillator(1250, 0);
//   const tipOsc2 = useOscillator(430, 90);

//   // --- Body sway/tilt (whole flame drifting, like a candle in a draft) ---
//   const swayA = useOscillator(1900, 0);
//   const swayB = useOscillator(1200, 150);
//   const tiltA = useOscillator(2300, 80);

//   const sway = useDerivedValue(
//     () => (swayA.value - 0.5) * 1.3 + (swayB.value - 0.5) * 0.6,
//   );
//   const tilt = useDerivedValue(() => (tiltA.value - 0.5) * 2.6);
//   const animStyle = useAnimatedStyle(() => ({
//     transform: [{ translateX: sway.value }, { rotate: `${tilt.value}deg` }],
//   }));

//   // --- Glow + tip wisp + embers ---
//   const glowPulse = useOscillator(1500, 0);
//   const wispOsc = useOscillator(380, 0);
//   const wispRise = useLoop(900, 0);

//   const ember1 = useLoop(2600, 0);
//   const ember2 = useLoop(3100, 500);
//   const ember3 = useLoop(2200, 900);
//   const ember4 = useLoop(2900, 1300);

//   const animGlow = useAnimatedProps(() => ({
//     opacity: 0.1 + glowPulse.value * 0.22,
//     rx: 12 + glowPulse.value * 1.6,
//     ry: 15 + glowPulse.value * 2,
//   }));

//   // Layer builder: each nested layer wobbles LESS than the one outside it —
//   // real flames are most turbulent at the outer edge and calmest at the core.
//   const makeLayerProps = (
//     topY: number,
//     botY: number,
//     halfW: number,
//     amp: number,
//     tipAmp: number,
//   ) =>
//     useAnimatedProps(() => {
//       const tip =
//         (tipOsc.value - 0.5) * tipAmp + (tipOsc2.value - 0.5) * tipAmp * 0.4;
//       const rB = 0.62 + (rBulgeOsc.value - 0.5) * amp;
//       const lB = 0.62 + (lBulgeOsc.value - 0.5) * amp;
//       const rW = 0.34 + (rWaistOsc.value - 0.5) * amp * 0.6;
//       const lW = 0.34 + (lWaistOsc.value - 0.5) * amp * 0.6;
//       return { d: flamePath(topY, botY, halfW, tip, rB, lB, rW, lW) };
//     });

//   const outerProps = makeLayerProps(3, 32, 11.2, 0.5, 1.6);
//   const midProps = makeLayerProps(6.6, 29.4, 8.6, 0.4, 1.3);
//   const innerProps = makeLayerProps(10, 27, 6.3, 0.32, 1.0);
//   const coreProps = makeLayerProps(13.2, 25, 4.1, 0.22, 0.7);
//   const hotProps = makeLayerProps(16.2, 22.8, 2.4, 0.16, 0.5);

//   const wispProps = useAnimatedProps(() => {
//     const rise = wispRise.value;
//     const flicker = wispOsc.value;
//     const topY = 1 - rise * 3;
//     return {
//       d: flamePath(
//         topY,
//         topY + 5.5,
//         2.2 - rise * 1.2,
//         (flicker - 0.5) * 1.4,
//         0.7,
//         0.65,
//         0.3,
//         0.28,
//       ),
//       opacity: Math.max(0, 0.5 - rise * 0.55) * (0.6 + flicker * 0.4),
//     };
//   });

//   const makeEmberProps = (
//     osc: SharedValue<number>,
//     startY: number,
//     endY: number,
//     baseX: number,
//     fadeIn: number,
//     driftAmp: number,
//     freq: number,
//   ) =>
//     useAnimatedProps(() => {
//       'worklet';
//       const p = osc.value;
//       const cy = startY - p * (startY - endY);
//       const cx = baseX + Math.sin(p * Math.PI * freq) * driftAmp;
//       const opacity =
//         p < fadeIn ? p / fadeIn : Math.max(0, 1 - (p - fadeIn) / (1 - fadeIn));
//       const r = 0.5 + (1 - p) * 0.4;
//       return {
//         rx: r,
//         ry: r * 1.4,
//         cx,
//         cy,
//         opacity,
//       };
//     });

//   const ember1Props = makeEmberProps(ember1, 24, 1, 8, 0.5, 1.1, 3);
//   const ember2Props = makeEmberProps(ember2, 26, 3, 20, 0.4, 1.0, 2.6);
//   const ember3Props = makeEmberProps(ember3, 22, -1, 14, 0.6, 1.3, 3.6);
//   const ember4Props = makeEmberProps(ember4, 25, 2, 11, 0.45, 0.9, 2.2);

//   const w = size;
//   const h = size * 1.45;

//   const palette = {
//     base: {
//       outer: ['#B8301A', '#D9451A', '#F56820', '#FF8C00'],
//       mid: ['#D9451A', '#F57A20', '#FFA500'],
//       inner: ['#F57A20', '#FFA500', '#FFCC00'],
//       core: ['#FFA500', '#FFD700', '#FFEA00'],
//       hot: '#FFF9C4',
//       glow: '#FF4500',
//     },
//     hot: {
//       outer: ['#C23A15', '#E4551A', '#FF7A1F', '#FFA500'],
//       mid: ['#E4551A', '#FF9020', '#FFC700'],
//       inner: ['#FF9020', '#FFC700', '#FFE566'],
//       core: ['#FFC700', '#FFE566', '#FFF7B0'],
//       hot: '#FFFDE7',
//       glow: '#FF6A00',
//     },
//     blazing: {
//       outer: ['#5A2CA0', '#9B3ED6', '#4FC3F7', '#B3E5FC'],
//       mid: ['#7B3FE4', '#4FC3F7', '#B3E5FC'],
//       inner: ['#4FC3F7', '#81D4FA', '#E1F5FE'],
//       core: ['#81D4FA', '#E1F5FE', '#FFFFFF'],
//       hot: '#FFFFFF',
//       glow: '#5AC8FA',
//     },
//   }[tier];

//   return (
//     <View style={styles.row}>
//       <Animated.View style={animStyle}>
//         <Svg width={w} height={h} viewBox="0 0 28 40">
//           <Defs>
//             <LinearGradient id="fOuter" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.outer[0]} />
//               <Stop offset="0.35" stopColor={palette.outer[1]} />
//               <Stop offset="0.7" stopColor={palette.outer[2]} />
//               <Stop offset="1" stopColor={palette.outer[3]} />
//             </LinearGradient>
//             <LinearGradient id="fMid" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.mid[0]} />
//               <Stop offset="0.5" stopColor={palette.mid[1]} />
//               <Stop offset="1" stopColor={palette.mid[2]} />
//             </LinearGradient>
//             <LinearGradient id="fInner" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.inner[0]} />
//               <Stop offset="0.45" stopColor={palette.inner[1]} />
//               <Stop offset="1" stopColor={palette.inner[2]} />
//             </LinearGradient>
//             <LinearGradient id="fCore" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.core[0]} />
//               <Stop offset="0.5" stopColor={palette.core[1]} />
//               <Stop offset="1" stopColor={palette.core[2]} />
//             </LinearGradient>
//             <RadialGradient id="fGlowGrad" cx="0.5" cy="0.55" r="0.6">
//               <Stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
//               <Stop offset="1" stopColor={palette.glow} stopOpacity="0" />
//             </RadialGradient>
//           </Defs>

//           {/* Ambient glow bleed */}
//           <AnimatedEllipse
//             cx={14}
//             cy={20}
//             rx={12}
//             ry={15}
//             fill="url(#fGlowGrad)"
//             animatedProps={animGlow}
//           />

//           {/* Breakaway tip wisp — a small flame fragment that peels off the top and fades,
//               the detail real fire has that CSS-loop flames usually miss */}
//           <AnimatedPath fill="url(#fOuter)" animatedProps={wispProps} />

//           {/* Nested, independently-morphing flame body layers */}
//           <AnimatedPath fill="url(#fOuter)" animatedProps={outerProps} />
//           <AnimatedPath fill="url(#fMid)" animatedProps={midProps} />
//           <AnimatedPath fill="url(#fInner)" animatedProps={innerProps} />
//           <AnimatedPath fill="url(#fCore)" animatedProps={coreProps} />
//           <AnimatedPath fill={palette.hot} animatedProps={hotProps} />

//           {/* Rising embers / sparks, drawn as tapering ellipses rather than plain dots */}
//           <AnimatedEllipse fill={palette.core[2]} animatedProps={ember1Props} />
//           <AnimatedEllipse
//             fill={palette.outer[2]}
//             animatedProps={ember2Props}
//           />
//           <AnimatedEllipse fill={palette.hot} animatedProps={ember3Props} />
//           <AnimatedEllipse fill={palette.mid[2]} animatedProps={ember4Props} />
//         </Svg>
//       </Animated.View>
//       {showLabel && streak > 0 && (
//         <Text style={[styles.label, { color: theme.colors.textMuted }]}>
//           {streak}d
//         </Text>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//   },
// });

// import React, { useEffect, useMemo } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import Svg, {
//   Path,
//   Circle,
//   Ellipse,
//   Defs,
//   LinearGradient,
//   RadialGradient,
//   Stop,
// } from 'react-native-svg';
// import Animated, {
//   useAnimatedProps,
//   useAnimatedStyle,
//   useSharedValue,
//   useDerivedValue,
//   withRepeat,
//   withTiming,
//   withDelay,
//   Easing,
// } from 'react-native-reanimated';
// import { useTheme } from '../theme/ThemeProvider';

// const AnimatedPath = Animated.createAnimatedComponent(Path);
// const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// interface Props {
//   streak: number;
//   size?: number;
//   showLabel?: boolean;
// }

// // Small helper to drive an endlessly oscillating shared value.
// function useOscillator(
//   duration: number,
//   delay = 0,
//   easing = Easing.inOut(Easing.sin),
// ) {
//   const v = useSharedValue(0);
//   useEffect(() => {
//     v.value = withDelay(
//       delay,
//       withRepeat(withTiming(1, { duration, easing }), -1, true),
//     );
//   }, []);
//   return v;
// }

// // Small helper to drive an endlessly looping (non-reversing) shared value, e.g. for rising embers.
// function useLoop(duration: number, delay = 0) {
//   const v = useSharedValue(0);
//   useEffect(() => {
//     v.value = withDelay(
//       delay,
//       withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
//     );
//   }, []);
//   return v;
// }

// export default function FlameStreak({
//   streak,
//   size = 16,
//   showLabel = true,
// }: Props) {
//   const { theme } = useTheme();

//   // Streak-based "heat" tier — the longer the streak, the hotter/whiter the flame burns.
//   // This gives users a visible reward as their streak grows.
//   const tier = useMemo(() => {
//     if (streak >= 100) return 'blazing'; // white-blue hottest core
//     if (streak >= 30) return 'hot'; // brighter gold core
//     return 'base'; // classic orange
//     // (colors defined below per tier)
//   }, [streak]);

//   // --- Organic motion drivers -------------------------------------------------
//   // Multiple independent, differently-timed oscillators are summed together so the
//   // flame never looks like it's on a simple metronomic loop — real fire flickers
//   // with layered, semi-random rhythms.
//   const swayA = useOscillator(1900, 0);
//   const swayB = useOscillator(1200, 150);
//   const tiltA = useOscillator(2300, 80);
//   const tiltB = useOscillator(1500, 300);
//   const stretchA = useOscillator(900, 0);
//   const stretchB = useOscillator(1450, 220);
//   const squashA = useOscillator(1100, 60);

//   const glowPulse = useOscillator(1600, 0);
//   const outerFlicker = useOscillator(650, 0);
//   const midFlicker = useOscillator(420, 90);
//   const innerFlicker = useOscillator(280, 40);
//   const coreFlicker = useOscillator(190, 0);
//   const hotFlicker = useOscillator(140, 30);

//   // Rising embers — staggered durations/delays/x-positions so they never sync up.
//   const ember1 = useLoop(2600, 0);
//   const ember2 = useLoop(3100, 500);
//   const ember3 = useLoop(2200, 900);
//   const ember4 = useLoop(2900, 1300);
//   const ember5 = useLoop(3400, 1800);

//   // --- Derived transform values ------------------------------------------------
//   const sway = useDerivedValue(
//     () => (swayA.value - 0.5) * 1.6 + (swayB.value - 0.5) * 0.8,
//   );
//   const tilt = useDerivedValue(
//     () => (tiltA.value - 0.5) * 3.2 + (tiltB.value - 0.5) * 1.6,
//   );
//   const scaleY = useDerivedValue(
//     () => 1 + (stretchA.value - 0.5) * 0.09 + (stretchB.value - 0.5) * 0.05,
//   );
//   const scaleX = useDerivedValue(() => 1 - (squashA.value - 0.5) * 0.06);

//   const animStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: sway.value },
//       { rotate: `${tilt.value}deg` },
//       { scaleX: scaleX.value },
//       { scaleY: scaleY.value },
//     ],
//   }));

//   const animGlow = useAnimatedProps(() => ({
//     opacity: 0.1 + glowPulse.value * 0.22,
//     rx: 12 + glowPulse.value * 1.5,
//     ry: 15 + glowPulse.value * 2,
//   }));

//   const animOuter = useAnimatedProps(() => ({
//     opacity: 0.82 + outerFlicker.value * 0.18,
//   }));
//   const animMid = useAnimatedProps(() => ({
//     opacity: 0.65 + midFlicker.value * 0.35,
//   }));
//   const animInner = useAnimatedProps(() => ({
//     opacity: 0.4 + innerFlicker.value * 0.6,
//   }));
//   const animCore = useAnimatedProps(() => ({
//     opacity: 0.5 + coreFlicker.value * 0.5,
//   }));
//   const animHot = useAnimatedProps(() => ({
//     opacity: 0.35 + hotFlicker.value * 0.65,
//   }));

//   const ember1Props = useAnimatedProps(() => {
//     const p = ember1.value;
//     const y = 24 - p * 23;
//     const opacity = p < 0.5 ? p / 0.5 : Math.max(0, 1 - (p - 0.5) / 0.5);
//     return {
//       cy: y,
//       cx: 8 + Math.sin(p * 6) * 1,
//       opacity,
//       r: 0.55 + (1 - p) * 0.35,
//     };
//   });
//   const ember2Props = useAnimatedProps(() => {
//     const p = ember2.value;
//     const y = 26 - p * 21;
//     const opacity = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.6);
//     return {
//       cy: y,
//       cx: 20 - Math.sin(p * 5) * 1,
//       opacity,
//       r: 0.45 + (1 - p) * 0.35,
//     };
//   });
//   const ember3Props = useAnimatedProps(() => {
//     const p = ember3.value;
//     const y = 22 - p * 25;
//     const opacity = p < 0.6 ? p / 0.6 : Math.max(0, 1 - (p - 0.6) / 0.4);
//     return {
//       cy: y,
//       cx: 14 + Math.sin(p * 7) * 1.2,
//       opacity,
//       r: 0.6 + (1 - p) * 0.3,
//     };
//   });
//   const ember4Props = useAnimatedProps(() => {
//     const p = ember4.value;
//     const y = 25 - p * 20;
//     const opacity = p < 0.45 ? p / 0.45 : Math.max(0, 1 - (p - 0.45) / 0.55);
//     return {
//       cy: y,
//       cx: 11 - Math.sin(p * 4) * 0.8,
//       opacity,
//       r: 0.4 + (1 - p) * 0.3,
//     };
//   });
//   const ember5Props = useAnimatedProps(() => {
//     const p = ember5.value;
//     const y = 23 - p * 24;
//     const opacity = p < 0.55 ? p / 0.55 : Math.max(0, 1 - (p - 0.55) / 0.45);
//     return {
//       cy: y,
//       cx: 17 + Math.sin(p * 5.5) * 1,
//       opacity,
//       r: 0.5 + (1 - p) * 0.35,
//     };
//   });

//   const w = size;
//   const h = size * 1.45;

//   // Per-tier color ramps.
//   const palette = {
//     base: {
//       outer: ['#B8301A', '#D9451A', '#F56820', '#FF8C00'],
//       mid: ['#D9451A', '#F57A20', '#FFA500'],
//       inner: ['#F57A20', '#FFA500', '#FFCC00'],
//       core: ['#FFA500', '#FFD700', '#FFEA00'],
//       hot: '#FFF9C4',
//       glow: '#FF4500',
//     },
//     hot: {
//       outer: ['#C23A15', '#E4551A', '#FF7A1F', '#FFA500'],
//       mid: ['#E4551A', '#FF9020', '#FFC700'],
//       inner: ['#FF9020', '#FFC700', '#FFE566'],
//       core: ['#FFC700', '#FFE566', '#FFF7B0'],
//       hot: '#FFFDE7',
//       glow: '#FF6A00',
//     },
//     blazing: {
//       outer: ['#5A2CA0', '#9B3ED6', '#4FC3F7', '#B3E5FC'],
//       mid: ['#7B3FE4', '#4FC3F7', '#B3E5FC'],
//       inner: ['#4FC3F7', '#81D4FA', '#E1F5FE'],
//       core: ['#81D4FA', '#E1F5FE', '#FFFFFF'],
//       hot: '#FFFFFF',
//       glow: '#5AC8FA',
//     },
//   }[tier];

//   return (
//     <View style={styles.row}>
//       <Animated.View style={animStyle}>
//         <Svg width={w} height={h} viewBox="0 0 28 40">
//           <Defs>
//             <LinearGradient id="fOuter" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.outer[0]} />
//               <Stop offset="0.35" stopColor={palette.outer[1]} />
//               <Stop offset="0.7" stopColor={palette.outer[2]} />
//               <Stop offset="1" stopColor={palette.outer[3]} />
//             </LinearGradient>
//             <LinearGradient id="fMid" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.mid[0]} />
//               <Stop offset="0.5" stopColor={palette.mid[1]} />
//               <Stop offset="1" stopColor={palette.mid[2]} />
//             </LinearGradient>
//             <LinearGradient id="fInner" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.inner[0]} />
//               <Stop offset="0.45" stopColor={palette.inner[1]} />
//               <Stop offset="1" stopColor={palette.inner[2]} />
//             </LinearGradient>
//             <LinearGradient id="fCore" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor={palette.core[0]} />
//               <Stop offset="0.5" stopColor={palette.core[1]} />
//               <Stop offset="1" stopColor={palette.core[2]} />
//             </LinearGradient>
//             <RadialGradient id="fGlowGrad" cx="0.5" cy="0.55" r="0.6">
//               <Stop offset="0" stopColor={palette.glow} stopOpacity="0.55" />
//               <Stop offset="1" stopColor={palette.glow} stopOpacity="0" />
//             </RadialGradient>
//           </Defs>

//           {/* Soft ambient glow — layered radial gradient instead of a flat shape,
//               gives a believable "light bleeding outward" look without SVG filters. */}
//           <AnimatedEllipse
//             cx={14}
//             cy={20}
//             rx={12}
//             ry={15}
//             fill="url(#fGlowGrad)"
//             animatedProps={animGlow}
//           />

//           {/* Left side lick */}
//           <AnimatedPath
//             d="M6 23 C3.2 19.6 1 21.8 1.6 25.2 C2.1 28 4.3 29.2 6 27.4 C7.6 25.7 7.6 24.5 6 23 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Right side lick */}
//           <AnimatedPath
//             d="M22 23 C24.8 19.6 27 21.8 26.4 25.2 C25.9 28 23.7 29.2 22 27.4 C20.4 25.7 20.4 24.5 22 23 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Main flame body */}
//           <AnimatedPath
//             d="M14 3.2 C17.8 8.6 23.4 12.8 22.2 21.2 C21.2 27.4 18 31.4 14 31.4 C10 31.4 6.8 27.4 5.8 21.2 C4.6 12.8 10.2 8.6 14 3.2 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Mid flame layer */}
//           <AnimatedPath
//             d="M14 6.8 C16.7 10.9 21.2 14.1 20.1 20.9 C19.1 25.8 16.6 28.9 14 28.9 C11.4 28.9 8.9 25.8 7.9 20.9 C6.8 14.1 11.3 10.9 14 6.8 Z"
//             fill="url(#fMid)"
//             animatedProps={animMid}
//           />

//           {/* Inner flame layer */}
//           <AnimatedPath
//             d="M14 10.2 C16.1 13.2 19 15.1 18.4 20.8 C17.9 24.6 15.9 26.8 14 26.8 C12.1 26.8 10.1 24.6 9.6 20.8 C9 15.1 11.9 13.2 14 10.2 Z"
//             fill="url(#fInner)"
//             animatedProps={animInner}
//           />

//           {/* Core flame */}
//           <AnimatedPath
//             d="M14 13.4 C15.6 16.2 17.5 17.2 17 21 C16.5 23.4 15 24.9 14 24.9 C13 24.9 11.5 23.4 11 21 C10.5 17.2 12.4 16.2 14 13.4 Z"
//             fill="url(#fCore)"
//             animatedProps={animCore}
//           />

//           {/* White-hot center — flickers fastest, mimics the near-white base of a real flame */}
//           <AnimatedPath
//             d="M14 16.3 C15 18.1 16 19 15.5 21 C15 22.4 14.5 22.9 14 22.9 C13.5 22.9 13 22.4 12.5 21 C12 19 13 18.1 14 16.3 Z"
//             fill={palette.hot}
//             animatedProps={animHot}
//           />

//           {/* Rising embers / sparks */}
//           <AnimatedCircle fill={palette.core[2]} animatedProps={ember1Props} />
//           <AnimatedCircle fill={palette.outer[2]} animatedProps={ember2Props} />
//           <AnimatedCircle fill={palette.hot} animatedProps={ember3Props} />
//           <AnimatedCircle fill={palette.core[1]} animatedProps={ember4Props} />
//           <AnimatedCircle fill={palette.mid[2]} animatedProps={ember5Props} />
//         </Svg>
//       </Animated.View>
//       {showLabel && streak > 0 && (
//         <Text style={[styles.label, { color: theme.colors.textMuted }]}>
//           {streak}d
//         </Text>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//   },
// });

// import React, { useEffect } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
// import Animated, {
//   useAnimatedProps,
//   useAnimatedStyle,
//   useSharedValue,
//   withRepeat,
//   withTiming,
//   Easing,
// } from 'react-native-reanimated';
// import { useTheme } from '../theme/ThemeProvider';

// const AnimatedPath = Animated.createAnimatedComponent(Path);
// const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// interface Props {
//   streak: number;
//   size?: number;
//   showLabel?: boolean;
// }

// export default function FlameStreak({ streak, size = 16, showLabel = true }: Props) {
//   const { theme } = useTheme();

//   const scale = useSharedValue(1);
//   const sway = useSharedValue(0);
//   const tilt = useSharedValue(0);
//   const glowPulse = useSharedValue(0);
//   const outerPulse = useSharedValue(0);
//   const innerPulse = useSharedValue(0);
//   const corePulse = useSharedValue(0);
//   const ember1 = useSharedValue(0);
//   const ember2 = useSharedValue(0.3);
//   const ember3 = useSharedValue(0.7);

//   useEffect(() => {
//     scale.value = withRepeat(
//       withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     sway.value = withRepeat(
//       withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     tilt.value = withRepeat(
//       withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     glowPulse.value = withRepeat(
//       withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     outerPulse.value = withRepeat(
//       withTiming(1, { duration: 750, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     innerPulse.value = withRepeat(
//       withTiming(1, { duration: 450, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     corePulse.value = withRepeat(
//       withTiming(1, { duration: 300, easing: Easing.inOut(Easing.sin) }),
//       -1, true,
//     );
//     ember1.value = withRepeat(
//       withTiming(1, { duration: 2800, easing: Easing.linear }),
//       -1, false,
//     );
//     ember2.value = withRepeat(
//       withTiming(1, { duration: 3200, easing: Easing.linear }),
//       -1, false,
//     );
//     ember3.value = withRepeat(
//       withTiming(1, { duration: 2400, easing: Easing.linear }),
//       -1, false,
//     );
//   }, []);

//   const animStyle = useAnimatedStyle(() => ({
//     transform: [
//       { scale: scale.value },
//       { translateX: sway.value },
//       { rotate: `${tilt.value}deg` },
//     ],
//   }));

//   const animGlow = useAnimatedProps(() => ({
//     opacity: 0.06 + glowPulse.value * 0.14,
//   }));

//   const animOuter = useAnimatedProps(() => ({
//     opacity: 0.85 + outerPulse.value * 0.15,
//   }));

//   const animMid = useAnimatedProps(() => ({
//     opacity: 0.7 + innerPulse.value * 0.3,
//   }));

//   const animInner = useAnimatedProps(() => ({
//     opacity: 0.45 + innerPulse.value * 0.55,
//   }));

//   const animCore = useAnimatedProps(() => ({
//     opacity: 0.25 + corePulse.value * 0.75,
//   }));

//   const ember1Props = useAnimatedProps(() => {
//     const p = ember1.value;
//     const y = 24 - p * 22;
//     const opacity = p < 0.5 ? p / 0.5 : Math.max(0, 1 - (p - 0.5) / 0.5);
//     return { cy: y, opacity, r: 0.6 + p * 0.4 };
//   });

//   const ember2Props = useAnimatedProps(() => {
//     const p = ember2.value;
//     const y = 26 - p * 20;
//     const opacity = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.6);
//     return { cy: y, opacity, r: 0.5 + p * 0.5 };
//   });

//   const ember3Props = useAnimatedProps(() => {
//     const p = ember3.value;
//     const y = 22 - p * 24;
//     const opacity = p < 0.6 ? p / 0.6 : Math.max(0, 1 - (p - 0.6) / 0.4);
//     return { cy: y, opacity, r: 0.7 + p * 0.3 };
//   });

//   const w = size;
//   const h = size * 1.45;

//   return (
//     <View style={styles.row}>
//       <Animated.View style={animStyle}>
//         <Svg width={w} height={h} viewBox="0 0 28 40">
//           <Defs>
//             <LinearGradient id="fOuter" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor="#B8301A" />
//               <Stop offset="0.35" stopColor="#D9451A" />
//               <Stop offset="0.7" stopColor="#F56820" />
//               <Stop offset="1" stopColor="#FF8C00" />
//             </LinearGradient>
//             <LinearGradient id="fMid" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor="#D9451A" />
//               <Stop offset="0.5" stopColor="#F57A20" />
//               <Stop offset="1" stopColor="#FFA500" />
//             </LinearGradient>
//             <LinearGradient id="fInner" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor="#F57A20" />
//               <Stop offset="0.45" stopColor="#FFA500" />
//               <Stop offset="1" stopColor="#FFCC00" />
//             </LinearGradient>
//             <LinearGradient id="fCore" x1="0" y1="1" x2="0" y2="0">
//               <Stop offset="0" stopColor="#FFA500" />
//               <Stop offset="0.5" stopColor="#FFD700" />
//               <Stop offset="1" stopColor="#FFEA00" />
//             </LinearGradient>
//           </Defs>

//           {/* Outer glow */}
//           <AnimatedPath
//             d="M14 2 C19 8 26 12 25 21 C24 28 20 33 14 33 C8 33 4 28 3 21 C2 12 9 8 14 2 Z"
//             fill="#FF4500"
//             animatedProps={animGlow}
//           />

//           {/* Left side flicker */}
//           <AnimatedPath
//             d="M6 23 C3.5 20 1.5 22 2 25 C2.5 27.5 4.5 28.5 6 27 C7.5 25.5 7.5 24.5 6 23 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Right side flicker */}
//           <AnimatedPath
//             d="M22 23 C24.5 20 26.5 22 26 25 C25.5 27.5 23.5 28.5 22 27 C20.5 25.5 20.5 24.5 22 23 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Main flame body */}
//           <AnimatedPath
//             d="M14 4 C17.5 9 23 13 22 21 C21 27 18 31 14 31 C10 31 7 27 6 21 C5 13 10.5 9 14 4 Z"
//             fill="url(#fOuter)"
//             animatedProps={animOuter}
//           />

//           {/* Mid flame layer */}
//           <AnimatedPath
//             d="M14 7 C16.5 11 21 14 20 21 C19 26 16.5 29 14 29 C11.5 29 9 26 8 21 C7 14 11.5 11 14 7 Z"
//             fill="url(#fMid)"
//             animatedProps={animMid}
//           />

//           {/* Inner flame layer */}
//           <AnimatedPath
//             d="M14 10 C16 13 19 15 18.5 21 C18 25 16 27 14 27 C12 27 10 25 9.5 21 C9 15 12 13 14 10 Z"
//             fill="url(#fInner)"
//             animatedProps={animInner}
//           />

//           {/* Core flame */}
//           <AnimatedPath
//             d="M14 13 C15.5 16 17.5 17 17 21 C16.5 23.5 15 25 14 25 C13 25 11.5 23.5 11 21 C10.5 17 12.5 16 14 13 Z"
//             fill="url(#fCore)"
//             animatedProps={animCore}
//           />

//           {/* White-hot center */}
//           <AnimatedPath
//             d="M14 16 C15 18 16 19 15.5 21 C15 22.5 14.5 23 14 23 C13.5 23 13 22.5 12.5 21 C12 19 13 18 14 16 Z"
//             fill="#FFF9C4"
//             animatedProps={animCore}
//           />

//           {/* Ember particles */}
//           <AnimatedCircle cx={8} fill="#FFD700" animatedProps={ember1Props} />
//           <AnimatedCircle cx={20} fill="#FFA500" animatedProps={ember2Props} />
//           <AnimatedCircle cx={14} fill="#FFEA00" animatedProps={ember3Props} />
//         </Svg>
//       </Animated.View>
//       {showLabel && streak > 0 && (
//         <Text style={[styles.label, { color: theme.colors.textMuted }]}>
//           {streak}d
//         </Text>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   label: {
//     fontSize: 13,
//     fontWeight: '600',
//   },
// });
