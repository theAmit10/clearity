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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { neumorphic } from '../theme/neumorphicTheme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function TimePickerRow({ hour, minute, onHourChange, onMinuteChange }: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
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
        <Animated.Text style={[admStyles.timeDigit, { transform: [{ scale: hourScale }] }]}>
          {String(hour).padStart(2, '0')}
        </Animated.Text>
        <Text style={admStyles.timeColon}>:</Text>
        <Animated.Text style={[admStyles.timeDigit, { transform: [{ scale: minuteScale }] }]}>
          {String(minute).padStart(2, '0')}
        </Animated.Text>
      </View>

      <Text style={admStyles.pickerLabel}>HOUR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={admStyles.pickerScroll}>
        {HOURS.map(h => (
          <Pressable
            key={h}
            style={[admStyles.pill, hour === h && admStyles.pillSelected]}
            onPress={() => onHourChange(h)}
          >
            <Text style={[admStyles.pillText, hour === h && admStyles.pillTextSelected]}>
              {String(h).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[admStyles.pickerLabel, { marginTop: 8 }]}>MIN</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={admStyles.pickerScroll}>
        {MINUTES.map(m => (
          <Pressable
            key={m}
            style={[admStyles.pill, minute === m && admStyles.pillSelected]}
            onPress={() => onMinuteChange(m)}
          >
            <Text style={[admStyles.pillText, minute === m && admStyles.pillTextSelected]}>
              {String(m).padStart(2, '0')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function AdminNotificationScreen({ navigation }: any) {
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
    <SafeAreaView style={admStyles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={admStyles.backRow}>
          <Text style={admStyles.backArrow}>←</Text>
          <Text style={admStyles.backText}>Notifications</Text>
        </Pressable>

        <Text style={admStyles.title}>Admin Notifications</Text>
        <Text style={admStyles.subtitle}>
          Configure hardcoded daily reminders sent to all users at specified times.
        </Text>

        {adminNotifications.map((n, i) => (
          <View key={n.id} style={[admStyles.card, i > 0 && admStyles.cardSpacing]}>
            <View style={admStyles.cardHeader}>
              <Text style={admStyles.cardIndex}>#{i + 1}</Text>
              <View style={admStyles.cardActions}>
                <Text style={[admStyles.statusBadge, n.enabled ? admStyles.statusOn : admStyles.statusOff]}>
                  {n.enabled ? 'Active' : 'Paused'}
                </Text>
                <Pressable onPress={() => handleRemove(n.id)}>
                  <Text style={admStyles.deleteBtn}>Delete</Text>
                </Pressable>
              </View>
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Title</Text>
              <TextInput
                style={admStyles.input}
                value={n.title}
                onChangeText={val => updateAdminNotification(n.id, { title: val })}
                placeholder="Notification title"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Body</Text>
              <TextInput
                style={admStyles.input}
                value={n.body}
                onChangeText={val => updateAdminNotification(n.id, { body: val })}
                placeholder="Notification message"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Enabled</Text>
              <View style={admStyles.toggleRow}>
                <Text style={admStyles.toggleLabel}>{n.enabled ? 'On' : 'Off'}</Text>
                <Pressable
                  style={[admStyles.toggleBtn, n.enabled ? admStyles.toggleActive : admStyles.toggleInactive]}
                  onPress={() => updateAdminNotification(n.id, { enabled: !n.enabled })}
                >
                  <View style={[admStyles.toggleKnob, n.enabled ? admStyles.knobRight : admStyles.knobLeft]} />
                </Pressable>
              </View>
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Time</Text>
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
          <View style={admStyles.addCard}>
            <Text style={admStyles.addTitle}>Add Notification</Text>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Title</Text>
              <TextInput
                style={admStyles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Notification title"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Body</Text>
              <TextInput
                style={admStyles.input}
                value={newBody}
                onChangeText={setNewBody}
                placeholder="Notification message"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={admStyles.field}>
              <Text style={admStyles.label}>Time</Text>
              <TimePickerRow
                hour={newHour}
                minute={newMinute}
                onHourChange={setNewHour}
                onMinuteChange={setNewMinute}
              />
            </View>

            <View style={admStyles.addBtnRow}>
              <Pressable style={admStyles.cancelBtn} onPress={() => setShowAddForm(false)}>
                <Text style={admStyles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={admStyles.addBtn} onPress={handleAdd}>
                <Text style={admStyles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={admStyles.addCardBtn} onPress={() => setShowAddForm(true)}>
            <Text style={admStyles.addCardBtnText}>+ Add Notification</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const admStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: { fontSize: 22, color: '#007AFF', marginRight: 4 },
  backText: { fontSize: 17, color: '#007AFF' },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 20, lineHeight: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16 },
  cardSpacing: { marginTop: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardIndex: { fontSize: 14, fontWeight: '700', color: '#8E8E93' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  statusOn: { backgroundColor: '#E8F8E8', color: '#34C759' },
  statusOff: { backgroundColor: '#F2F2F7', color: '#8E8E93' },
  deleteBtn: { fontSize: 15, color: '#FF3B30', fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 16, color: '#1C1C1E' },
  toggleBtn: { width: 51, height: 31, borderRadius: 15.5, justifyContent: 'center', paddingHorizontal: 2 },
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
  timeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  timeDigit: { fontSize: 32, fontWeight: '800', color: '#1C1C1E', letterSpacing: 2 },
  timeColon: { fontSize: 28, fontWeight: '700', color: '#8E8E93', marginHorizontal: 4 },
  pickerLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', marginBottom: 6, letterSpacing: 1 },
  pickerScroll: { maxHeight: 38 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#F2F2F7',
  },
  pillSelected: { backgroundColor: '#007AFF' },
  pillText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  pillTextSelected: { color: '#FFF' },
  addCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginTop: 12 },
  addTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  addBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  cancelBtnText: { fontSize: 16, color: '#8E8E93' },
  addBtn: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  addBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  addCardBtn: {
    marginTop: 12,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    alignItems: 'center',
  },
  addCardBtnText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
});
