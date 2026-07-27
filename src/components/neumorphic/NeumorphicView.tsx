import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Neumorphic "soft UI" primitives — dependency-free.
 *
 * We intentionally do NOT use a shadow library here. Libraries like
 * react-native-shadow-2 measure/re-render their children asynchronously
 * and add their own invisible padding around the shadow shape, which is
 * exactly what was causing content to clip/disappear and calendar pages
 * to be mis-sized in the previous version. This version uses only plain
 * <View> + native shadow/elevation props, so sizing is 100% synchronous
 * and deterministic — what you pass in `style` is exactly the box that
 * gets shadowed, nothing more.
 *
 * How it works:
 * - The outer wrapper has NO size of its own — it sizes to fit its one
 *   normal-flow child (the "content" box). Two absolutely-positioned
 *   sibling layers (the dark shadow, the light shadow) stretch to match
 *   that same box automatically, since absolutely-positioned children
 *   never affect parent measurement.
 * - Each shadow layer is a solid, same-colored, same-shaped box offset
 *   diagonally with its own native shadow — because the content view on
 *   top fully covers the shape, only the soft shadow "halo" bleeding out
 *   past the edges is visible. That's the raised look.
 * - Android's `elevation` only supports a single dark shadow, so we pair
 *   it with a subtle light/dark border on the content edges to fake the
 *   catching-the-light look neumorphism needs.
 *
 * Raised  -> pops OUT of the background (default state).
 * Inset   -> pressed IN to the background (the "done"/active state).
 */

interface RaisedProps {
  children?: React.ReactNode;
  radius?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function Raised({
  children,
  radius = 16,
  distance = 6,
  style,
  backgroundColor: bgProp,
}: RaisedProps) {
  const { theme } = useTheme();
  const backgroundColor = bgProp ?? theme.colors.background;
  const blur = distance * 2;

  return (
    <View>
      {Platform.OS === 'ios' ? (
        <>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius,
                backgroundColor,
                shadowColor: theme.colors.shadowDark,
                shadowOffset: { width: distance, height: distance },
                shadowOpacity: 0.5,
                shadowRadius: blur,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius,
                backgroundColor,
                shadowColor: theme.colors.shadowLight,
                shadowOffset: { width: -distance, height: -distance },
                shadowOpacity: 0.9,
                shadowRadius: blur,
              },
            ]}
          />
        </>
      ) : (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              backgroundColor,
              elevation: distance,
              shadowColor: theme.colors.shadowDark,
            },
          ]}
        />
      )}

      <View
        style={[
          {
            borderRadius: radius,
            backgroundColor,
            borderTopWidth: 1,
            borderTopColor: theme.colors.shadowLight + '99',
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.shadowLight + '66',
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface InsetProps {
  children?: React.ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function Inset({
  children,
  radius = 16,
  style,
  backgroundColor: bgProp,
}: InsetProps) {
  const { theme } = useTheme();
  const backgroundColor = bgProp ?? theme.colors.insetFill;

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor,
          borderTopWidth: 1.5,
          borderTopColor: theme.colors.insetBorderDark,
          borderLeftWidth: 1.5,
          borderLeftColor: theme.colors.shadowDark + '66',
          borderBottomWidth: 1.5,
          borderBottomColor: theme.colors.insetBorderLight,
          borderRightWidth: 1.5,
          borderRightColor: theme.colors.shadowLight + '8C',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
