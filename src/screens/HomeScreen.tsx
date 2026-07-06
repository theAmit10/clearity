import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { useHabitStore } from '../store/habitStore';
import HabitCard from '../components/HabitCard';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { neumorphic } from '../theme/neumorphicTheme';

export default function HomeScreen({ navigation }: any) {
  // IMPORTANT: select the raw array (stable reference) from the store, then
  // derive the filtered list with useMemo. Never return a freshly-created
  // array/object directly from a Zustand selector — a new reference on every
  // call makes React think the store changed on every render, which causes
  // an infinite render loop ("Maximum update depth exceeded").
  const allHabits = useHabitStore(s => s.habits);
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const habits = useMemo(() => allHabits.filter(h => !h.archived), [allHabits]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Habita</Text>
        <NeumorphicButton
          radius={18}
          distance={5}
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEditHabit')}
        >
          <Text style={styles.addButtonText}>+</Text>
        </NeumorphicButton>
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Raised
            radius={neumorphic.radii.panel}
            distance={7}
            style={styles.empty}
          >
            <Text style={styles.emptyText}>
              No habits yet.{'\n'}Tap + to add your first one.
            </Text>
          </Raised>
        </View>
      ) : (
        <FlatList
          data={habits}
          keyExtractor={h => h.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <HabitCard
              habit={item}
              onToggleToday={() => toggleCompletion(item.id)}
              onPress={() =>
                navigation.navigate('HabitDetail', { id: item.id })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: neumorphic.colors.textPrimary,
    letterSpacing: 0 - 0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: neumorphic.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 14,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: neumorphic.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});

// import React, { useMemo } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   Pressable,
//   StyleSheet,
//   SafeAreaView,
// } from 'react-native';
// import { useHabitStore } from '../store/habitStore';
// import HabitCard from '../components/HabitCard';

// export default function HomeScreen({ navigation }: any) {
//   // IMPORTANT: select the raw array (stable reference) from the store, then
//   // derive the filtered list with useMemo. Never return a freshly-created
//   // array/object directly from a Zustand selector — a new reference on every
//   // call makes React think the store changed on every render, which causes
//   // an infinite render loop ("Maximum update depth exceeded").
//   const allHabits = useHabitStore(s => s.habits);
//   const toggleCompletion = useHabitStore(s => s.toggleCompletion);
//   const habits = useMemo(() => allHabits.filter(h => !h.archived), [allHabits]);

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.headerRow}>
//         <Text style={styles.title}>Habits</Text>
//         <Pressable
//           onPress={() => navigation.navigate('AddEditHabit')}
//           style={styles.addButton}
//         >
//           <Text style={styles.addButtonText}>+</Text>
//         </Pressable>
//       </View>

//       {habits.length === 0 ? (
//         <View style={styles.empty}>
//           <Text style={styles.emptyText}>
//             No habits yet.{'\n'}Tap + to add your first one.
//           </Text>
//         </View>
//       ) : (
//         <FlatList
//           data={habits}
//           keyExtractor={h => h.id}
//           contentContainerStyle={{ paddingVertical: 8 }}
//           renderItem={({ item }) => (
//             <HabitCard
//               habit={item}
//               onToggleToday={() => toggleCompletion(item.id)}
//               onPress={() =>
//                 navigation.navigate('HabitDetail', { id: item.id })
//               }
//             />
//           )}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F2F2F7' },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingTop: 12,
//     paddingBottom: 4,
//   },
//   title: { fontSize: 32, fontWeight: '700', color: '#1C1C1E' },
//   addButton: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#007AFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   addButtonText: {
//     color: '#FFF',
//     fontSize: 22,
//     fontWeight: '600',
//     marginTop: -2,
//   },
//   empty: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 40,
//   },
//   emptyText: {
//     color: '#8E8E93',
//     fontSize: 16,
//     textAlign: 'center',
//     lineHeight: 22,
//   },
// });
