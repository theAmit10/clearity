import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useHabitStore, computeStats } from '../store/habitStore';
import YearHeatmap from '../components/YearHeatmap';
import StatsRow from '../components/StatsRow';
import ActionButtons from '../components/ActionButtons';
import MonthlyCalendar from '../components/MonthlyCalendar';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { neumorphic } from '../theme/neumorphicTheme';

export default function HabitDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const habit = useHabitStore(s => s.habits.find(h => h.id === id));
  const deleteHabit = useHabitStore(s => s.deleteHabit);
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  React.useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    cardOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const confirmDelete = useCallback(() => {
    Alert.alert('Habit Settings', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Habit',
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(id);
          navigation.goBack();
        },
      },
    ]);
  }, [id, deleteHabit, navigation]);

  if (!habit) return null;
  const stats = computeStats(habit);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={cardStyle}>
          <Raised
            radius={neumorphic.radii.card}
            distance={10}
            style={styles.card}
          >
            {}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Raised radius={18} distance={5} style={styles.iconBadge}>
                  <Text style={styles.icon}>{habit.icon}</Text>
                </Raised>
                <View style={styles.headerText}>
                  <Text style={styles.name}>{habit.name}</Text>
                  {habit.description && (
                    <Text style={styles.description}>{habit.description}</Text>
                  )}
                </View>
              </View>
              <NeumorphicButton
                radius={16}
                distance={5}
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.closeText}>✕</Text>
              </NeumorphicButton>
            </View>

            {}
            <View style={styles.section}>
              <YearHeatmap habitId={habit.id} color={habit.color} />
            </View>

            {}
            <View style={styles.section}>
              <StatsRow stats={stats} goal={habit.goal} />
              {/* <View style={styles.actionRow}>
                <ActionButtons
                  onEdit={() =>
                    navigation.navigate('AddEditHabit', { id: habit.id })
                  }
                  onSettings={confirmDelete}
                />
              </View> */}
            </View>

            {}
            {/* <View style={styles.actionRow}>
              <ActionButtons
                onEdit={() =>
                  navigation.navigate('AddEditHabit', { id: habit.id })
                }
                onSettings={confirmDelete}
              />
            </View> */}

            {}
            <View style={styles.divider} />

            {}
            <View style={styles.section}>
              <MonthlyCalendar habitId={habit.id} color={habit.color} />
            </View>

            <View style={styles.actionRow}>
              <ActionButtons
                onEdit={() =>
                  navigation.navigate('AddEditHabit', { id: habit.id })
                }
                onSettings={confirmDelete}
              />
            </View>
          </Raised>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: neumorphic.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: neumorphic.colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: neumorphic.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
    color: neumorphic.colors.textMuted,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(179,187,201,0.5)',
    marginBottom: 16,
  },
});

// import React, { useCallback } from 'react';
// import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withTiming,
//   Easing,
// } from 'react-native-reanimated';
// import { useHabitStore, computeStats } from '../store/habitStore';
// import YearHeatmap from '../components/YearHeatmap';
// import StatsRow from '../components/StatsRow';
// import ActionButtons from '../components/ActionButtons';
// import MonthlyCalendar from '../components/MonthlyCalendar';

// export default function HabitDetailScreen({ route, navigation }: any) {
//   const { id } = route.params;
//   const habit = useHabitStore(s => s.habits.find(h => h.id === id));
//   const deleteHabit = useHabitStore(s => s.deleteHabit);

//   const cardScale = useSharedValue(0.95);
//   const cardOpacity = useSharedValue(0);

//   React.useEffect(() => {
//     cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
//     cardOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
//   }, []);

//   const cardStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: cardScale.value }],
//     opacity: cardOpacity.value,
//   }));

//   const confirmDelete = useCallback(() => {
//     Alert.alert(
//       'Habit Settings',
//       undefined,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Delete Habit',
//           style: 'destructive',
//           onPress: async () => {
//             await deleteHabit(id);
//             navigation.goBack();
//           },
//         },
//       ],
//     );
//   }, [id, deleteHabit, navigation]);

//   if (!habit) return null;
//   const stats = computeStats(habit);

//   return (
//     <SafeAreaView style={styles.container} edges={['bottom']}>
//       <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
//         <Animated.View style={[styles.card, cardStyle]}>
//           {}
//           <View style={styles.header}>
//             <View style={styles.headerLeft}>
//               <Text style={styles.icon}>{habit.icon}</Text>
//               <View style={styles.headerText}>
//                 <Text style={styles.name}>{habit.name}</Text>
//                 {habit.description && (
//                   <Text style={styles.description}>{habit.description}</Text>
//                 )}
//               </View>
//             </View>
//             <Pressable
//               style={styles.closeButton}
//               onPress={() => navigation.goBack()}
//             >
//               <Text style={styles.closeText}>✕</Text>
//             </Pressable>
//           </View>

//           {}
//           <View style={styles.section}>
//             <YearHeatmap
//               habitId={habit.id}
//               color={habit.color}
//             />
//           </View>

//           {}
//           <View style={styles.section}>
//             <StatsRow stats={stats} goal={habit.goal} />
//           </View>

//           {}
//           <View style={styles.actionRow}>
//             <ActionButtons
//               onEdit={() => navigation.navigate('AddEditHabit', { id: habit.id })}
//               onSettings={confirmDelete}
//             />
//           </View>

//           {}
//           <View style={styles.divider} />

//           {}
//           <View style={styles.section}>
//             <MonthlyCalendar
//               habitId={habit.id}
//             />
//           </View>
//         </Animated.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F7F7F7',
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 32,
//   },
//   card: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 20,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 12,
//     elevation: 3,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 20,
//   },
//   headerLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//     gap: 12,
//   },
//   headerText: {
//     flex: 1,
//   },
//   icon: {
//     fontSize: 36,
//   },
//   name: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#111111',
//   },
//   description: {
//     fontSize: 14,
//     color: '#777777',
//     marginTop: 2,
//   },
//   closeButton: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#F2F2F7',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginLeft: 8,
//   },
//   closeText: {
//     fontSize: 14,
//     color: '#777777',
//     fontWeight: '600',
//   },
//   section: {
//     marginBottom: 16,
//   },
//   actionRow: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//     gap: 8,
//     marginBottom: 16,
//   },
//   divider: {
//     height: StyleSheet.hairlineWidth,
//     backgroundColor: '#E8E8E8',
//     marginBottom: 16,
//   },
// });
