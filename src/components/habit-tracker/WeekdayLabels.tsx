import { View, Text } from 'react-native';
import { colors, typography } from './theme';

interface WeekdayLabelsProps {
  circleSize: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekdayLabels({ circleSize }: WeekdayLabelsProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {DAYS.map(d => (
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
