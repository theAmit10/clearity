import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestReview } from 'react-native-store-review';
import { useHabitStore } from '../store/habitStore';
import {
  exportHabits,
  pickAndParseImportFile,
} from '../services/importExport';
import { clearAll } from '../services/storage';
import {
  APP_NAME,
  APP_VERSION,
  DEVICE_INFO,
  X_HANDLE,
  FEEDBACK_EMAIL,
  IOS_APP_STORE_ID,
  ANDROID_PACKAGE_NAME,
} from '../constants/appInfo';
import { useTheme } from '../theme/ThemeProvider';

export default function SettingsScreen({ navigation }: any) {
  const { theme, themeName, setTheme, availableThemes } = useTheme();
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
          {
            text: 'Merge with current',
            onPress: () => mergeHabits(payload.habits),
          },
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

  const handleFollowX = () => {
    Linking.openURL(`https://x.com/${X_HANDLE}`).catch(() => {
      Alert.alert('Could not open X', `Find us at @${X_HANDLE} on X.`);
    });
  };

  const handleSendFeedback = () => {
    const subject = encodeURIComponent('App Feedback');
    const footer = [
      '',
      '',
      '',
      '---',
      `App: ${APP_NAME} v${APP_VERSION}`,
      `Platform: ${DEVICE_INFO}`,
    ].join('\n');
    const body = encodeURIComponent(footer);
    Linking.openURL(
      `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`,
    ).catch(() => {
      Alert.alert(
        'Could not open Mail',
        `No mail app is set up on this device. You can reach us directly at ${FEEDBACK_EMAIL}.`,
      );
    });
  };

  const handleRateApp = () => {
    try {
      requestReview();
    } catch {
      const url = Platform.select({
        ios: `itms-apps://itunes.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`,
        android: `market://details?id=${ANDROID_PACKAGE_NAME}`,
      });
      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            'Could not open the store',
            'Please search for the app manually to leave a review.',
          );
        });
      }
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset app?',
      'This deletes ALL habits and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            replaceAllHabits([]);
            try {
              await clearAll();
            } catch (e: any) {
              Alert.alert(
                'Partial reset',
                `Your habits were cleared, but local storage couldn't be fully wiped: ${
                  e?.message ?? 'unknown error'
                }`,
              );
            }
          },
        },
      ],
    );
  };

  function Section({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.iosSecondaryLabel }]}>{title}</Text>
        <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>{children}</View>
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
      <TouchableHighlight
        onPress={onPress}
        disabled={disabled}
        underlayColor={theme.colors.iosSeparator}
        activeOpacity={1}
        style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}
      >
        <Text
          style={[
            styles.rowLabel,
            { color: theme.colors.iosBlue },
            destructive && { color: theme.colors.iosRed },
            disabled && styles.rowLabelDisabled,
          ]}
        >
          {label}
        </Text>
      </TouchableHighlight>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>Settings</Text>

        <Section title="Habits">
          <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
            Reorder your habits by long-pressing them on the home screen, or
            use the dedicated reorder screen below.
          </Text>
          <Row
            label="Reorder habits"
            onPress={() => navigation.navigate('ReorderHabits')}
          />
          <Row
            label={`Export data (${habits.length} habits)`}
            onPress={handleExport}
            disabled={busy}
          />
          <Row
            label="Import data from file"
            onPress={handleImport}
            disabled={busy}
          />
        </Section>

        <Section title="Widget">
          <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
            Select habits to display on your iOS home screen widget with a
            weekly heatmap.
          </Text>
          <Row
            label="Widget settings"
            onPress={() => navigation.navigate('WidgetSettings')}
          />
        </Section>

        <Section title="Analytics">
          <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
            View detailed stats, charts, and insights about your habit performance.
          </Text>
          <Row
            label="View analytics"
            onPress={() => navigation.navigate('Analytics')}
          />
        </Section>

        <Section title="General">
          <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
            Customize the home screen layout and default behavior.
          </Text>
          <Row
            label="General settings"
            onPress={() => navigation.navigate('General')}
          />
        </Section>

        <Section title="Notifications & Reminders">
          <Text style={[styles.description, { color: theme.colors.iosSecondaryLabel }]}>
            Set daily reminders for each habit and configure admin-level
            scheduled notifications.
          </Text>
          <Row
            label="Notification settings"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </Section>

        <Section title="Theme">
          {availableThemes.map(t => {
            const active = themeName === t.name;
            return (
              <Row
                key={t.name}
                label={`${active ? '✓ ' : '   '}${t.label}`}
                onPress={() => setTheme(t.name)}
              />
            );
          })}
        </Section>

        <Section title="Community & Feedback">
          <Row label={`Follow @${X_HANDLE} on X`} onPress={handleFollowX} />
          <Row label="Send feedback" onPress={handleSendFeedback} />
          <Row label="Rate this app" onPress={handleRateApp} />
        </Section>

        {/* <Section title="Diagnostics (stored locally only)">
          <Text style={styles.description}>
            The app never sends anything over the network. Errors and events are
            logged on-device so you can export and inspect them yourself.
          </Text>
          <Row label="Export diagnostic logs" onPress={handleExportLogs} />
          <Row
            label="Clear diagnostic logs"
            onPress={handleClearLogs}
            destructive
          />
        </Section> */}

        <Section title="Danger Zone">
          <Row
            label="Reset app (delete everything)"
            onPress={handleResetApp}
            destructive
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  description: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
    paddingLeft: 5,
    paddingTop: 5,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 16 },
  rowLabelDisabled: { opacity: 0.4 },
});

// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   Pressable,
//   StyleSheet,
//   Alert,
//   ScrollView,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useHabitStore } from '../store/habitStore';
// import {
//   exportHabits,
//   exportLogs,
//   pickAndParseImportFile,
// } from '../services/importExport';
// import { getAllLogs, clearLogs } from '../services/logger';
// import { clearAll } from '../services/storage';

// export default function SettingsScreen() {
//   const habits = useHabitStore(s => s.habits);
//   const replaceAllHabits = useHabitStore(s => s.replaceAllHabits);
//   const mergeHabits = useHabitStore(s => s.mergeHabits);
//   const [busy, setBusy] = useState(false);

//   const handleExport = async () => {
//     setBusy(true);
//     try {
//       await exportHabits(habits);
//     } catch (e: any) {
//       Alert.alert('Export failed', e?.message ?? 'Unknown error');
//     } finally {
//       setBusy(false);
//     }
//   };

//   const handleImport = async () => {
//     setBusy(true);
//     try {
//       const payload = await pickAndParseImportFile();
//       Alert.alert(
//         'Import data',
//         `Found ${payload.habits.length} habit(s) in the file. How do you want to import?`,
//         [
//           { text: 'Cancel', style: 'cancel' },
//           {
//             text: 'Merge with current',
//             onPress: () => mergeHabits(payload.habits),
//           },
//           {
//             text: 'Replace everything',
//             style: 'destructive',
//             onPress: () => replaceAllHabits(payload.habits),
//           },
//         ],
//       );
//     } catch (e: any) {
//       if (e?.message !== undefined && e?.code !== 'DOCUMENT_PICKER_CANCELED') {
//         Alert.alert('Import failed', e?.message ?? 'Could not read that file.');
//       }
//     } finally {
//       setBusy(false);
//     }
//   };

//   const handleExportLogs = async () => {
//     const logs = await getAllLogs();
//     if (logs.length === 0) {
//       Alert.alert('No logs yet', 'Nothing has been logged on this device.');
//       return;
//     }
//     try {
//       await exportLogs(logs);
//     } catch (e: any) {
//       Alert.alert('Export failed', e?.message ?? 'Unknown error');
//     }
//   };

//   const handleClearLogs = () => {
//     Alert.alert(
//       'Clear logs?',
//       'This removes all locally stored diagnostic logs.',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { text: 'Clear', style: 'destructive', onPress: clearLogs },
//       ],
//     );
//   };

//   const handleResetApp = () => {
//     Alert.alert(
//       'Reset app?',
//       'This deletes ALL habits and history. This cannot be undone.',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Reset',
//           style: 'destructive',
//           onPress: async () => {
//             await clearAll();
//             replaceAllHabits([]);
//           },
//         },
//       ],
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={{ padding: 20 }}>
//         <Text style={styles.title}>Settings</Text>

//         <Section title="Backup & Transfer">
//           <Text style={styles.description}>
//             Everything is stored only on this device. Export a backup file and
//             share it (AirDrop, email, files app, etc.) to move your data to
//             another device.
//           </Text>
//           <Row
//             label={`Export data (${habits.length} habits)`}
//             onPress={handleExport}
//             disabled={busy}
//           />
//           <Row
//             label="Import data from file"
//             onPress={handleImport}
//             disabled={busy}
//           />
//         </Section>

//         <Section title="Diagnostics (stored locally only)">
//           <Text style={styles.description}>
//             The app never sends anything over the network. Errors and events are
//             logged on-device so you can export and inspect them yourself.
//           </Text>
//           <Row label="Export diagnostic logs" onPress={handleExportLogs} />
//           <Row
//             label="Clear diagnostic logs"
//             onPress={handleClearLogs}
//             destructive
//           />
//         </Section>

//         <Section title="Danger Zone">
//           <Row
//             label="Reset app (delete everything)"
//             onPress={handleResetApp}
//             destructive
//           />
//         </Section>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// function Section({
//   title,
//   children,
// }: {
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <View style={styles.section}>
//       <Text style={styles.sectionTitle}>{title}</Text>
//       <View style={styles.sectionBody}>{children}</View>
//     </View>
//   );
// }

// function Row({
//   label,
//   onPress,
//   disabled,
//   destructive,
// }: {
//   label: string;
//   onPress: () => void;
//   disabled?: boolean;
//   destructive?: boolean;
// }) {
//   return (
//     <Pressable onPress={onPress} disabled={disabled} style={styles.row}>
//       <Text
//         style={[
//           styles.rowLabel,
//           destructive && styles.rowLabelDestructive,
//           disabled && styles.rowLabelDisabled,
//         ]}
//       >
//         {label}
//       </Text>
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F2F2F7' },
//   title: {
//     fontSize: 32,
//     fontWeight: '700',
//     color: '#1C1C1E',
//     marginBottom: 20,
//   },
//   section: { marginBottom: 24 },
//   sectionTitle: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#8E8E93',
//     marginBottom: 8,
//     textTransform: 'uppercase',
//   },
//   sectionBody: {
//     backgroundColor: '#FFF',
//     borderRadius: 14,
//     overflow: 'hidden',
//   },
//   description: {
//     fontSize: 13,
//     color: '#8E8E93',
//     marginBottom: 10,
//     lineHeight: 18,
//     paddingLeft: 5,
//     paddingTop: 5,
//   },
//   row: {
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#E5E5EA',
//   },
//   rowLabel: { fontSize: 16, color: '#007AFF' },
//   rowLabelDestructive: { color: '#FF3B30' },
//   rowLabelDisabled: { opacity: 0.4 },
// });
