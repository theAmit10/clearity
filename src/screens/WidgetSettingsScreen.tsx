import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { WidgetModule } from '../native/WidgetModule';
import { neumorphic } from '../theme/neumorphicTheme';

export default function WidgetSettingsScreen({ navigation }: any) {
  const habits = useHabitStore(s => s.habits);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ids = await WidgetModule.getSelectedHabitIds();
        setSelectedIds(ids);
      } catch {
        // module not available
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleHabit = async (habitId: string) => {
    const next = selectedIds.includes(habitId)
      ? selectedIds.filter(id => id !== habitId)
      : [...selectedIds, habitId];

    if (next.length > 3) {
      Alert.alert('Limit reached', 'You can select up to 3 habits for the widget.');
      return;
    }

    setSelectedIds(next);
    await WidgetModule.setSelectedHabitIds(next);
    await refreshWidgetData();
  };

  const refreshWidgetData = async () => {
    const activeHabits = habits.filter(h => !h.archived);
    const payload = WidgetModule.buildPayload(activeHabits);
    await WidgetModule.updateWidgetData(payload);
  };

  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Widget</Text>
          <Text style={styles.description}>
            Widgets are only available on iOS.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const activeHabits = habits.filter(h => !h.archived);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Settings</Text>
        </Pressable>

        <Text style={styles.title}>Widget</Text>

        <Text style={styles.description}>
          Select which habits to display on your iOS widget. You can select up to
          3 habits. The widget shows a weekly heatmap for the current week.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SELECTED HABITS</Text>
          <View style={styles.sectionBody}>
            {activeHabits.length === 0 && (
              <Text style={styles.emptyText}>
                No active habits. Create some habits first!
              </Text>
            )}
            {activeHabits.map((habit, i) => {
              const isSelected = selectedIds.includes(habit.id);
              return (
                <View key={habit.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.rowLeft}>
                    <View
                      style={[styles.colorDot, { backgroundColor: habit.color }]}
                    />
                    <View>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      <Text style={styles.habitMeta}>
                        {Object.keys(habit.completions).length} days tracked
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isSelected}
                    onValueChange={() => toggleHabit(habit.id)}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFF"
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            After selecting habits, add the Habitic widget to your home screen:
            {'\n\n'}
            1. Touch and hold an empty area on your Home Screen
            {'\n'}
            2. Tap the + button in the top-left corner
            {'\n'}
            3. Search for "Habitic Widget"
            {'\n'}
            4. Choose your preferred size
            {'\n'}
            5. Tap "Add Widget"
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: { fontSize: 22, color: '#007AFF', marginRight: 4 },
  backText: { fontSize: 17, color: '#007AFF' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionBody: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    padding: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  habitName: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  habitMeta: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  infoBox: {
    backgroundColor: '#E8F0FE',
    borderRadius: 14,
    padding: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
});
