import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { neumorphic } from '../theme/neumorphicTheme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function AdminNotificationScreen({ navigation }: any) {
  const adminNotifications = useHabitStore(s => s.adminNotifications);
  const updateAdminNotification = useHabitStore(s => s.updateAdminNotification);
  const addAdminNotification = useHabitStore(s => s.addAdminNotification);
  const removeAdminNotification = useHabitStore(s => s.removeAdminNotification);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newHour, setNewHour] = useState(12);
  const [newMinute, setNewMinute] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSaveEdit = async (id: string) => {
    if (!editingId) return;
    const n = adminNotifications.find(x => x.id === id);
    if (!n) return;
    if (!n.title.trim()) {
      Alert.alert('Validation', 'Title cannot be empty.');
      return;
    }
    await updateAdminNotification(id, {});
    setEditingId(null);
  };

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Notifications</Text>
        </Pressable>

        <Text style={styles.title}>Admin Notifications</Text>
        <Text style={styles.subtitle}>
          Configure hardcoded daily reminders sent to all users at specified times.
        </Text>

        {adminNotifications.map((n, i) => (
          <View key={n.id} style={[styles.card, i > 0 && styles.cardSpacing]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIndex}>#{i + 1}</Text>
              <Pressable onPress={() => handleRemove(n.id)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={n.title}
                onChangeText={val => updateAdminNotification(n.id, { title: val })}
                placeholder="Notification title"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Body</Text>
              <TextInput
                style={styles.input}
                value={n.body}
                onChangeText={val => updateAdminNotification(n.id, { body: val })}
                placeholder="Notification message"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Enabled</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusText}>{n.enabled ? 'On' : 'Off'}</Text>
                <Pressable
                  style={[styles.toggleBtn, n.enabled ? styles.toggleActive : styles.toggleInactive]}
                  onPress={() => updateAdminNotification(n.id, { enabled: !n.enabled })}
                >
                  <View style={[styles.toggleKnob, n.enabled ? styles.knobRight : styles.knobLeft]} />
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Time (24h)</Text>
              <View style={styles.timeRowCompact}>
                <View style={styles.timePickerCompact}>
                  <ScrollView style={styles.compactScroll} nestedScrollEnabled>
                    {HOURS.map(h => (
                      <Pressable
                        key={h}
                        style={[styles.compactItem, n.hour === h && styles.compactItemSelected]}
                        onPress={() => updateAdminNotification(n.id, { hour: h })}
                      >
                        <Text style={[styles.compactText, n.hour === h && styles.compactTextSelected]}>
                          {String(h).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={styles.timePickerCompact}>
                  <ScrollView style={styles.compactScroll} nestedScrollEnabled>
                    {MINUTES.map(m => (
                      <Pressable
                        key={m}
                        style={[styles.compactItem, n.minute === m && styles.compactItemSelected]}
                        onPress={() => updateAdminNotification(n.id, { minute: m })}
                      >
                        <Text style={[styles.compactText, n.minute === m && styles.compactTextSelected]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        ))}

        {showAddForm ? (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Add Notification</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Notification title"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Body</Text>
              <TextInput
                style={styles.input}
                value={newBody}
                onChangeText={setNewBody}
                placeholder="Notification message"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Time (24h)</Text>
              <View style={styles.timeRowCompact}>
                <View style={styles.timePickerCompact}>
                  <ScrollView style={styles.compactScroll} nestedScrollEnabled>
                    {HOURS.map(h => (
                      <Pressable
                        key={h}
                        style={[styles.compactItem, newHour === h && styles.compactItemSelected]}
                        onPress={() => setNewHour(h)}
                      >
                        <Text style={[styles.compactText, newHour === h && styles.compactTextSelected]}>
                          {String(h).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text style={styles.colon}>:</Text>
                <View style={styles.timePickerCompact}>
                  <ScrollView style={styles.compactScroll} nestedScrollEnabled>
                    {MINUTES.map(m => (
                      <Pressable
                        key={m}
                        style={[styles.compactItem, newMinute === m && styles.compactItemSelected]}
                        onPress={() => setNewMinute(m)}
                      >
                        <Text style={[styles.compactText, newMinute === m && styles.compactTextSelected]}>
                          {String(m).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.addBtnRow}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAddForm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addCardBtn} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addCardBtnText}>+ Add Notification</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  deleteBtn: { fontSize: 15, color: '#FF3B30', fontWeight: '600' },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 4, textTransform: 'uppercase' },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusText: { fontSize: 16, color: '#1C1C1E' },
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
  timeRowCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timePickerCompact: { width: 80, maxHeight: 120 },
  compactScroll: { maxHeight: 120 },
  compactItem: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6, marginVertical: 1 },
  compactItemSelected: { backgroundColor: '#007AFF' },
  compactText: { fontSize: 16, color: '#1C1C1E', textAlign: 'center' },
  compactTextSelected: { color: '#FFF', fontWeight: '700' },
  colon: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', marginHorizontal: 6 },
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
