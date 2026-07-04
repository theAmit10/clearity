import React, { useState } from 'react';
import { Pressable, PressableProps, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Raised from './Raised';
import { colors } from './theme';

interface NeumorphicPressableProps extends PressableProps {
  children: React.ReactNode;
  radius?: number;
  distance?: number;
  surfaceColor?: string;
  containerStyle?: ViewStyle;
  scaleTo?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const pressedBg: ViewStyle = {
  backgroundColor: '#DADFE7',
  borderTopWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.5)',
  borderLeftWidth: 1,
  borderLeftColor: 'rgba(255,255,255,0.35)',
  borderRightWidth: 1,
  borderRightColor: 'rgba(179,187,201,0.25)',
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(179,187,201,0.15)',
};

export default function NeumorphicPressable({
  children,
  radius = 16,
  distance = 5,
  surfaceColor = colors.background,
  containerStyle,
  scaleTo = 0.96,
  ...rest
}: NeumorphicPressableProps) {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle: ViewStyle = {
    borderRadius: radius,
    ...containerStyle,
  };

  return (
    <AnimatedPressable
      onPressIn={e => {
        setIsPressed(true);
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 150 });
        rest.onPressIn?.(e);
      }}
      onPressOut={e => {
        setIsPressed(false);
        scale.value = withSpring(1, { damping: 15, stiffness: 150 });
        rest.onPressOut?.(e);
      }}
      style={animStyle}
      {...rest}
    >
      {isPressed ? (
        <View style={{ padding: distance }}>
          <View style={[innerStyle, pressedBg]}>{children}</View>
        </View>
      ) : (
        <Raised
          radius={radius}
          distance={distance}
          surfaceColor={surfaceColor}
          containerStyle={containerStyle}
        >
          {children}
        </Raised>
      )}
    </AnimatedPressable>
  );
}
