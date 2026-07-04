import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { exportHabits, exportLogs, pickAndParseImportFile } from '../services/importExport';
import { getAllLogs, clearLogs } from '../services/logger';
import { clearAll } from '../services/storage';

export default function SettingsScreen() {
  const habits = useHabitStore(s => s.habits);
  const replaceAllHabits = useHabitStore(s => s.replaceAllHabits);
  const mergeHabits = useHabitStore(s => s.mergeHabits);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportHabits(habits);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const payload = await pickAndParseImportFile();
      Alert.alert(
        'Import data',
        `Found ${payload.habits.length} habit(s) in the file. How do you want to import?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge with current', onPress: () => mergeHabits(payload.habits) },
          {
            text: 'Replace everything',
            style: 'destructive',
            onPress: () => replaceAllHabits(payload.habits),
          },
        ],
      );
    } catch (e: any) {
      if (e?.message !== undefined && e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Import failed', e?.message ?? 'Could not read that file.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleExportLogs = async () => {
    const logs = await getAllLogs();
    if (logs.length === 0) {
      Alert.alert('No logs yet', 'Nothing has been logged on this device.');
      return;
    }
    try {
      await exportLogs(logs);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    }
  };

  const handleClearLogs = () => {
    Alert.alert('Clear logs?', 'This removes all locally stored diagnostic logs.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearLogs },
    ]);
  };

  const handleResetApp = () => {
    Alert.alert('Reset app?', 'This deletes ALL habits and history. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          replaceAllHabits([]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>Settings</Text>

        <Section title="Backup & Transfer">
          <Text style={styles.description}>
            Everything is stored only on this device. Export a backup file and share it (AirDrop,
            email, files app, etc.) to move your data to another device.
          </Text>
          <Row label={`Export data (${habits.length} habits)`} onPress={handleExport} disabled={busy} />
          <Row label="Import data from file" onPress={handleImport} disabled={busy} />
        </Section>

        <Section title="Diagnostics (stored locally only)">
          <Text style={styles.description}>
            The app never sends anything over the network. Errors and events are logged on-device
            so you can export and inspect them yourself.
          </Text>
          <Row label="Export diagnostic logs" onPress={handleExportLogs} />
          <Row label="Clear diagnostic logs" onPress={handleClearLogs} destructive />
        </Section>

        <Section title="Danger Zone">
          <Row label="Reset app (delete everything)" onPress={handleResetApp} destructive />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.row}>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive, disabled && styles.rowLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  title: { fontSize: 32, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 8, textTransform: 'uppercase' },
  sectionBody: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden' },
  description: { fontSize: 13, color: '#8E8E93', marginBottom: 10, lineHeight: 18 },
  row: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  rowLabel: { fontSize: 16, color: '#007AFF' },
  rowLabelDestructive: { color: '#FF3B30' },
  rowLabelDisabled: { opacity: 0.4 },
});
