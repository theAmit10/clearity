import React, { useState } from 'react';
import { Pressable, PressableProps, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Raised from './Raised';
import { useTheme } from '../../theme/ThemeProvider';

interface NeumorphicPressableProps extends PressableProps {
  children: React.ReactNode;
  radius?: number;
  distance?: number;
  surfaceColor?: string;
  containerStyle?: ViewStyle;
  scaleTo?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function NeumorphicPressable({
  children,
  radius = 16,
  distance = 5,
  surfaceColor: surfaceColorProp,
  containerStyle,
  scaleTo = 0.96,
  ...rest
}: NeumorphicPressableProps) {
  const { theme } = useTheme();
  const surfaceColor = surfaceColorProp ?? theme.colors.background;

  const pressedBg: ViewStyle = {
    backgroundColor: theme.colors.insetFill,
    borderTopWidth: 1,
    borderTopColor: theme.colors.shadowLight + '80',
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.shadowLight + '59',
    borderRightWidth: 1,
    borderRightColor: theme.colors.shadowDark + '40',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.shadowDark + '26',
  };
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
