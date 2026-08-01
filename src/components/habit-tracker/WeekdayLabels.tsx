import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from '../../i18n';

interface WeekdayLabelsProps {
  circleSize: number;
}

export default function WeekdayLabels({ circleSize }: WeekdayLabelsProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { colors, typography } = theme;
  const days = t('calendar.weekdaysShort') as unknown as string[];

  return (
    <View style={{ flexDirection: 'row' }}>
      {days.map(d => (
        <View
          key={d}
          style={{ width: circleSize, alignItems: 'center' }}
        >
          <Text
            style={[
              typography.label,
              { color: colors.textMuted },
            ]}
          >
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
}
