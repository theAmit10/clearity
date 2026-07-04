import { View, Text } from 'react-native';
import CalendarDaysIcon from 'react-native-heroicons/outline/CalendarDaysIcon';
import ChevronLeftIcon from 'react-native-heroicons/outline/ChevronLeftIcon';
import ChevronRightIcon from 'react-native-heroicons/outline/ChevronRightIcon';
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
        <CalendarDaysIcon size={14} color={colors.accent} />
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
          <ChevronLeftIcon size={20} color={colors.textPrimary} />
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
          <ChevronRightIcon size={20} color={colors.textPrimary} />
        </NeumorphicPressable>
      </View>
    </View>
  );
}
