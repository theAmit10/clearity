import { View, ViewStyle } from 'react-native';

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
  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: '#DADFE7',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.5)',
          borderLeftWidth: 1,
          borderLeftColor: 'rgba(255,255,255,0.35)',
          borderRightWidth: 1,
          borderRightColor: 'rgba(179,187,201,0.25)',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(179,187,201,0.15)',
        },
        containerStyle,
      ]}
    >
      {children}
    </View>
  );
}
