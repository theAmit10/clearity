import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HabitStats } from '../types/habit';
import { Raised } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

interface Props {
  stats: HabitStats;
  goal?: string;
}

function AnimatedNumber({
  value,
  suffix = '',
}: {
  value: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (value === display) return;
    const from = display;
    const start = Date.now();
    const duration = 600;
    let frame: number;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <Text style={styles.statValue}>
      {display}
      {suffix}
    </Text>
  );
}

export default function StatsRow({ stats, goal }: Props) {
  return (
    <View style={styles.row}>
      <Raised radius={neumorphic.radii.pill} distance={5} style={styles.chip}>
        {/* <Text style={styles.chipIcon}>🔥</Text> */}
        <AnimatedNumber value={stats.currentStreak} suffix="d" />
        <Text style={styles.chipLabel}>Streak</Text>
      </Raised>
      <Raised radius={neumorphic.radii.pill} distance={5} style={styles.chip}>
        {/* <Text style={styles.chipIcon}>🏆</Text> */}
        <AnimatedNumber value={stats.bestStreak} suffix="d" />
        <Text style={styles.chipLabel}>Best</Text>
      </Raised>
      <Raised radius={neumorphic.radii.pill} distance={5} style={styles.chip}>
        {/* <Text style={styles.chipIcon}>✅</Text> */}
        <AnimatedNumber value={stats.completionRate30d} suffix="%" />
        <Text style={styles.chipLabel}>30d</Text>
      </Raised>
      {goal && (
        <Raised radius={neumorphic.radii.pill} distance={5} style={styles.chip}>
          {/* <Text style={styles.chipIcon}>🎯</Text> */}
          <Text style={styles.statValue}>{goal}</Text>
          <Text style={styles.chipLabel}>Goal</Text>
        </Raised>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  chipIcon: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: neumorphic.colors.textPrimary,
  },
  chipLabel: {
    fontSize: 12,
    color: neumorphic.colors.textMuted,
    marginLeft: 2,
    fontWeight: '600',
  },
});

// import React, { useEffect, useState } from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import { HabitStats } from '../types/habit';

// interface Props {
//   stats: HabitStats;
//   goal?: string;
// }

// function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
//   const [display, setDisplay] = useState(value);

//   useEffect(() => {
//     if (value === display) return;
//     const from = display;
//     const start = Date.now();
//     const duration = 600;
//     let frame: number;

//     function tick() {
//       const elapsed = Date.now() - start;
//       const progress = Math.min(elapsed / duration, 1);
//       const eased = 1 - Math.pow(1 - progress, 3);
//       setDisplay(Math.round(from + (value - from) * eased));
//       if (progress < 1) {
//         frame = requestAnimationFrame(tick);
//       }
//     }

//     frame = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(frame);
//   }, [value]);

//   return (
//     <Text style={styles.statValue}>
//       {display}{suffix}
//     </Text>
//   );
// }

// export default function StatsRow({ stats, goal }: Props) {
//   return (
//     <View style={styles.row}>
//       <View style={styles.chip}>
//         <Text style={styles.chipIcon}>🔥</Text>
//         <AnimatedNumber value={stats.currentStreak} suffix="d" />
//         <Text style={styles.chipLabel}>Streak</Text>
//       </View>

//       <View style={styles.chip}>
//         <Text style={styles.chipIcon}>🏆</Text>
//         <AnimatedNumber value={stats.bestStreak} suffix="d" />
//         <Text style={styles.chipLabel}>Best</Text>
//       </View>

//       <View style={styles.chip}>
//         <Text style={styles.chipIcon}>✅</Text>
//         <AnimatedNumber value={stats.completionRate30d} suffix="%" />
//         <Text style={styles.chipLabel}>30d</Text>
//       </View>

//       {goal && (
//         <View style={styles.chip}>
//           <Text style={styles.chipIcon}>🎯</Text>
//           <Text style={styles.statValue}>{goal}</Text>
//           <Text style={styles.chipLabel}>Goal</Text>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   chip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F2F2F7',
//     borderRadius: 20,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     gap: 4,
//   },
//   chipIcon: {
//     fontSize: 14,
//   },
//   statValue: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#111111',
//   },
//   chipLabel: {
//     fontSize: 12,
//     color: '#777777',
//     marginLeft: 2,
//   },
// });
