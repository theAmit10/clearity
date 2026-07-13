import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { neumorphic } from '../theme/neumorphicTheme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function HabitNotificationConfigScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const habits = useHabitStore(s => s.habits);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const setHabitNotification = useHabitStore(s => s.setHabitNotification);
  const removeHabitNotification = useHabitStore(s => s.removeHabitNotification);

  const habit = habits.find(h => h.id === habitId);
  const existing = habitNotifications[habitId];

  const [title, setTitle] = useState(existing?.title ?? habit?.name ?? 'Habit reminder');
  const [hour, setHour] = useState(existing?.hour ?? 9);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);

  if (!habit) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Habit not found</Text>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a notification title.');
      return;
    }
    await setHabitNotification(habitId, {
      title: title.trim(),
      hour,
      minute,
      enabled,
    });
    navigation.goBack();
  };

  const handleDisable = async () => {
    await removeHabitNotification(habitId);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Notifications</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={[styles.colorBadge, { backgroundColor: habit.color || '#007AFF' }]}>
            <Text style={styles.badgeIcon}>{habit.icon || '📋'}</Text>
          </View>
          <Text style={styles.title}>{habit.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATION TITLE</Text>
          <View style={styles.sectionBody}>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Time for your habit!"
              placeholderTextColor="#C7C7CC"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TIME</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.unitLabel}>Hour</Text>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {HOURS.map(h => (
                  <Pressable
                    key={h}
                    style={[styles.pickerItem, hour === h && styles.pickerItemSelected]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.pickerText, hour === h && styles.pickerTextSelected]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.timeColumn}>
              <Text style={styles.unitLabel}>Minute</Text>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {MINUTES.map(m => (
                  <Pressable
                    key={m}
                    style={[styles.pickerItem, minute === m && styles.pickerItemSelected]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.pickerText, minute === m && styles.pickerTextSelected]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Text style={styles.timezoneNote}>
            Notification will fire daily at the selected time based on your device timezone.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STATUS</Text>
          <View style={styles.sectionBody}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>
                {enabled ? 'Notifications on' : 'Notifications off'}
              </Text>
              <Pressable
                style={[styles.toggleBtn, enabled ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => setEnabled(!enabled)}
              >
                <View style={[styles.toggleKnob, enabled ? styles.knobRight : styles.knobLeft]} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>

        <Pressable style={styles.disableButton} onPress={handleDisable}>
          <Text style={styles.disableButtonText}>Remove Notification</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backArrow: { fontSize: 22, color: '#007AFF', marginRight: 4 },
  backText: { fontSize: 17, color: '#007AFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  colorBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeIcon: { fontSize: 22 },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' },
  errorText: { fontSize: 16, color: '#FF3B30', textAlign: 'center', marginTop: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
  },
  timeColumn: { alignItems: 'center', width: 100 },
  colon: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginHorizontal: 8, marginTop: 40 },
  unitLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase' },
  pickerScroll: { maxHeight: 200 },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: { backgroundColor: '#007AFF' },
  pickerText: { fontSize: 18, color: '#1C1C1E', textAlign: 'center' },
  pickerTextSelected: { color: '#FFF', fontWeight: '700' },
  timezoneNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusLabel: { fontSize: 16, color: '#1C1C1E' },
  toggleBtn: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: '#34C759' },
  toggleInactive: { backgroundColor: '#E5E5EA' },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  knobLeft: { alignSelf: 'flex-start' },
  knobRight: { alignSelf: 'flex-end' },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  disableButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  disableButtonText: { fontSize: 17, color: '#FF3B30', fontWeight: '600' },
});
