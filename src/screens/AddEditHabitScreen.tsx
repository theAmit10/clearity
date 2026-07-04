import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';

const ICONS = ['💪', '📚', '💧', '🧘', '🏃', '🥗', '😴', '✍️', '🎯', '🚭', '💰', '🎸'];
const COLORS = ['#FF5A5F', '#4CAF50', '#FF9500', '#007AFF', '#AF52DE', '#5AC8FA', '#FFCC00'];

export default function AddEditHabitScreen({ route, navigation }: any) {
  const editId = route.params?.id;
  const existing = useHabitStore(s => s.habits.find(h => h.id === editId));
  const addHabit = useHabitStore(s => s.addHabit);
  const updateHabit = useHabitStore(s => s.updateHabit);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]);
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [goal, setGoal] = useState(existing?.goal ?? '');

  const canSave = name.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    const trimmed = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      goal: goal.trim() || undefined,
    };
    if (existing) {
      await updateHabit(existing.id, trimmed);
    } else {
      await addHabit({ ...trimmed, frequency: 'daily' });
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.title}>{existing ? 'Edit Habit' : 'New Habit'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Drink water"
            placeholderTextColor="#C7C7CC"
            style={styles.input}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. 8 glasses per day"
            placeholderTextColor="#C7C7CC"
            style={[styles.input, styles.multiline]}
            multiline
            numberOfLines={2}
          />

          <Text style={styles.label}>Goal</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="e.g. Daily"
            placeholderTextColor="#C7C7CC"
            style={styles.input}
          />

          <Text style={styles.label}>Icon</Text>
          <View style={styles.row}>
            {ICONS.map(i => (
              <Pressable
                key={i}
                onPress={() => setIcon(i)}
                style={[styles.iconOption, icon === i && styles.iconOptionSelected]}>
                <Text style={{ fontSize: 22 }}>{i}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Color</Text>
          <View style={styles.row}>
            {COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionSelected,
                ]}
              />
            ))}
          </View>

          <Pressable
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            disabled={!canSave}
            onPress={handleSave}>
            <Text style={styles.saveButtonText}>{existing ? 'Save Changes' : 'Create Habit'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  title: { fontSize: 26, fontWeight: '700', color: '#1C1C1E', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: { borderColor: '#007AFF' },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#1C1C1E' },
  saveButton: {
    marginTop: 32,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: '#C7C7CC' },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
});
