import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface PressedProps {
  children: React.ReactNode;
  radius?: number;
  containerStyle?: ViewStyle;
}

export default function Pressed({
  children,
  radius = 16,
  containerStyle,
}: PressedProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: theme.colors.insetFill,
          borderTopWidth: 1,
          borderTopColor: theme.colors.shadowLight + '80',
          borderLeftWidth: 1,
          borderLeftColor: theme.colors.shadowLight + '59',
          borderRightWidth: 1,
          borderRightColor: theme.colors.shadowDark + '40',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.shadowDark + '26',
        },
        containerStyle,
      ]}
    >
      {children}
    </View>
  );
}
