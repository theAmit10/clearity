import React, { useState } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { Raised, Inset } from './NeumorphicView';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  radius?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  /** Force the "pressed in" (inset) look regardless of touch state — used
   * for things like a completed calendar day, which should stay sunken
   * even when the finger isn't on it. */
  forcePressed?: boolean;
  backgroundColor?: string;
}

export function NeumorphicButton({
  children,
  onPress,
  disabled,
  radius = 16,
  distance = 6,
  style,
  forcePressed = false,
  backgroundColor,
}: Props) {
  const [touching, setTouching] = useState(false);
  const showInset = forcePressed || touching;
  const Wrapper = showInset ? Inset : Raised;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setTouching(true)}
      onPressOut={() => setTouching(false)}
    >
      <Wrapper radius={radius} style={style} backgroundColor={backgroundColor}>
        {children}
      </Wrapper>
    </Pressable>
  );
}
