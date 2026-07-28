import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { getHabitIcon } from '../constants/habitIcons';
import { TrashIcon } from 'react-native-heroicons/outline';
import { useTheme } from '../theme/ThemeProvider';

const MAX_NOTIFICATIONS = 10;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

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
  const addHabitNotification = useHabitStore(s => s.addHabitNotification);
  const updateHabitNotification = useHabitStore(s => s.updateHabitNotification);
  const removeHabitNotification = useHabitStore(s => s.removeHabitNotification);

  const habit = habits.find(h => h.id === habitId);
  const myNotifs = habitNotifications.filter(n => n.habitId === habitId);
  const IconComponent = getHabitIcon(habit?.icon);

  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  function openForm(notif?: typeof myNotifs[number]) {
    if (notif) {
      setEditingId(notif.id);
      setTitle(notif.title);
      setDescription(notif.body);
      setHour(notif.hour);
      setMinute(notif.minute);
      setEnabled(notif.enabled);
    } else {
      setEditingId(null);
      setTitle('');
      setDescription('');
      setHour(9);
      setMinute(0);
      setEnabled(true);
    }
    setErrors({});
    setTitleTouched(false);
    setDescriptionTouched(false);
    setMode('form');
  }

  useEffect(() => {
    if (mode !== 'form') return;
    const hourIdx = HOURS.indexOf(hour);
    if (hourIdx >= 0 && hourScrollRef.current) {
      hourScrollRef.current.scrollTo({ x: hourIdx * 56, animated: true });
    }
  }, [mode, hour]);

  useEffect(() => {
    if (mode !== 'form') return;
    const minIdx = MINUTES.indexOf(minute);
    if (minIdx >= 0 && minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({ x: minIdx * 64, animated: true });
    }
  }, [mode, minute]);

  if (!habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
        <Text style={[styles.notFoundText, { color: theme.colors.iosRed }]}>Habit not found</Text>
      </SafeAreaView>
    );
  }

  const validate = () => {
    const errs: { title?: string; description?: string } = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length > 50) {
      errs.title = 'Title must be 50 characters or fewer';
    }
    if (description.trim().length > 120) {
      errs.description = 'Description must be 120 characters or fewer';
    }
    setErrors(errs);
    setTitleTouched(true);
    setDescriptionTouched(true);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const data = { title: title.trim(), body: description.trim(), hour, minute };
    if (editingId) {
      await updateHabitNotification(editingId, { ...data, enabled });
    } else {
      await addHabitNotification(habitId, data);
    }
    setMode('list');
  };

  const handleDelete = async (id: string) => {
    await removeHabitNotification(id);
  };

  const handleCancel = () => {
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Pressable onPress={handleCancel} style={styles.backRow}>
            <Text style={[styles.backArrow, { color: theme.colors.iosBlue }]}>←</Text>
            <Text style={[styles.backText, { color: theme.colors.iosBlue }]}>
              {editingId ? 'Edit Reminder' : 'New Reminder'}
            </Text>
          </Pressable>

          <View style={styles.headerRow}>
            <View style={[styles.colorBadge, { backgroundColor: habit.color || theme.colors.iosBlue }]}>
              <IconComponent size={22} color={theme.colors.surface} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: theme.colors.iosLabel }]}>{habit.name}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.iosSecondaryLabel }]}>
                {editingId ? 'Edit your reminder' : 'Create a new reminder'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>NOTIFICATION TITLE</Text>
            <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.iosLabel }]}
                value={title}
                onChangeText={t => { setTitle(t); setTitleTouched(true); }}
                onBlur={() => setTitleTouched(true)}
                placeholder="e.g. Time for your habit!"
                placeholderTextColor={theme.colors.iosGray}
                maxLength={50}
              />
            </View>
            {titleTouched && errors.title ? (
              <Text style={[styles.errorText, { color: theme.colors.iosRed }]}>{errors.title}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>NOTIFICATION DESCRIPTION</Text>
            <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.iosLabel, minHeight: 60 }]}
                value={description}
                onChangeText={t => { setDescription(t); setDescriptionTouched(true); }}
                onBlur={() => setDescriptionTouched(true)}
                placeholder="e.g. Don't forget to stretch today!"
                placeholderTextColor={theme.colors.iosGray}
                multiline
                maxLength={120}
                textAlignVertical="top"
              />
            </View>
            {descriptionTouched && errors.description ? (
              <Text style={[styles.errorText, { color: theme.colors.iosRed }]}>{errors.description}</Text>
            ) : null}
            <Text style={[styles.charCount, { color: theme.colors.iosGray }]}>
              {description.length}/120
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>TIME</Text>
            <View style={[styles.timeCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.timeDisplay}>
                <Text style={[styles.timeDigits, { color: theme.colors.iosLabel }]}>
                  {String(hour).padStart(2, '0')}
                </Text>
                <Text style={[styles.timeColon, { color: theme.colors.iosSecondaryLabel }]}>:</Text>
                <Text style={[styles.timeDigits, { color: theme.colors.iosLabel }]}>
                  {String(minute).padStart(2, '0')}
                </Text>
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
            <Text style={[styles.saveButtonText, { color: theme.colors.surface }]}>
              {editingId ? 'Update Reminder' : 'Add Reminder'}
            </Text>
          </Pressable>

          <Pressable style={[styles.cancelButton, { backgroundColor: theme.colors.surface }]} onPress={handleCancel}>
            <Text style={[styles.cancelButtonText, { color: theme.colors.iosSecondaryLabel }]}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text style={[styles.subtitle, { color: theme.colors.iosSecondaryLabel }]}>
              {myNotifs.length}/{MAX_NOTIFICATIONS} reminders configured
            </Text>
          </View>
        </View>

        {myNotifs.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.iosSecondaryLabel }]}>
              No reminders yet. Tap below to add one.
            </Text>
          </View>
        ) : (
          <View style={[styles.notifList, { backgroundColor: theme.colors.surface }]}>
            {myNotifs.map((n, i) => (
              <View
                key={n.id}
                style={[
                  styles.notifRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.iosSeparator },
                ]}
              >
                <Pressable style={styles.notifInfo} onPress={() => openForm(n)}>
                  <Text style={[styles.notifTime, { color: theme.colors.iosBlue }]}>
                    {String(n.hour).padStart(2, '0')}:{String(n.minute).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.notifTitle, { color: theme.colors.iosLabel }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                </Pressable>
                <View style={styles.notifActions}>
                  <Pressable
                    style={[styles.toggleBtnSmall, { backgroundColor: n.enabled ? theme.colors.iosGreen : theme.colors.iosSeparator }]}
                    onPress={() => updateHabitNotification(n.id, { enabled: !n.enabled })}
                  >
                    <View style={[styles.toggleKnobSmall, { backgroundColor: theme.colors.surface }, {
                      alignSelf: n.enabled ? 'flex-end' : 'flex-start',
                    }]} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(n.id)} style={styles.deleteBtn}>
                    <TrashIcon size={18} color={theme.colors.iosRed} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {myNotifs.length < MAX_NOTIFICATIONS && (
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => openForm()}
          >
            <Text style={[styles.addButtonText, { color: theme.colors.iosBlue }]}>
              + Add Reminder
            </Text>
          </Pressable>
        )}
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
  notFoundText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
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
  errorText: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    marginRight: 4,
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
  toggleBtnSmall: {
    width: 40,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnobSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
  cancelButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 17, fontWeight: '600' },
  notifList: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notifInfo: {
    flex: 1,
    marginRight: 12,
  },
  notifTime: {
    fontSize: 15,
    fontWeight: '700',
  },
  notifTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  notifActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { fontSize: 16, fontWeight: '600' },
});
