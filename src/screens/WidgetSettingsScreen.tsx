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
import { useTheme } from '../theme/ThemeProvider';

export default function WidgetSettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
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
      Alert.alert(
        'Limit reached',
        'You can select up to 3 habits for the widget.',
      );
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.iosBlue} />
        </View>
      </SafeAreaView>
    );
  }

  const activeHabits = habits.filter(h => !h.archived);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: theme.colors.iosBlue }]}>←</Text>
          <Text style={[styles.backText, { color: theme.colors.iosBlue }]}>Settings</Text>
        </Pressable>

        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>Widget</Text>

        <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
          Select which habits to display on your widget. You can select up to 3
          habits. The widget shows a weekly heatmap for the current week.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>SELECTED HABITS</Text>
          <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
            {activeHabits.length === 0 && (
              <Text style={[styles.emptyText, { color: theme.colors.iosSecondaryLabel }]}>
                No active habits. Create some habits first!
              </Text>
            )}
            {activeHabits.map((habit, i) => {
              const isSelected = selectedIds.includes(habit.id);
              return (
                <View
                  key={habit.id}
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.iosSeparator }]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: habit.color },
                      ]}
                    />
                    <View>
                      <Text style={[styles.habitName, { color: theme.colors.iosLabel }]}>{habit.name}</Text>
                      <Text style={[styles.habitMeta, { color: theme.colors.iosSecondaryLabel }]}>
                        {Object.keys(habit.completions).length} days tracked
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isSelected}
                    onValueChange={() => toggleHabit(habit.id)}
                    trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosGreen }}
                    thumbColor={theme.colors.surface}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.iosBlue + '1A' }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.iosLabel }]}>How it works</Text>
          <Text style={[styles.infoText, { color: theme.colors.iosLabel + '99' }]}>
            After selecting habits, add the widget to your home screen:
            {'\n\n'}
            {Platform.OS === 'ios'
              ? `1. Touch and hold an empty area on your Home Screen\n2. Tap the + button in the top-left corner\n3. Search for "Habitic Widget"\n4. Choose a size\n5. Tap "Add Widget"`
              : `1. Touch and hold an empty area on your Home Screen\n2. Tap "Widgets"\n3. Find "Habit Tracker" in the list\n4. Drag the widget to your Home Screen`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backArrow: {
    fontSize: 22,
    marginRight: 4,
    ...Platform.select({ android: { lineHeight: 22, textAlignVertical: 'center', includeFontPadding: false } }),
  },
  backText: { fontSize: 17 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  section: { marginBottom: 24 },
  sectionBody: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 15,
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
    fontWeight: '500',
  },
  habitMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  infoBox: {
    borderRadius: 14,
    padding: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
