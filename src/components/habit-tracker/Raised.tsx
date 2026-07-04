import { View, ViewStyle } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { colors } from './theme';

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
  surfaceColor = colors.background,
}: RaisedProps) {
  return (
    <Shadow
      distance={distance}
      startColor={colors.shadowDark + '55'}
      offset={[distance * 0.5, distance * 0.5]}
      style={{ borderRadius: radius }}
    >
      <View
        style={[
          {
            borderRadius: radius,
            backgroundColor: surfaceColor,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.8)',
            borderLeftWidth: 1,
            borderLeftColor: 'rgba(255,255,255,0.5)',
          },
          containerStyle,
        ]}
      >
        {children}
      </View>
    </Shadow>
  );
}
