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
import { requestReview } from 'react-native-store-review';
import { useHabitStore } from '../store/habitStore';
import { logEvent } from '../services/logger';
import { HABIT_ICONS } from '../constants/habitIcons';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import type { FrequencyType } from '../types/habit';

const COLORS = [
  '#FF3B30', '#FF5A5F', '#FF6B35', '#FF9500',
  '#FFCC00', '#FFD60A', '#4CD964', '#34C759', '#30D158',
  '#00C7BE', '#00E5A0', '#32ADE6', '#64D2FF', '#007AFF', '#0A84FF',
  '#5856D6', '#5E5CE6', '#AF52DE', '#BF5AF2',
  '#FF2D55', '#FF375F',
  '#A2845E', '#C2703D', '#556B2F', '#2E7D32',
  '#8E8E93', '#6E6E73', '#1C1C1E',
];

const FREQUENCY_OPTIONS: { key: FrequencyType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'every_n_days', label: 'Every N days' },
  { key: 'n_times_per_week', label: 'X times / week' },
  { key: 'n_times_per_month', label: 'X times / month' },
  { key: 'n_times_in_m_days', label: 'X times in Y days' },
];

export default function AddEditHabitScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const editId = route.params?.id;
  const existing = useHabitStore(s => s.habits.find(h => h.id === editId));
  const addHabit = useHabitStore(s => s.addHabit);
  const updateHabit = useHabitStore(s => s.updateHabit);
  const habits = useHabitStore(s => s.habits);
  const reviewPromptShown = useHabitStore(s => s.reviewPromptShown);
  const markReviewPromptShown = useHabitStore(s => s.markReviewPromptShown);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? HABIT_ICONS[0].key);
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [goal, setGoal] = useState(existing?.goal ?? '');
  const [frequency, setFrequency] = useState<FrequencyType>(existing?.frequency ?? 'daily');
  const [frequencyValue, setFrequencyValue] = useState(existing?.frequencyValue?.toString() ?? '');
  const [frequencyWindow, setFrequencyWindow] = useState(existing?.frequencyWindow?.toString() ?? '');

  const freqV = parseInt(frequencyValue, 10);
  const freqW = parseInt(frequencyWindow, 10);
  const timesValid = frequency !== 'n_times_in_m_days' || (freqV >= 1 && freqV <= 12);
  const windowValid = frequency !== 'n_times_in_m_days' || (freqW >= 1 && freqW <= 30);
  const canSave = name.trim().length > 0 && timesValid && windowValid;

  const handleSave = async () => {
    if (!canSave) return;
    const payload: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      goal: goal.trim() || undefined,
      frequency,
      frequencyValue: frequency === 'daily' ? undefined
        : frequency === 'n_times_in_m_days'
        ? Math.min(12, Math.max(1, parseInt(frequencyValue, 10) || 1))
        : parseInt(frequencyValue, 10) || undefined,
      frequencyWindow: frequency === 'n_times_in_m_days'
        ? Math.min(30, Math.max(1, parseInt(frequencyWindow, 10) || 1))
        : undefined,
    };
    if (existing) {
      await updateHabit(existing.id, payload);
    } else {
      const isFirstHabit = habits.length === 0;
      await addHabit(payload);
      if (isFirstHabit && !reviewPromptShown) {
        await markReviewPromptShown();
        logEvent('info', 'In-app review requested');
        try {
          requestReview();
        } catch (e) {
          logEvent('error', 'In-app review failed', e);
        }
      }
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {existing ? 'Edit Habit' : 'New Habit'}
          </Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Name
          </Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Drink water"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.textPrimary }]}
            />
          </Inset>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Description
          </Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 8 glasses per day"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                styles.multiline,
                { color: theme.colors.textPrimary },
              ]}
              multiline
              numberOfLines={2}
            />
          </Inset>

          {/* <Text style={styles.label}>Goal</Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={goal}
              onChangeText={setGoal}
              placeholder="e.g. Daily"
              placeholderTextColor={neumorphic.colors.textMuted}
              style={styles.input}
            />
          </Inset> */}

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Icon
          </Text>
          <View style={styles.row}>
            {HABIT_ICONS.map(({ key, Icon }) => {
              const selected = icon === key;
              return (
                <NeumorphicButton
                  key={key}
                  radius={14}
                  distance={4}
                  forcePressed={selected}
                  style={[
                    styles.iconOption,
                    selected && { backgroundColor: `${color}26` },
                  ]}
                  onPress={() => setIcon(key)}
                >
                  <Icon
                    size={22}
                    color={selected ? color : theme.colors.textMuted}
                  />
                </NeumorphicButton>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Color
          </Text>
          <View style={styles.row}>
            {COLORS.map(c => {
              const selected = color === c;
              return (
                <Pressable key={c} onPress={() => setColor(c)} hitSlop={4}>
                  <Raised
                    radius={20}
                    distance={4}
                    backgroundColor={c}
                    style={[
                      styles.colorOption,
                      selected && {
                        borderWidth: 3,
                        borderColor: theme.colors.textPrimary,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            Frequency
          </Text>
          <View style={styles.freqRow}>
            {FREQUENCY_OPTIONS.map(opt => {
              const selected = frequency === opt.key;
              return (
                <NeumorphicButton
                  key={opt.key}
                  radius={12}
                  distance={4}
                  forcePressed={selected}
                  style={[
                    styles.freqPill,
                    selected && { backgroundColor: `${color}26` },
                  ]}
                  onPress={() => setFrequency(opt.key)}
                >
                  <Text
                    style={[
                      styles.freqPillText,
                      { color: selected ? color : theme.colors.textMuted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </NeumorphicButton>
              );
            })}
          </View>

          {frequency === 'every_n_days' && (
            <View style={styles.freqInputRow}>
              <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>Every</Text>
              <Inset radius={10} style={styles.freqInset}>
                <TextInput
                  style={[styles.freqInput, { color: theme.colors.textPrimary }]}
                  value={frequencyValue}
                  onChangeText={setFrequencyValue}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Inset>
              <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>days</Text>
            </View>
          )}

          {frequency === 'n_times_per_week' && (
            <View style={styles.freqInputRow}>
              <Inset radius={10} style={styles.freqInset}>
                <TextInput
                  style={[styles.freqInput, { color: theme.colors.textPrimary }]}
                  value={frequencyValue}
                  onChangeText={setFrequencyValue}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Inset>
              <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>times per week</Text>
            </View>
          )}

          {frequency === 'n_times_per_month' && (
            <View style={styles.freqInputRow}>
              <Inset radius={10} style={styles.freqInset}>
                <TextInput
                  style={[styles.freqInput, { color: theme.colors.textPrimary }]}
                  value={frequencyValue}
                  onChangeText={setFrequencyValue}
                  keyboardType="number-pad"
                  placeholder="4"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Inset>
              <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>times per month</Text>
            </View>
          )}

          {frequency === 'n_times_in_m_days' && (
            <>
              <View style={styles.freqInputRow}>
                <Inset radius={10} style={styles.freqInset}>
                  <TextInput
                    style={[styles.freqInput, { color: theme.colors.textPrimary }]}
                    value={frequencyValue}
                    onChangeText={setFrequencyValue}
                    keyboardType="number-pad"
                    placeholder="3"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </Inset>
                <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>times every</Text>
                <Inset radius={10} style={styles.freqInset}>
                  <TextInput
                    style={[styles.freqInput, { color: theme.colors.textPrimary }]}
                    value={frequencyWindow}
                    onChangeText={setFrequencyWindow}
                    keyboardType="number-pad"
                    placeholder="7"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </Inset>
                <Text style={[styles.freqInputLabel, { color: theme.colors.textPrimary }]}>days</Text>
              </View>
              <Text style={[styles.freqHint, { color: theme.colors.textMuted }]}>Max 12 times in 30 days</Text>
            </>
          )}

          <NeumorphicButton
            radius={16}
            distance={6}
            disabled={!canSave}
            backgroundColor={canSave ? color : theme.colors.insetFill}
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text
              style={[
                styles.saveButtonText,
                !canSave && { color: theme.colors.textMuted },
              ]}
            >
              {existing ? 'Save Changes' : 'Create Habit'}
            </Text>
          </NeumorphicButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 22,
  },
  inputWrap: {
    paddingHorizontal: 4,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  freqPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  freqInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 2 },
  freqInputLabel: { fontSize: 14, fontWeight: '600' },
  freqInset: { width: 64, paddingVertical: 2 },
  freqInput: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  iconOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
  },
  saveButton: {
    marginTop: 2,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  saveButtonTextDisabled: {},
  freqHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
});

// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   StyleSheet,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useHabitStore } from '../store/habitStore';

// const ICONS = ['💪', '📚', '💧', '🧘', '🏃', '🥗', '😴', '✍️', '🎯', '🚭', '💰', '🎸'];
// const COLORS = ['#FF5A5F', '#4CAF50', '#FF9500', '#007AFF', '#AF52DE', '#5AC8FA', '#FFCC00'];

// export default function AddEditHabitScreen({ route, navigation }: any) {
//   const editId = route.params?.id;
//   const existing = useHabitStore(s => s.habits.find(h => h.id === editId));
//   const addHabit = useHabitStore(s => s.addHabit);
//   const updateHabit = useHabitStore(s => s.updateHabit);

//   const [name, setName] = useState(existing?.name ?? '');
//   const [description, setDescription] = useState(existing?.description ?? '');
//   const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]);
//   const [color, setColor] = useState(existing?.color ?? COLORS[0]);
//   const [goal, setGoal] = useState(existing?.goal ?? '');

//   const canSave = name.trim().length > 0;

//   const handleSave = async () => {
//     if (!canSave) return;
//     const trimmed = {
//       name: name.trim(),
//       description: description.trim() || undefined,
//       icon,
//       color,
//       goal: goal.trim() || undefined,
//     };
//     if (existing) {
//       await updateHabit(existing.id, trimmed);
//     } else {
//       await addHabit({ ...trimmed, frequency: 'daily' });
//     }
//     navigation.goBack();
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
//         <ScrollView contentContainerStyle={{ padding: 20 }}>
//           <Text style={styles.title}>{existing ? 'Edit Habit' : 'New Habit'}</Text>

//           <Text style={styles.label}>Name</Text>
//           <TextInput
//             value={name}
//             onChangeText={setName}
//             placeholder="e.g. Drink water"
//             placeholderTextColor="#C7C7CC"
//             style={styles.input}
//           />

//           <Text style={styles.label}>Description</Text>
//           <TextInput
//             value={description}
//             onChangeText={setDescription}
//             placeholder="e.g. 8 glasses per day"
//             placeholderTextColor="#C7C7CC"
//             style={[styles.input, styles.multiline]}
//             multiline
//             numberOfLines={2}
//           />

//           <Text style={styles.label}>Goal</Text>
//           <TextInput
//             value={goal}
//             onChangeText={setGoal}
//             placeholder="e.g. Daily"
//             placeholderTextColor="#C7C7CC"
//             style={styles.input}
//           />

//           <Text style={styles.label}>Icon</Text>
//           <View style={styles.row}>
//             {ICONS.map(i => (
//               <Pressable
//                 key={i}
//                 onPress={() => setIcon(i)}
//                 style={[styles.iconOption, icon === i && styles.iconOptionSelected]}>
//                 <Text style={{ fontSize: 22 }}>{i}</Text>
//               </Pressable>
//             ))}
//           </View>

//           <Text style={styles.label}>Color</Text>
//           <View style={styles.row}>
//             {COLORS.map(c => (
//               <Pressable
//                 key={c}
//                 onPress={() => setColor(c)}
//                 style={[
//                   styles.colorOption,
//                   { backgroundColor: c },
//                   color === c && styles.colorOptionSelected,
//                 ]}
//               />
//             ))}
//           </View>

//           <Pressable
//             style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
//             disabled={!canSave}
//             onPress={handleSave}>
//             <Text style={styles.saveButtonText}>{existing ? 'Save Changes' : 'Create Habit'}</Text>
//           </Pressable>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F2F2F7' },
//   title: { fontSize: 26, fontWeight: '700', color: '#1C1C1E', marginBottom: 24 },
//   label: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 8, marginTop: 20 },
//   input: {
//     backgroundColor: '#FFF',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     color: '#1C1C1E',
//   },
//   row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
//   iconOption: {
//     width: 44,
//     height: 44,
//     borderRadius: 12,
//     backgroundColor: '#FFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: 'transparent',
//   },
//   iconOptionSelected: { borderColor: '#007AFF' },
//   colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
//   colorOptionSelected: { borderColor: '#1C1C1E' },
//   saveButton: {
//     marginTop: 32,
//     backgroundColor: '#007AFF',
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   saveButtonDisabled: { backgroundColor: '#C7C7CC' },
//   saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
//   multiline: { minHeight: 60, textAlignVertical: 'top' },
// });
