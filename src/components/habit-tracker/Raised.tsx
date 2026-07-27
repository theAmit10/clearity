import { View, ViewStyle } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTheme } from '../../theme/ThemeProvider';

interface RaisedProps {
  children: React.ReactNode;
  radius?: number;
  distance?: number;
  containerStyle?: ViewStyle;
  surfaceColor?: string;
}

export default function Raised({
  children,
  radius = 16,
  distance = 6,
  containerStyle,
  surfaceColor: surfaceColorProp,
}: RaisedProps) {
  const { theme } = useTheme();
  const surfaceColor = surfaceColorProp ?? theme.colors.background;

  return (
    <Shadow
      distance={distance}
      startColor={theme.colors.shadowDark + '55'}
      offset={[distance * 0.5, distance * 0.5]}
      style={{ borderRadius: radius }}
    >
      <View
        style={[
          {
            borderRadius: radius,
            backgroundColor: surfaceColor,
            borderTopWidth: 1,
            borderTopColor: theme.colors.shadowLight + 'CC',
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.shadowLight + '80',
          },
          containerStyle,
        ]}
      >
        {children}
      </View>
    </Shadow>
  );
}
