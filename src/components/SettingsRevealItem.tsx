import React from 'react';
import Animated, {
  Extrapolation,
  SharedTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Shared element tags pairing each Settings section card with the top card
 * (or header block) of its destination screen. Source tags live in
 * `SettingsScreen`; matching tags live in the destination screens.
 *
 * Paywall modals are `presentation: modal` — shared element
 * morphs are unreliable on modals (and several sections funnel into the same
 * Paywall), so modals intentionally have no tag and fall back to the
 * platform modal animation.
 */
export const SETTINGS_SHARED_TAGS = {
  general: 'settings-general-card',
  habits: 'settings-habits-card',
  pro: 'settings-pro-card',
  widget: 'settings-widget-card',
  analytics: 'settings-analytics-card',
  notifications: 'settings-notifications-card',
  language: 'settings-language-card',
} as const;

/** Shared fade + resize morph used by every settings card transition. */
export const settingsCardTransition =
  typeof (SharedTransition as any)?.duration === 'function'
    ? (SharedTransition as any).duration(320)
    : undefined;

interface Props {
  scrollY: SharedValue<number>;
  viewportHeight: number;
  style?: React.ComponentProps<typeof Animated.View>['style'];
  children: React.ReactNode;
}

/**
 * Scroll-driven reveal wrapper: fades + slides content up as it enters the
 * viewport (opacity 0 → 1, translateY 24 → 0). Driven by the parent
 * `Animated.ScrollView`'s `scrollY` shared value — no per-frame React
 * re-renders.
 */
export function SettingsRevealItem({
  scrollY,
  viewportHeight,
  style,
  children,
}: Props) {
  const layoutY = useSharedValue(-1);

  const animatedStyle = useAnimatedStyle(() => {
    if (layoutY.value < 0) {
      return { opacity: 0, transform: [{ translateY: 24 }] };
    }
    const start = layoutY.value - viewportHeight + 60;
    const end = layoutY.value - viewportHeight + 260;
    const p = interpolate(
      scrollY.value,
      [start, end],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: p, transform: [{ translateY: (1 - p) * 24 }] };
  });

  return (
    <Animated.View
      onLayout={e => {
        layoutY.value = e.nativeEvent.layout.y;
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </Animated.View>
  );
}
