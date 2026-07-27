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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { getHabitIcon, HABIT_ICONS } from '../constants/habitIcons';
import { useTheme } from '../theme/ThemeProvider';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function HabitNotificationConfigScreen({ route, navigation }: any) {
  const { theme } = useTheme();

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
            selected && { backgroundColor: theme.colors.iosBlue },
            { transform: [{ scale }] },
          ]}
        >
          <Text
            style={[
              styles.pickerText,
              selected && styles.pickerTextSelected,
              { color: selected ? theme.colors.surface : theme.colors.iosLabel },
            ]}
          >
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
        <Text style={[styles.errorText, { color: theme.colors.iosRed }]}>Habit not found</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: theme.colors.iosBlue }]}>←</Text>
          <Text style={[styles.backText, { color: theme.colors.iosBlue }]}>Notifications</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={[styles.colorBadge, { backgroundColor: habit.color || theme.colors.iosBlue }]}>
            <IconComponent size={22} color={theme.colors.surface} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.title, { color: theme.colors.iosLabel }]}>{habit.name}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.iosSecondaryLabel }]}>Configure your daily reminder</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>NOTIFICATION TITLE</Text>
          <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.iosLabel }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Time for your habit!"
              placeholderTextColor={theme.colors.iosGray}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>TIME</Text>
          <View style={[styles.timeCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.timeDisplay}>
              <Animated.Text style={[styles.timeDigits, { color: theme.colors.iosLabel }]}>
                {String(hour).padStart(2, '0')}
              </Animated.Text>
              <Text style={[styles.timeColon, { color: theme.colors.iosSecondaryLabel }]}>:</Text>
              <Animated.Text style={[styles.timeDigits, { color: theme.colors.iosLabel }]}>
                {String(minute).padStart(2, '0')}
              </Animated.Text>
            </View>

            <Text style={[styles.unitLabel, { color: theme.colors.iosSecondaryLabel }]}>Hour</Text>
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

            <Text style={[styles.unitLabel, { marginTop: 12, color: theme.colors.iosSecondaryLabel }]}>Minute</Text>
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

            <Text style={[styles.timezoneNote, { color: theme.colors.iosSecondaryLabel }]}>
              Fires daily at this time based on your device timezone.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>STATUS</Text>
          <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statusRow}>
              <View>
                <Text style={[styles.statusLabel, { color: theme.colors.iosLabel }]}>
                  {enabled ? 'Notifications on' : 'Notifications off'}
                </Text>
                <Text style={[styles.statusHint, { color: theme.colors.iosSecondaryLabel }]}>
                  {enabled
                    ? `Daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
                    : 'Tap to enable reminders'}
                </Text>
              </View>
              <Pressable
                style={[styles.toggleBtn, { backgroundColor: enabled ? theme.colors.iosGreen : theme.colors.iosSeparator }]}
                onPress={() => setEnabled(!enabled)}
              >
                <Animated.View style={[styles.toggleKnob, { backgroundColor: theme.colors.surface }, {
                  alignSelf: enabled ? 'flex-end' : 'flex-start',
                }]} />
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={[styles.saveButton, { backgroundColor: theme.colors.iosBlue }]} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { color: theme.colors.surface }]}>Save</Text>
        </Pressable>

        <Pressable style={[styles.disableButton, { backgroundColor: theme.colors.surface }]} onPress={handleDisable}>
          <Text style={[styles.disableButtonText, { color: theme.colors.iosRed }]}>Remove Notification</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backArrow: { fontSize: 22, marginRight: 4, ...Platform.select({ android: { lineHeight: 22, textAlignVertical: 'center', includeFontPadding: false } }) },
  backText: { fontSize: 17 },
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
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeCard: {
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
    letterSpacing: 4,
  },
  timeColon: {
    fontSize: 40,
    fontWeight: '700',
    marginHorizontal: 6,
    marginTop: -4,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  pickerText: { fontSize: 16, fontWeight: '600' },
  pickerTextSelected: { fontWeight: '700' },
  timezoneNote: {
    fontSize: 12,
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
  statusLabel: { fontSize: 16 },
  statusHint: { fontSize: 12, marginTop: 2 },
  toggleBtn: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: { fontSize: 17, fontWeight: '600' },
  disableButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disableButtonText: { fontSize: 17, fontWeight: '600' },
});
