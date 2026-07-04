import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, typography } from './theme';
import NeumorphicPressable from './NeumorphicPressable';
import Raised from './Raised';

interface PillsRowProps {
  streakGoal: string | null;
  currentStreak: number;
  onEdit: () => void;
  onOpenSettings: () => void;
}

export default function PillsRow({
  streakGoal,
  currentStreak,
  onEdit,
  onOpenSettings,
}: PillsRowProps) {
  const iconBtnSize = 38;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexShrink: 1 }}>
        <Raised radius={radii.pill} distance={4}>
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.pill,
              backgroundColor: colors.background,
            }}
          >
            <Text style={[typography.subtitle, { color: colors.textMuted }]}>
              {streakGoal || 'No Streak Goal'}
            </Text>
          </View>
        </Raised>

        <Raised radius={radii.pill} distance={4}>
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              borderRadius: radii.pill,
              backgroundColor: colors.background,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Icon name="fire" size={14} color={colors.accent} />
            <Text style={[typography.subtitle, { color: colors.textPrimary, fontWeight: '700' }]}>
              {currentStreak}
            </Text>
          </View>
        </Raised>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NeumorphicPressable
          radius={radii.iconBtn}
          distance={4}
          containerStyle={{
            width: iconBtnSize,
            height: iconBtnSize,
            borderRadius: radii.iconBtn,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onEdit}
        >
          <Icon name="pencil-outline" size={18} color={colors.textPrimary} />
        </NeumorphicPressable>

        <NeumorphicPressable
          radius={radii.iconBtn}
          distance={4}
          containerStyle={{
            width: iconBtnSize,
            height: iconBtnSize,
            borderRadius: radii.iconBtn,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenSettings}
        >
          <Icon name="cog-outline" size={18} color={colors.textPrimary} />
        </NeumorphicPressable>
      </View>
    </View>
  );
}
