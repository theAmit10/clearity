import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
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
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const endValid = endAt.getTime() > startAt.getTime();
  const canSave = title.trim().length > 0 && endValid;

  const openPicker = (field: 'start' | 'end') => {
    setTempDate(new Date(field === 'start' ? startAt : endAt));
    setPicker({ field, mode: 'date' });
  };

  const closePicker = () => {
    setPicker(null);
    setTempDate(null);
  };

  const onPickerChange = (event: any, selected?: Date) => {
    if (event?.type === 'dismissed') {
      closePicker();
      return;
    }
    if (!selected || !picker || !tempDate) return;
    const base = new Date(tempDate);
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
    setTempDate(next);
    if (Platform.OS === 'android' && picker.mode === 'date') {
      // Chain date -> time on Android so both are set in one flow.
      setPicker({ field: picker.field, mode: 'time' });
    }
  };

  const pickerTitle = picker
    ? t(picker.field === 'start' ? 'goals.startTime' : 'goals.endTime')
    : '';
  const pickerValue = tempDate ?? (picker?.field === 'start' ? startAt : endAt);
  const pickerDoneValid =
    !picker ||
    picker.field === 'start' ||
    (tempDate != null && tempDate.getTime() > startAt.getTime());

  const commitPicker = () => {
    if (!picker || !tempDate || !pickerDoneValid) return;
    if (picker.field === 'start') setStartAt(tempDate);
    else setEndAt(tempDate);
    closePicker();
  };

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
          keyboardDismissMode="on-drag"
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
            <Modal
              visible={!!picker}
              transparent
              animationType="fade"
              onRequestClose={closePicker}
            >
              <Pressable style={styles.modalOverlay} onPress={closePicker}>
                <Pressable onPress={() => {}}>
                  <Raised radius={16} distance={8} style={styles.modalCard}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {pickerTitle}
                    </Text>
                    <Text
                      style={[
                        styles.modalPreview,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {formatDateTime(pickerValue)}
                    </Text>
                    <DateTimePicker
                      value={pickerValue}
                      mode={picker.mode}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={picker.field === 'end' ? startAt : undefined}
                      onChange={onPickerChange}
                    />
                    <View style={styles.modalToggleRow}>
                      <View style={styles.modalActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          forcePressed={picker.mode === 'date'}
                          style={styles.modalActionBtn}
                          onPress={() =>
                            setPicker(p =>
                              p ? { field: p.field, mode: 'date' } : p,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.modalToggleText,
                              { color: theme.colors.textPrimary },
                            ]}
                          >
                            {t('goals.pickDate')}
                          </Text>
                        </NeumorphicButton>
                      </View>
                      <View style={styles.modalActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          forcePressed={picker.mode === 'time'}
                          style={styles.modalActionBtn}
                          onPress={() =>
                            setPicker(p =>
                              p ? { field: p.field, mode: 'time' } : p,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.modalToggleText,
                              { color: theme.colors.textPrimary },
                            ]}
                          >
                            {t('goals.pickTime')}
                          </Text>
                        </NeumorphicButton>
                      </View>
                    </View>
                    <View style={styles.modalActions}>
                      <View style={styles.modalActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          style={styles.modalActionBtn}
                          onPress={closePicker}
                        >
                          <Text
                            style={[
                              styles.modalToggleText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {t('common.cancel')}
                          </Text>
                        </NeumorphicButton>
                      </View>
                      <View style={styles.modalActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          disabled={!pickerDoneValid}
                          backgroundColor={
                            pickerDoneValid ? color : theme.colors.insetFill
                          }
                          style={styles.modalActionBtn}
                          onPress={commitPicker}
                        >
                          <Text
                            style={[
                              styles.modalSaveText,
                              !pickerDoneValid && {
                                color: theme.colors.textMuted,
                              },
                            ]}
                          >
                            {t('common.save')}
                          </Text>
                        </NeumorphicButton>
                      </View>
                    </View>
                  </Raised>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          <View style={styles.saveWrap}>
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
          </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  modalPreview: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  modalToggleRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalToggleText: { fontSize: 14, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalActionWrap: { flex: 1 },
  modalActionBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  saveWrap: { marginTop: 28 },
  saveButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
