import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore, computeStats } from '../store/habitStore';
import HeatmapGrid from '../components/HeatmapGrid';
import ProgressRing from '../components/ProgressRing';

export default function HabitDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const habit = useHabitStore(s => s.habits.find(h => h.id === id));
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const deleteHabit = useHabitStore(s => s.deleteHabit);

  if (!habit) return null;
  const stats = computeStats(habit);

  const confirmDelete = () => {
    Alert.alert('Delete habit?', `"${habit.name}" and all its history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(habit.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerRow}>
          <Text style={styles.icon}>{habit.icon}</Text>
          <Text style={styles.name}>{habit.name}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBlock label="Current" value={`${stats.currentStreak}d`} />
          <StatBlock label="Best" value={`${stats.bestStreak}d`} />
          <StatBlock label="Total" value={`${stats.totalCompletions}`} />
          <View style={styles.ringBlock}>
            <ProgressRing progress={stats.completionRate30d} color={habit.color} />
            <Text style={styles.ringLabel}>30d</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.heatmapWrap}>
          <HeatmapGrid
            completions={habit.completions}
            color={habit.color}
            weeks={26}
            cellSize={12}
            gap={3}
            onCellPress={key => toggleCompletion(habit.id, key)}
          />
        </View>
        <Text style={styles.hint}>Tap any day to mark/unmark it complete.</Text>

        <Pressable
          style={styles.editButton}
          onPress={() => navigation.navigate('AddEditHabit', { id: habit.id })}>
          <Text style={styles.editButtonText}>Edit Habit</Text>
        </Pressable>
        <Pressable style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteButtonText}>Delete Habit</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  icon: { fontSize: 34, marginRight: 10 },
  name: { fontSize: 26, fontWeight: '700', color: '#1C1C1E' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statBlock: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  ringBlock: { alignItems: 'center' },
  ringLabel: { fontSize: 11, color: '#8E8E93', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 10 },
  heatmapWrap: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center' },
  hint: { fontSize: 12, color: '#8E8E93', marginTop: 8, textAlign: 'center' },
  editButton: {
    marginTop: 28,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  deleteButton: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  deleteButtonText: { color: '#FF3B30', fontWeight: '600', fontSize: 16 },
});
