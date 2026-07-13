import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { neumorphic } from '../theme/neumorphicTheme';

const NOTIF_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA'];

export default function NotificationSettingsScreen({ navigation }: any) {
  const habits = useHabitStore(s => s.habits);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const removeHabitNotification = useHabitStore(s => s.removeHabitNotification);
  const setHabitNotification = useHabitStore(s => s.setHabitNotification);
  const adminNotifications = useHabitStore(s => s.adminNotifications);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Settings</Text>
        </Pressable>

        <Text style={styles.title}>Notifications</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PER-HABIT REMINDERS</Text>
          <View style={styles.sectionBody}>
            {habits.length === 0 && (
              <Text style={styles.emptyText}>No habits yet. Create one first.</Text>
            )}
            {habits.map((h, i) => {
              const notif = habitNotifications[h.id];
              const enabled = notif?.enabled ?? false;
              const label = enabled
                ? `${String(notif!.hour).padStart(2, '0')}:${String(notif!.minute).padStart(2, '0')}`
                : 'Off';

              return (
                <Pressable
                  key={h.id}
                  style={[styles.habitRow, i > 0 && styles.habitRowBorder]}
                  onPress={() => navigation.navigate('HabitNotificationConfig', { habitId: h.id })}
                >
                  <View style={styles.habitLeft}>
                    <View style={[styles.colorDot, { backgroundColor: h.color || NOTIF_COLORS[i % NOTIF_COLORS.length] }]} />
                    <View>
                      <Text style={styles.habitName}>{h.name}</Text>
                      <Text style={styles.notifStatus}>{label}</Text>
                    </View>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={val => {
                      if (val) {
                        navigation.navigate('HabitNotificationConfig', { habitId: h.id });
                      } else {
                        removeHabitNotification(h.id);
                      }
                    }}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY REMINDERS (ADMIN)</Text>
          <View style={styles.sectionBody}>
            {adminNotifications.map((n, i) => {
              const label = n.enabled
                ? `${String(n.hour).padStart(2, '0')}:${String(n.minute).padStart(2, '0')}`
                : 'Off';

              return (
                <View
                  key={n.id}
                  style={[styles.habitRow, i > 0 && styles.habitRowBorder]}
                >
                  <View style={styles.habitLeft}>
                    <View style={[styles.colorDot, { backgroundColor: '#8E8E93' }]} />
                    <View>
                      <Text style={styles.habitName}>{n.title}</Text>
                      <Text style={styles.notifStatus}>{label}</Text>
                    </View>
                  </View>
                  <Switch
                    value={n.enabled}
                    onValueChange={val => {
                      const store = useHabitStore.getState();
                      store.updateAdminNotification(n.id, { enabled: val });
                    }}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                  />
                </View>
              );
            })}
          </View>
          <Pressable
            style={styles.adminButton}
            onPress={() => navigation.navigate('AdminNotification')}
          >
            <Text style={styles.adminButtonText}>Edit Admin Notifications</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: neumorphic.colors.background },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: { fontSize: 22, color: '#007AFF', marginRight: 4 },
  backText: { fontSize: 17, color: '#007AFF' },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
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
    borderTopColor: '#E5E5EA',
  },
  habitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  habitName: { fontSize: 16, color: '#1C1C1E' },
  notifStatus: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  adminButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 14,
    alignItems: 'center',
  },
  adminButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
});
