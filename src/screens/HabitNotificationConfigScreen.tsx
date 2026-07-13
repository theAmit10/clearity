import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { getHabitIcon, HABIT_ICONS } from '../constants/habitIcons';
import { neumorphic } from '../theme/neumorphicTheme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const SCREEN_WIDTH = Dimensions.get('window').width;

function TimePickerItem({ value, selected, onPress, label }: {
  value: number;
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  const scale = useRef(new Animated.Value(selected ? 1 : 0.85)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1 : 0.85,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [selected]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          styles.pickerItem,
          selected && styles.pickerItemSelected,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.pickerText, selected && styles.pickerTextSelected]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HabitNotificationConfigScreen({ route, navigation }: any) {
  const { habitId } = route.params;
  const habits = useHabitStore(s => s.habits);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const setHabitNotification = useHabitStore(s => s.setHabitNotification);
  const removeHabitNotification = useHabitStore(s => s.removeHabitNotification);

  const habit = habits.find(h => h.id === habitId);
  const existing = habitNotifications[habitId];
  const IconComponent = getHabitIcon(habit?.icon);

  const [title, setTitle] = useState(existing?.title ?? habit?.name ?? 'Habit reminder');
  const [hour, setHour] = useState(existing?.hour ?? 9);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const hourAnim = useRef(new Animated.Value(0)).current;
  const minuteAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hourIdx = HOURS.indexOf(hour);
    if (hourIdx >= 0 && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({ x: hourIdx * 56, animated: true });
    }
  }, []);

  useEffect(() => {
    const minIdx = MINUTES.indexOf(minute);
    if (minIdx >= 0 && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({ x: minIdx * 64, animated: true });
    }
  }, []);

  useEffect(() => {
    Animated.spring(hourAnim, {
      toValue: hour,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [hour]);

  useEffect(() => {
    Animated.spring(minuteAnim, {
      toValue: minute,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [minute]);

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
            <IconComponent size={22} color="#FFF" />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>{habit.name}</Text>
            <Text style={styles.subtitle}>Configure your daily reminder</Text>
          </View>
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
          <View style={styles.timeCard}>
            <View style={styles.timeDisplay}>
              <Animated.Text style={styles.timeDigits}>
                {String(hour).padStart(2, '0')}
              </Animated.Text>
              <Text style={styles.timeColon}>:</Text>
              <Animated.Text style={styles.timeDigits}>
                {String(minute).padStart(2, '0')}
              </Animated.Text>
            </View>

            <Text style={styles.unitLabel}>Hour</Text>
            <ScrollView
              ref={hourScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
            >
              {HOURS.map(h => (
                <TimePickerItem
                  key={h}
                  value={h}
                  selected={hour === h}
                  onPress={() => setHour(h)}
                  label={String(h).padStart(2, '0')}
                />
              ))}
            </ScrollView>

            <Text style={[styles.unitLabel, { marginTop: 12 }]}>Minute</Text>
            <ScrollView
              ref={minuteScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerRow}
            >
              {MINUTES.map(m => (
                <TimePickerItem
                  key={m}
                  value={m}
                  selected={minute === m}
                  onPress={() => setMinute(m)}
                  label={String(m).padStart(2, '0')}
                />
              ))}
            </ScrollView>

            <Text style={styles.timezoneNote}>
              Fires daily at this time based on your device timezone.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STATUS</Text>
          <View style={styles.sectionBody}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusLabel}>
                  {enabled ? 'Notifications on' : 'Notifications off'}
                </Text>
                <Text style={styles.statusHint}>
                  {enabled
                    ? `Daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                    : 'Tap to enable reminders'}
                </Text>
              </View>
              <Pressable
                style={[styles.toggleBtn, enabled ? styles.toggleActive : styles.toggleInactive]}
                onPress={() => setEnabled(!enabled)}
              >
                <Animated.View style={[styles.toggleKnob, {
                  alignSelf: enabled ? 'flex-end' : 'flex-start',
                }]} />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTextCol: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
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
  timeCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeDigits: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 4,
  },
  timeColon: {
    fontSize: 40,
    fontWeight: '700',
    color: '#8E8E93',
    marginHorizontal: 6,
    marginTop: -4,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignSelf: 'flex-start',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pickerItem: {
    width: 48,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  pickerItemSelected: { backgroundColor: '#007AFF' },
  pickerText: { fontSize: 16, color: '#1C1C1E', fontWeight: '600' },
  pickerTextSelected: { color: '#FFF', fontWeight: '700' },
  timezoneNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 12,
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
  statusHint: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
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
