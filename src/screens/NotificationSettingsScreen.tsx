import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated from 'react-native-reanimated';
import {
  SETTINGS_SHARED_TAGS,
  settingsCardTransition,
} from '../components/SettingsRevealItem';
import { useHabitStore } from '../store/habitStore';
import { getHabitIcon } from '../constants/habitIcons';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

const NOTIF_COLORS = [
  '#007AFF',
  '#34C759',
  '#FF9500',
  '#FF3B30',
  '#AF52DE',
  '#5AC8FA',
];
const REVEAL_TAPS = 15;

export default function NotificationSettingsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const habits = useHabitStore(s => s.habits);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const adminNotifications = useHabitStore(s => s.adminNotifications);

  const [adminRevealed, setAdminRevealed] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (adminRevealed) {
      Animated.spring(opacityAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 40,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRevealed]);

  const handleSecretTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= REVEAL_TAPS && !adminRevealed) {
      setAdminRevealed(true);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: theme.colors.iosBlue }]}>
            ←
          </Text>
          <Text style={[styles.backText, { color: theme.colors.iosBlue }]}>
            {t('common.settings')}
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>
          {t('common.notifications')}
        </Text>

        <View style={styles.section}>
          <Pressable onPress={handleSecretTap}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.iosSecondaryLabel },
              ]}
            >
              {t('notificationSettings.perHabitReminders')}
            </Text>
          </Pressable>
          <Reanimated.View
            sharedTransitionTag={SETTINGS_SHARED_TAGS.notifications}
            sharedTransitionStyle={settingsCardTransition}
            style={[
              styles.sectionBody,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {habits.length === 0 && (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.iosSecondaryLabel },
                ]}
              >
                {t('notificationSettings.noHabitsYet')}
              </Text>
            )}
            {habits.map((h, i) => {
              const notifs = habitNotifications.filter(n => n.habitId === h.id);
              const enabledCount = notifs.filter(n => n.enabled).length;
              const label = notifs.length === 0
                ? t('notificationSettings.noReminders')
                : t('notificationSettings.activeCount', { enabled: enabledCount, total: notifs.length });
              const IconComp = getHabitIcon(h.icon);

              return (
                <Pressable
                  key={h.id}
                  style={[
                    styles.habitRow,
                    i > 0 && [
                      styles.habitRowBorder,
                      { borderTopColor: theme.colors.iosSeparator },
                    ],
                  ]}
                  onPress={() =>
                    navigation.navigate('HabitNotificationConfig', {
                      habitId: h.id,
                    })
                  }
                >
                  <View style={styles.habitLeft}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor:
                            h.color || NOTIF_COLORS[i % NOTIF_COLORS.length],
                        },
                      ]}
                    >
                      <IconComp size={12} color={theme.colors.shadowLight} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.habitName,
                          { color: theme.colors.iosLabel },
                        ]}
                      >
                        {h.name}
                      </Text>
                      <Text
                        style={[
                          styles.notifStatus,
                          { color: theme.colors.iosSecondaryLabel },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.chevron, { color: theme.colors.iosGray }]}>›</Text>
                </Pressable>
              );
            })}
          </Reanimated.View>
        </View>

        {adminRevealed && (
          <Animated.View style={{ opacity: opacityAnim }}>
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.iosSecondaryLabel },
                ]}
              >
                {t('notificationSettings.dailyRemindersAdmin')}
              </Text>
              <View
                style={[
                  styles.sectionBody,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                {adminNotifications.map((n, i) => {
                  const label = n.enabled
                    ? `${String(n.hour).padStart(2, '0')}:${String(
                        n.minute,
                      ).padStart(2, '0')}`
                    : t('common.off');

                  return (
                    <View
                      key={n.id}
                      style={[
                        styles.habitRow,
                        i > 0 && [
                          styles.habitRowBorder,
                          { borderTopColor: theme.colors.iosSeparator },
                        ],
                      ]}
                    >
                      <View style={styles.habitLeft}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: theme.colors.iosSecondaryLabel },
                          ]}
                        />
                        <View>
                          <Text
                            style={[
                              styles.habitName,
                              { color: theme.colors.iosLabel },
                            ]}
                          >
                            {n.title}
                          </Text>
                          <Text
                            style={[
                              styles.notifStatus,
                              { color: theme.colors.iosSecondaryLabel },
                            ]}
                          >
                            {label}
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={n.enabled}
                        onValueChange={val => {
                          const store = useHabitStore.getState();
                          store.updateAdminNotification(n.id, { enabled: val });
                        }}
                        trackColor={{
                          false: theme.colors.iosSeparator,
                          true: theme.colors.iosGreen,
                        }}
                      />
                    </View>
                  );
                })}
              </View>
              <Pressable
                style={[
                  styles.adminButton,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => navigation.navigate('AdminNotification')}
              >
                <Text
                  style={[
                    styles.adminButtonText,
                    { color: theme.colors.iosBlue },
                  ]}
                >
                  {t('notificationSettings.editAdminNotifications')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
        {/* {!adminRevealed && tapCount > 0 && (
          <Text style={[styles.secretHint, { color: theme.colors.iosGray }]}>
            {REVEAL_TAPS - tapCount} more tap{REVEAL_TAPS - tapCount !== 1 ? 's' : ''}
          </Text>
        )} */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: {
    fontSize: 22,
    marginRight: 4,
    ...Platform.select({
      android: {
        lineHeight: 22,
        textAlignVertical: 'center',
        includeFontPadding: false,
      },
    }),
  },
  backText: { fontSize: 17 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
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
  emptyText: {
    fontSize: 14,
    padding: 16,
    textAlign: 'center',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  habitRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  habitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitName: { fontSize: 16 },
  notifStatus: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300', paddingLeft: 12 },
  adminButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  adminButtonText: { fontSize: 16, fontWeight: '600' },
  secretHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 12,
  },
});
