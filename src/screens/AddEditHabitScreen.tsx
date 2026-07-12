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
import { neumorphic } from '../theme/neumorphicTheme';

// const COLORS = [
//   '#FF5A5F',
//   '#FF9500',
//   '#FFCC00',
//   '#4CD964',
//   '#34C759',
//   '#00C7BE',
//   '#32ADE6',
//   '#007AFF',
//   '#5856D6',
//   '#AF52DE',
//   '#FF2D55',
//   '#A2845E',
//   '#8E8E93',
//   '#1C1C1E',
// ];

const COLORS = [
  // Reds / oranges
  '#FF3B30',
  '#FF5A5F',
  '#FF6B35',
  '#FF9500',
  // Yellows / greens
  '#FFCC00',
  '#FFD60A',
  '#4CD964',
  '#34C759',
  '#30D158',
  // Teals / blues
  '#00C7BE',
  '#00E5A0',
  '#32ADE6',
  '#64D2FF',
  '#007AFF',
  '#0A84FF',
  // Indigos / purples
  '#5856D6',
  '#5E5CE6',
  '#AF52DE',
  '#BF5AF2',
  // Pinks / rose
  '#FF2D55',
  '#FF375F',
  // Earth tones
  '#A2845E',
  '#C2703D',
  '#556B2F',
  '#2E7D32',
  // Neutrals
  '#8E8E93',
  '#6E6E73',
  '#1C1C1E',
];

const GOAL_PRESETS = ['Daily', 'Weekly', 'Monthly'];

export default function AddEditHabitScreen({ route, navigation }: any) {
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
      const isFirstHabit = habits.length === 0;
      await addHabit({ ...trimmed, frequency: '' });
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
        >
          <Text style={styles.title}>
            {existing ? 'Edit Habit' : 'New Habit'}
          </Text>

          <Text style={styles.label}>Name</Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Drink water"
              placeholderTextColor={neumorphic.colors.textMuted}
              style={styles.input}
            />
          </Inset>

          <Text style={styles.label}>Description</Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. 8 glasses per day"
              placeholderTextColor={neumorphic.colors.textMuted}
              style={[styles.input, styles.multiline]}
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
          {/* <View style={styles.goalPresetRow}>
            {GOAL_PRESETS.map(preset => {
              const selected = goal === preset;
              return (
                <NeumorphicButton
                  key={preset}
                  radius={12}
                  distance={4}
                  forcePressed={selected}
                  style={[
                    styles.goalPresetPill,
                    selected && { backgroundColor: `${color}26` },
                  ]}
                  onPress={() => setGoal(preset)}
                >
                  <Text style={[styles.goalPresetText, selected && { color }]}>
                    {preset}
                  </Text>
                </NeumorphicButton>
              );
            })}
          </View> */}

          <Text style={styles.label}>Icon</Text>
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
                    color={selected ? color : neumorphic.colors.textMuted}
                  />
                </NeumorphicButton>
              );
            })}
          </View>

          <Text style={styles.label}>Color</Text>
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
                      selected && styles.colorOptionSelected,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          <NeumorphicButton
            radius={16}
            distance={6}
            disabled={!canSave}
            backgroundColor={canSave ? color : neumorphic.colors.insetFill}
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text
              style={[
                styles.saveButtonText,
                !canSave && styles.saveButtonTextDisabled,
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
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: neumorphic.colors.textPrimary,
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: neumorphic.colors.textMuted,
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
    color: neumorphic.colors.textPrimary,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  goalPresetRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  goalPresetPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPresetText: {
    fontSize: 13,
    fontWeight: '700',
    color: neumorphic.colors.textMuted,
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
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: neumorphic.colors.textPrimary,
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
  saveButtonTextDisabled: {
    color: neumorphic.colors.textMuted,
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
