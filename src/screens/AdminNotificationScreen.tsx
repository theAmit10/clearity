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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { useTheme } from '../theme/ThemeProvider';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TimePickerRow({ hour, minute, onHourChange, onMinuteChange }: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  const { theme } = useTheme();
  const hourScale = useRef(new Animated.Value(1)).current;
  const minuteScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(hourScale, { toValue: 1.15, useNativeDriver: true, friction: 4 }),
      Animated.spring(hourScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [hour]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(minuteScale, { toValue: 1.15, useNativeDriver: true, friction: 4 }),
      Animated.spring(minuteScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
  }, [minute]);

  return (
    <View>
      <View style={admStyles.timeDisplay}>
        <Animated.Text style={[admStyles.timeDigit, { color: theme.colors.iosLabel }, { transform: [{ scale: hourScale }] }]}>
          {String(hour).padStart(2, '0')}
        </Animated.Text>
        <Text style={[admStyles.timeColon, { color: theme.colors.iosSecondaryLabel }]}>:</Text>
        <Animated.Text style={[admStyles.timeDigit, { color: theme.colors.iosLabel }, { transform: [{ scale: minuteScale }] }]}>
          {String(minute).padStart(2, '0')}
        </Animated.Text>
      </View>

      <Text style={[admStyles.pickerLabel, { color: theme.colors.iosSecondaryLabel }]}>HOUR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={admStyles.pickerScroll}>
        {HOURS.map(h => (
          <Pressable
            key={h}
            style={[admStyles.pill, { backgroundColor: theme.colors.iosBg }, hour === h && { backgroundColor: theme.colors.iosBlue }]}
            onPress={() => onHourChange(h)}
          >
            <Text style={[admStyles.pillText, { color: theme.colors.iosLabel }, hour === h && { color: theme.colors.surface }]}>
              {String(h).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[admStyles.pickerLabel, { color: theme.colors.iosSecondaryLabel, marginTop: 8 }]}>MIN</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={admStyles.pickerScroll}>
        {MINUTES.map(m => (
          <Pressable
            key={m}
            style={[admStyles.pill, { backgroundColor: theme.colors.iosBg }, minute === m && { backgroundColor: theme.colors.iosBlue }]}
            onPress={() => onMinuteChange(m)}
          >
            <Text style={[admStyles.pillText, { color: theme.colors.iosLabel }, minute === m && { color: theme.colors.surface }]}>
              {String(m).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function AdminNotificationScreen({ navigation }: any) {
  const { theme } = useTheme();
  const adminNotifications = useHabitStore(s => s.adminNotifications);
  const updateAdminNotification = useHabitStore(s => s.updateAdminNotification);
  const addAdminNotification = useHabitStore(s => s.addAdminNotification);
  const removeAdminNotification = useHabitStore(s => s.removeAdminNotification);

  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newHour, setNewHour] = useState(12);
  const [newMinute, setNewMinute] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Validation', 'Please enter a title.');
      return;
    }
    const id = `admin-${Date.now()}`;
    await addAdminNotification({
      id,
      enabled: true,
      title: newTitle.trim(),
      body: newBody.trim(),
      hour: newHour,
      minute: newMinute,
    });
    setNewTitle('');
    setNewBody('');
    setNewHour(12);
    setNewMinute(0);
    setShowAddForm(false);
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove notification?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeAdminNotification(id),
      },
    ]);
  };

  return (
    <SafeAreaView style={[admStyles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={admStyles.backRow}>
          <Text style={[admStyles.backArrow, { color: theme.colors.iosBlue }]}>←</Text>
          <Text style={[admStyles.backText, { color: theme.colors.iosBlue }]}>Notifications</Text>
        </Pressable>

        <Text style={[admStyles.title, { color: theme.colors.iosLabel }]}>Admin Notifications</Text>
        <Text style={[admStyles.subtitle, { color: theme.colors.iosSecondaryLabel }]}>
          Configure hardcoded daily reminders sent to all users at specified times.
        </Text>

        {adminNotifications.map((n, i) => (
          <View key={n.id} style={[admStyles.card, { backgroundColor: theme.colors.surface }, i > 0 && admStyles.cardSpacing]}>
            <View style={admStyles.cardHeader}>
              <Text style={[admStyles.cardIndex, { color: theme.colors.iosSecondaryLabel }]}>#{i + 1}</Text>
              <View style={admStyles.cardActions}>
                <Text
                  style={[
                    admStyles.statusBadge,
                    n.enabled
                      ? { backgroundColor: theme.colors.iosGreen + '1A', color: theme.colors.iosGreen }
                      : { backgroundColor: theme.colors.iosBg, color: theme.colors.iosSecondaryLabel },
                  ]}
                >
                  {n.enabled ? 'Active' : 'Paused'}
                </Text>
                <Pressable onPress={() => handleRemove(n.id)}>
                  <Text style={[admStyles.deleteBtn, { color: theme.colors.iosRed }]}>Delete</Text>
                </Pressable>
              </View>
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Title</Text>
              <TextInput
                style={[admStyles.input, { color: theme.colors.iosLabel, borderColor: theme.colors.iosSeparator }]}
                value={n.title}
                onChangeText={val => updateAdminNotification(n.id, { title: val })}
                placeholder="Notification title"
                placeholderTextColor={theme.colors.iosGray}
              />
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Body</Text>
              <TextInput
                style={[admStyles.input, { color: theme.colors.iosLabel, borderColor: theme.colors.iosSeparator }]}
                value={n.body}
                onChangeText={val => updateAdminNotification(n.id, { body: val })}
                placeholder="Notification message"
                placeholderTextColor={theme.colors.iosGray}
              />
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Enabled</Text>
              <View style={admStyles.toggleRow}>
                <Text style={[admStyles.toggleLabel, { color: theme.colors.iosLabel }]}>{n.enabled ? 'On' : 'Off'}</Text>
                <Pressable
                  style={[admStyles.toggleBtn, { backgroundColor: n.enabled ? theme.colors.iosGreen : theme.colors.iosSeparator }]}
                  onPress={() => updateAdminNotification(n.id, { enabled: !n.enabled })}
                >
                  <View style={[admStyles.toggleKnob, { backgroundColor: theme.colors.surface, shadowColor: '#000' }, n.enabled ? admStyles.knobRight : admStyles.knobLeft]} />
                </Pressable>
              </View>
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Time</Text>
              <TimePickerRow
                hour={n.hour}
                minute={n.minute}
                onHourChange={h => updateAdminNotification(n.id, { hour: h })}
                onMinuteChange={m => updateAdminNotification(n.id, { minute: m })}
              />
            </View>
          </View>
        ))}

        {showAddForm ? (
          <View style={[admStyles.addCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[admStyles.addTitle, { color: theme.colors.iosLabel }]}>Add Notification</Text>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Title</Text>
              <TextInput
                style={[admStyles.input, { color: theme.colors.iosLabel, borderColor: theme.colors.iosSeparator }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Notification title"
                placeholderTextColor={theme.colors.iosGray}
              />
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Body</Text>
              <TextInput
                style={[admStyles.input, { color: theme.colors.iosLabel, borderColor: theme.colors.iosSeparator }]}
                value={newBody}
                onChangeText={setNewBody}
                placeholder="Notification message"
                placeholderTextColor={theme.colors.iosGray}
              />
            </View>

            <View style={admStyles.field}>
              <Text style={[admStyles.label, { color: theme.colors.iosSecondaryLabel }]}>Time</Text>
              <TimePickerRow
                hour={newHour}
                minute={newMinute}
                onHourChange={setNewHour}
                onMinuteChange={setNewMinute}
              />
            </View>

            <View style={admStyles.addBtnRow}>
              <Pressable style={admStyles.cancelBtn} onPress={() => setShowAddForm(false)}>
                <Text style={[admStyles.cancelBtnText, { color: theme.colors.iosSecondaryLabel }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[admStyles.addBtn, { backgroundColor: theme.colors.iosBlue }]} onPress={handleAdd}>
                <Text style={[admStyles.addBtnText, { color: theme.colors.surface }]}>Add</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[admStyles.addCardBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowAddForm(true)}>
            <Text style={[admStyles.addCardBtnText, { color: theme.colors.iosBlue }]}>+ Add Notification</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const admStyles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: { fontSize: 22, marginRight: 4, ...Platform.select({ android: { lineHeight: 22, textAlignVertical: 'center', includeFontPadding: false } }) },
  backText: { fontSize: 17 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  card: { borderRadius: 14, padding: 16 },
  cardSpacing: { marginTop: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardIndex: { fontSize: 14, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  deleteBtn: { fontSize: 15, fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16 },
  toggleBtn: { width: 51, height: 31, borderRadius: 15.5, justifyContent: 'center', paddingHorizontal: 2 },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  knobLeft: { alignSelf: 'flex-start' },
  knobRight: { alignSelf: 'flex-end' },
  timeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  timeDigit: { fontSize: 32, fontWeight: '800', letterSpacing: 2 },
  timeColon: { fontSize: 28, fontWeight: '700', marginHorizontal: 4 },
  pickerLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  pickerScroll: { maxHeight: 38 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  addCard: { borderRadius: 14, padding: 16, marginTop: 12 },
  addTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  addBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelBtnText: { fontSize: 16 },
  addBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  addBtnText: { fontSize: 16, fontWeight: '600' },
  addCardBtn: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  addCardBtnText: { fontSize: 16, fontWeight: '600' },
});
