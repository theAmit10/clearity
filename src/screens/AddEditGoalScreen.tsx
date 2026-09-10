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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useGoalStore } from '../store/goalStore';
import { HABIT_ICONS } from '../constants/habitIcons';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

const COLORS = [
  '#FF3B30',
  '#FF5A5F',
  '#FF6B35',
  '#FF9500',
  '#FFCC00',
  '#FFD60A',
  '#4CD964',
  '#34C759',
  '#30D158',
  '#00C7BE',
  '#00E5A0',
  '#32ADE6',
  '#64D2FF',
  '#007AFF',
  '#0A84FF',
  '#5856D6',
  '#5E5CE6',
  '#AF52DE',
  '#BF5AF2',
  '#FF2D55',
  '#FF375F',
  '#A2845E',
  '#C2703D',
  '#556B2F',
  '#2E7D32',
  '#8E8E93',
  '#6E6E73',
  '#1C1C1E',
];

function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AddEditGoalScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const editId = route.params?.id;
  const existing = useGoalStore(s => s.goals.find(g => g.id === editId));
  const addGoal = useGoalStore(s => s.addGoal);
  const updateGoal = useGoalStore(s => s.updateGoal);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? HABIT_ICONS[0].key);
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [startAt, setStartAt] = useState<Date>(
    existing ? new Date(existing.startAt) : new Date(),
  );
  const [endAt, setEndAt] = useState<Date>(
    existing ? new Date(existing.endAt) : new Date(Date.now() + 7 * 86400000),
  );
  const [picker, setPicker] = useState<null | {
    field: 'start' | 'end';
    mode: 'date' | 'time';
  }>(null);

  const endValid = endAt.getTime() > startAt.getTime();
  const canSave = title.trim().length > 0 && endValid;

  const onPickerChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (event?.type === 'dismissed') return;
    if (!selected || !picker) return;
    const base = picker.field === 'start' ? new Date(startAt) : new Date(endAt);
    let next: Date;
    if (picker.mode === 'date') {
      next = new Date(base);
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
    } else {
      next = new Date(base);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    if (picker.field === 'start') setStartAt(next);
    else setEndAt(next);
    if (Platform.OS === 'ios') {
      // keep picker open for time after date on iOS for fast flow
    } else {
      setPicker(null);
    }
  };

  const openPicker = (field: 'start' | 'end') =>
    setPicker({ field, mode: 'date' });

  const handleSave = async () => {
    if (!canSave) return;
    const payload: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    };
    if (existing) {
      await updateGoal(existing.id, payload);
    } else {
      await addGoal(payload);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t(existing ? 'goals.titleEdit' : 'goals.titleNew')}
          </Text>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t('goals.name')}
          </Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('goals.namePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.textPrimary }]}
            />
          </Inset>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t('goals.description')}
          </Text>
          <Inset radius={14} style={styles.inputWrap}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t('goals.descriptionPlaceholder')}
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

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t('goals.icon')}
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
            {t('goals.color')}
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
            {t('goals.startTime')}
          </Text>
          <NeumorphicButton
            radius={14}
            distance={4}
            style={styles.dateButton}
            onPress={() => openPicker('start')}
          >
            <Text
              style={[styles.dateText, { color: theme.colors.textPrimary }]}
            >
              {formatDateTime(startAt)}
            </Text>
          </NeumorphicButton>

          <Text style={[styles.label, { color: theme.colors.textMuted }]}>
            {t('goals.endTime')}
          </Text>
          <NeumorphicButton
            radius={14}
            distance={4}
            style={styles.dateButton}
            onPress={() => openPicker('end')}
          >
            <Text
              style={[styles.dateText, { color: theme.colors.textPrimary }]}
            >
              {formatDateTime(endAt)}
            </Text>
          </NeumorphicButton>
          {!endValid && (
            <Text style={[styles.error, { color: '#FF3B30' }]}>
              {t('goals.endAfterStart')}
            </Text>
          )}

          {picker && (
            <DateTimePicker
              value={picker.field === 'start' ? startAt : endAt}
              mode={picker.mode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={picker.field === 'end' ? startAt : undefined}
              onChange={onPickerChange}
            />
          )}
          {picker && Platform.OS === 'ios' && (
            <View style={styles.iosPickerRow}>
              <NeumorphicButton
                radius={12}
                distance={4}
                style={styles.iosPickerBtn}
                onPress={() =>
                  setPicker(p =>
                    p
                      ? {
                          field: p.field,
                          mode: p.mode === 'date' ? 'time' : 'date',
                        }
                      : p,
                  )
                }
              >
                <Text
                  style={[
                    styles.iosPickerText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {picker.mode === 'date'
                    ? t('goals.pickTime')
                    : t('goals.pickDate')}
                </Text>
              </NeumorphicButton>
              <NeumorphicButton
                radius={12}
                distance={4}
                style={styles.iosPickerBtn}
                onPress={() => setPicker(null)}
              >
                <Text
                  style={[styles.iosPickerText, { color: theme.colors.accent }]}
                >
                  ✓
                </Text>
              </NeumorphicButton>
            </View>
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
              {t(existing ? 'goals.saveChanges' : 'goals.createGoal')}
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
  inputWrap: { paddingHorizontal: 4 },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  iconOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOption: { width: 40, height: 40 },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  dateText: { fontSize: 16, fontWeight: '700' },
  error: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  iosPickerRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  iosPickerBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  iosPickerText: { fontSize: 14, fontWeight: '700' },
  saveButton: {
    marginTop: 2,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
