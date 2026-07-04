import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, typography } from './theme';
import NeumorphicPressable from './NeumorphicPressable';

interface FooterNavProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker?: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function FooterNav({
  year,
  month,
  onPrevMonth,
  onNextMonth,
}: FooterNavProps) {
  const label = `${MONTH_NAMES[month]} ${year}`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
      }}
    >
      <NeumorphicPressable
        radius={radii.pill}
        distance={4}
        containerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          borderRadius: radii.pill,
        }}
      >
        <Icon name="calendar" size={14} color={colors.accent} />
        <Text style={[typography.subtitle, { color: colors.textPrimary, fontWeight: '700' }]}>
          {label}
        </Text>
      </NeumorphicPressable>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
          onPress={onPrevMonth}
        >
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </NeumorphicPressable>

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
          onPress={onNextMonth}
        >
          <Icon name="chevron-right" size={20} color={colors.textPrimary} />
        </NeumorphicPressable>
      </View>
    </View>
  );
}
