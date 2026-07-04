import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, typography } from './theme';
import NeumorphicPressable from './NeumorphicPressable';
import Raised from './Raised';
import { Habit } from '../../types/habit';

interface HabitHeaderProps {
  habit: Habit;
  onClose: () => void;
}

export default function HabitHeader({ habit, onClose }: HabitHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Raised radius={18} distance={5}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            backgroundColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
        </View>
      </Raised>

      <View style={{ flex: 1 }}>
        <Text
          style={[typography.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
        <Text
          style={[typography.subtitle, { color: colors.textMuted, marginTop: 2 }]}
          numberOfLines={1}
        >
          {habit.description || 'No description'}
        </Text>
      </View>

      <NeumorphicPressable
        radius={radii.iconBtn}
        distance={4}
        containerStyle={{
          width: 40,
          height: 40,
          borderRadius: radii.iconBtn,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onClose}
      >
        <Icon name="close" size={18} color={colors.textMuted} />
      </NeumorphicPressable>
    </View>
  );
}
