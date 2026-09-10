import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import TrashIcon from 'react-native-heroicons/outline/TrashIcon';
import { useGoalStore } from '../store/goalStore';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { getHabitIcon } from '../constants/habitIcons';
import {
  getCountdownParts,
  formatOverdue,
} from '../services/goalUtils';
import GoalCompletionAnalytics from '../components/GoalCompletionAnalytics';
import { useTranslation } from '../i18n';

function Pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function GoalDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { id } = route.params;
  const goal = useGoalStore(s => s.goals.find(g => g.id === id));
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const completeGoal = useGoalStore(s => s.completeGoal);
  const extendGoal = useGoalStore(s => s.extendGoal);
  const allGoalNotifs = useGoalStore(s => s.goalNotifications);
  const addGoalReminder = useGoalStore(s => s.addGoalReminder);
  const updateGoalReminder = useGoalStore(s => s.updateGoalReminder);
  const removeGoalReminder = useGoalStore(s => s.removeGoalReminder);

  const [now, setNow] = useState(Date.now());
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState<Date>(new Date());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [rTitle, setRTitle] = useState('');
  const [rBody, setRBody] = useState('');
  const [rDate, setRDate] = useState<Date>(new Date(Date.now() + 3600000));

  useEffect(() => {
    if (goal?.status === 'completed') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [goal?.status]);

  useEffect(() => {
    if (goal)
      setExtendDate(new Date(new Date(goal.endAt).getTime() + 86400000));
  }, [goal?.id]);

  if (!goal) return null;

  const autoReminders = allGoalNotifs
    .filter(n => n.goalId === id && n.kind !== 'custom')
    .sort((a, b) => a.timestamp - b.timestamp);
  const customReminders = allGoalNotifs
    .filter(n => n.goalId === id && n.kind === 'custom')
    .sort((a, b) => a.timestamp - b.timestamp);

  const Icon = getHabitIcon(goal.icon);
  const completed = goal.status === 'completed';
  const parts = getCountdownParts(goal.endAt, now);
  const expired = !completed && parts.expired;

  const confirmDelete = () => {
    Alert.alert(t('goals.goalSettings'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('goals.deleteGoal'),
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleExtend = async (date?: Date) => {
    const next = date ?? extendDate;
    if (next.getTime() <= new Date(goal.endAt).getTime()) return;
    await extendGoal(id, next.toISOString());
    setShowExtend(false);
  };

  const openNewReminder = () => {
    setEditingReminderId(null);
    setRTitle('');
    setRBody('');
    setRDate(new Date(Date.now() + 3600000));
    setShowReminderModal(true);
  };

  const openEditReminder = (r: (typeof customReminders)[number]) => {
    setEditingReminderId(r.id);
    setRTitle(r.title);
    setRBody(r.body);
    setRDate(new Date(r.timestamp));
    setShowReminderModal(true);
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
    setEditingReminderId(null);
  };

  const canSaveReminder =
    rTitle.trim().length > 0 && rDate.getTime() > Date.now();

  const saveReminder = async () => {
    if (!canSaveReminder) return;
    if (editingReminderId) {
      await updateGoalReminder(editingReminderId, {
        title: rTitle.trim(),
        body: rBody.trim(),
        timestamp: rDate.getTime(),
      });
    } else {
      await addGoalReminder(id, {
        title: rTitle.trim(),
        body: rBody.trim(),
        timestamp: rDate.getTime(),
      });
    }
    closeReminderModal();
  };

  const confirmRemoveReminder = (reminderId: string) => {
    Alert.alert(t('goals.removeReminderTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeGoalReminder(reminderId);
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Raised radius={theme.radii.card} distance={10} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Raised radius={18} distance={5} style={styles.iconBadge}>
                <Icon size={26} color={goal.color} />
              </Raised>
              <View style={styles.headerText}>
                <Text
                  style={[styles.name, { color: theme.colors.textPrimary }]}
                >
                  {goal.title}
                </Text>
                {goal.description ? (
                  <Text
                    style={[
                      styles.description,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {goal.description}
                  </Text>
                ) : null}
              </View>
            </View>
            <NeumorphicButton
              radius={16}
              distance={5}
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Text
                style={[styles.closeText, { color: theme.colors.textMuted }]}
              >
                ✕
              </Text>
            </NeumorphicButton>
          </View>

          {/* Countdown */}
          <Inset radius={18} style={styles.countdownWrap}>
            {completed ? (
              <GoalCompletionAnalytics goal={goal} />
            ) : (
              <>
                <View style={styles.countRow}>
                  {[
                    { v: parts.days, l: t('goals.days') },
                    { v: parts.hours, l: t('goals.hours') },
                    { v: parts.minutes, l: t('goals.minutes') },
                    { v: parts.seconds, l: t('goals.seconds') },
                  ].map((u, i) => (
                    <View key={u.l} style={styles.unit}>
                      <Text
                        style={[
                          styles.unitValue,
                          {
                            color: expired
                              ? '#FF3B30'
                              : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {i === 0 ? u.v : Pad(u.v)}
                      </Text>
                      <Text
                        style={[
                          styles.unitLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {u.l}
                      </Text>
                    </View>
                  ))}
                </View>
                {expired && (
                  <Text style={[styles.expiredText, { color: '#FF3B30' }]}>
                    {t('goals.overdueBy', {
                      overdue: formatOverdue(parts.overdueMs),
                    })}
                  </Text>
                )}
              </>
            )}
          </Inset>

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {new Date(goal.startAt).toLocaleString()} →{' '}
              {new Date(goal.endAt).toLocaleString()}
            </Text>
          </View>

          {/* Expired actions */}
          {!completed && expired && (
            <View style={styles.actionCol}>
              <NeumorphicButton
                radius={14}
                distance={5}
                backgroundColor={goal.color}
                style={styles.primaryBtn}
                onPress={async () => {
                  await completeGoal(id);
                }}
              >
                <Text style={styles.primaryText}>
                  {t('goals.completeGoal')}
                </Text>
              </NeumorphicButton>
              <NeumorphicButton
                radius={14}
                distance={5}
                style={styles.secondaryBtn}
                onPress={() => setShowExtend(true)}
              >
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {t('goals.extendTime')}
                </Text>
              </NeumorphicButton>
            </View>
          )}

          {!completed && !expired && (
            <View style={styles.actionCol}>
              <NeumorphicButton
                radius={14}
                distance={5}
                style={styles.secondaryBtn}
                onPress={() => setShowExtend(true)}
              >
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t('goals.extendTime')}
                </Text>
              </NeumorphicButton>
            </View>
          )}

          {showExtend && (
            <View style={styles.extendWrap}>
              <DateTimePicker
                value={extendDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date(new Date(goal.endAt).getTime() + 60000)}
                onChange={(e: any, d?: Date) => {
                  if (e?.type === 'dismissed') {
                    setShowExtend(false);
                    return;
                  }
                  if (d) {
                    if (Platform.OS === 'android') {
                      setShowExtend(false);
                      handleExtend(d);
                    } else {
                      setExtendDate(d);
                    }
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.extendRow}>
                  <NeumorphicButton
                    radius={12}
                    distance={4}
                    style={styles.extendBtn}
                    onPress={() => setShowExtend(false)}
                  >
                    <Text
                      style={[
                        styles.secondaryText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {t('common.cancel')}
                    </Text>
                  </NeumorphicButton>
                  <NeumorphicButton
                    radius={12}
                    distance={4}
                    backgroundColor={goal.color}
                    style={styles.extendBtn}
                    onPress={() => handleExtend()}
                  >
                    <Text style={styles.primaryText}>{t('common.save')}</Text>
                  </NeumorphicButton>
                </View>
              )}
            </View>
          )}

          {!completed && (
            <View style={styles.reminderSection}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                {t('goals.reminders')}
              </Text>

              {autoReminders.length > 0 && (
                <View style={styles.reminderGroup}>
                  <Text
                    style={[
                      styles.subLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('goals.autoReminders')}
                  </Text>
                  {autoReminders.map(r => (
                    <Raised
                      key={r.id}
                      radius={12}
                      distance={4}
                      style={styles.reminderRow}
                    >
                      <View style={styles.reminderTextCol}>
                        <Text
                          style={[
                            styles.reminderTitle,
                            { color: theme.colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {r.title}
                        </Text>
                        <Text
                          style={[
                            styles.reminderTime,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {new Date(r.timestamp).toLocaleString()}
                        </Text>
                      </View>
                    </Raised>
                  ))}
                </View>
              )}

              <View style={styles.reminderGroup}>
                <Text
                  style={[
                    styles.subLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t('goals.customReminders')}
                </Text>
                {customReminders.map(r => (
                  <Pressable key={r.id} onPress={() => openEditReminder(r)}>
                    <Raised
                      radius={12}
                      distance={4}
                      style={styles.reminderRow}
                    >
                      <View style={styles.reminderTextCol}>
                        <Text
                          style={[
                            styles.reminderTitle,
                            { color: theme.colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {r.title}
                        </Text>
                        {r.body ? (
                          <Text
                            style={[
                              styles.reminderBody,
                              { color: theme.colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {r.body}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.reminderTime,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {new Date(r.timestamp).toLocaleString()}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => confirmRemoveReminder(r.id)}
                        hitSlop={8}
                        style={styles.reminderTrash}
                      >
                        <TrashIcon size={18} color="#FF3B30" />
                      </Pressable>
                    </Raised>
                  </Pressable>
                ))}
              </View>

              <NeumorphicButton
                radius={14}
                distance={5}
                style={styles.addReminderBtn}
                onPress={openNewReminder}
              >
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {t('goals.addReminder')}
                </Text>
              </NeumorphicButton>
            </View>
          )}

          {showReminderModal && (
            <Modal
              visible={showReminderModal}
              transparent
              animationType="fade"
              onRequestClose={closeReminderModal}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={closeReminderModal}
              >
                <Pressable onPress={() => {}} style={styles.modalPressArea}>
                  <Raised radius={16} distance={8} style={styles.modalCard}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {t(
                        editingReminderId
                          ? 'goals.editReminder'
                          : 'goals.newReminder',
                      )}
                    </Text>
                    <Inset radius={12} style={styles.formInputWrap}>
                      <TextInput
                        value={rTitle}
                        onChangeText={setRTitle}
                        placeholder={t('goals.reminderTitlePlaceholder')}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[
                          styles.formInput,
                          { color: theme.colors.textPrimary },
                        ]}
                        maxLength={50}
                      />
                    </Inset>
                    <Inset radius={12} style={styles.formInputWrap}>
                      <TextInput
                        value={rBody}
                        onChangeText={setRBody}
                        placeholder={t(
                          'goals.reminderDescriptionPlaceholder',
                        )}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[
                          styles.formInput,
                          { color: theme.colors.textPrimary },
                        ]}
                        maxLength={120}
                      />
                    </Inset>
                    <DateTimePicker
                      value={rDate}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(e: any, d?: Date) => {
                        if (e?.type === 'dismissed') return;
                        if (d) setRDate(d);
                      }}
                    />
                    <View style={styles.formActions}>
                      <View style={styles.formActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          style={styles.formActionBtn}
                          onPress={closeReminderModal}
                        >
                          <Text
                            style={[
                              styles.secondaryText,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {t('common.cancel')}
                          </Text>
                        </NeumorphicButton>
                      </View>
                      <View style={styles.formActionWrap}>
                        <NeumorphicButton
                          radius={12}
                          distance={4}
                          disabled={!canSaveReminder}
                          backgroundColor={
                            canSaveReminder
                              ? goal.color
                              : theme.colors.insetFill
                          }
                          style={styles.formActionBtn}
                          onPress={saveReminder}
                        >
                          <Text
                            style={[
                              styles.primaryText,
                              !canSaveReminder && {
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

          <View style={styles.actionRow}>
            <View style={styles.saveWrap}>
              <NeumorphicButton
                radius={14}
                distance={5}
                style={styles.saveBtn}
                onPress={() =>
                  navigation.navigate('AddEditGoal', { id: goal.id })
                }
              >
                <Text
                  style={[
                    styles.secondaryText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {t('common.save')}
                </Text>
              </NeumorphicButton>
            </View>
            <NeumorphicButton
              radius={14}
              distance={5}
              style={styles.deleteIconBtn}
              onPress={confirmDelete}
            >
              <TrashIcon size={20} color="#FF3B30" />
            </NeumorphicButton>
          </View>
        </Raised>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  name: { fontSize: 26, fontWeight: '800' },
  description: { fontSize: 14, marginTop: 2, fontWeight: '500' },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeText: { fontSize: 14, fontWeight: '700' },
  countdownWrap: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  countRow: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  unit: { alignItems: 'center', minWidth: 56 },
  unitValue: { fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] },
  unitLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  expiredText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  completedMark: { fontSize: 44, fontWeight: '900' },
  countdownLabel: { marginTop: 8, fontSize: 15, fontWeight: '700' },
  meta: { marginTop: 16, alignItems: 'center' },
  metaText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  actionCol: { gap: 10, marginTop: 18 },
  primaryBtn: { paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontWeight: '800', fontSize: 14 },
  extendWrap: { marginTop: 12 },
  extendRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  extendBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    alignItems: 'center',
  },
  saveWrap: {
    flex: 1,
  },
  saveBtn: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    width: 52,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderSection: { marginTop: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  reminderGroup: { marginBottom: 10 },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  reminderTextCol: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '700' },
  reminderBody: { fontSize: 13, fontWeight: '500', marginTop: 1 },
  reminderTime: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  reminderTrash: { padding: 6, marginLeft: 8 },
  addReminderBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 2,
  },
  formInputWrap: { paddingHorizontal: 4, marginBottom: 8 },
  formInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  formActionWrap: { flex: 1 },
  formActionBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', padding: 20 },
  modalPressArea: { width: '100%' },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
});
