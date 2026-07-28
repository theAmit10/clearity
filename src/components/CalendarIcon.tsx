import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, Circle, Line } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  size?: number;
}

export default function CalendarIcon({ size = 16 }: Props) {
  const { theme } = useTheme();
  const today = useMemo(() => new Date().getDate(), []);

  const scale = useSharedValue(0.7);
  const float = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 160 });

    float.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: (1 - float.value) * 1.2 },
    ],
  }));

  const w = size;
  const h = size * 1.25;

  return (
    <Animated.View style={animStyle}>
      <Svg width={w} height={h} viewBox="0 0 24 28">
        <Rect
          x={2}
          y={4.5}
          width={20}
          height={21.5}
          rx={3}
          fill={theme.colors.surface}
        />

        <Rect
          x={2}
          y={4.5}
          width={20}
          height={6.5}
          rx={3}
          fill={theme.colors.accent}
        />
        <Rect
          x={2}
          y={9}
          width={20}
          height={2}
          fill={theme.colors.accent}
        />

        <Line
          x1={4}
          y1={15}
          x2={20}
          y2={15}
          stroke={theme.colors.textMuted}
          strokeWidth={0.4}
          opacity={0.25}
        />
        <Line
          x1={4}
          y1={19}
          x2={20}
          y2={19}
          stroke={theme.colors.textMuted}
          strokeWidth={0.4}
          opacity={0.25}
        />
        <Line
          x1={4}
          y1={23}
          x2={20}
          y2={23}
          stroke={theme.colors.textMuted}
          strokeWidth={0.4}
          opacity={0.25}
        />

        <SvgText
          x={12}
          y={21.5}
          textAnchor="middle"
          fontSize={10}
          fontWeight="800"
          fill={theme.colors.textPrimary}
        >
          {today}
        </SvgText>
      </Svg>
    </Animated.View>
  );
}
