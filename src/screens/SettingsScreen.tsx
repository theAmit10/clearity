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
import { exportHabits, pickAndParseImportFile } from '../services/importExport';
import { clearAll } from '../services/storage';
import {
  APP_NAME,
  APP_VERSION,
  DEVICE_INFO,
  X_HANDLE,
  FEEDBACK_EMAIL,
  IOS_APP_STORE_ID,
  ANDROID_PACKAGE_NAME,
  FREE_HABIT_LIMIT,
  FREE_THEMES,
} from '../constants/appInfo';
import { useTheme } from '../theme/ThemeProvider';
import {
  restorePurchases,
} from '../services/revenueCat';
import RevenueCatUI from 'react-native-purchases-ui';
import { logEvent } from '../services/logger';

export default function SettingsScreen({ navigation }: any) {
  const { theme, themeName, setTheme, availableThemes } = useTheme();
  const habits = useHabitStore(s => s.habits);
  const replaceAllHabits = useHabitStore(s => s.replaceAllHabits);
  const mergeHabits = useHabitStore(s => s.mergeHabits);
  const isPro = useHabitStore(s => s.isPro);
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

  const refreshProStatus = useHabitStore(s => s.refreshProStatus);

  const handleRestore = async () => {
    setBusy(true);
    try {
      const info = await restorePurchases();
      await refreshProStatus();
      Alert.alert(
        'Restore Complete',
        info ? 'Your Pro subscription has been restored.' : 'No purchases found to restore.',
      );
    } catch {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCustomerCenter = async () => {
    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshProStatus();
    } catch (err) {
      logEvent('error', 'Customer Center failed', err);
    }
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
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.colors.iosSecondaryLabel },
          ]}
        >
          {title}
        </Text>
        <View
          style={[
            styles.sectionBody,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {children}
        </View>
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.iosBg }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>
          Settings
        </Text>

        <Section title="Habits">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            Reorder your habits by long-pressing them on the home screen, or use
            the dedicated reorder screen below.
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

        <Section title="Habitic Pro">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {isPro
              ? 'You have Habitic Pro. Thank you for supporting the app!'
              : `Upgrade to unlock analytics, widget, unlimited habits (${FREE_HABIT_LIMIT}+), custom categories, and premium themes.`}
          </Text>
          {isPro ? (
            <Row
              label="Manage subscription"
              onPress={handleCustomerCenter}
              disabled={busy}
            />
          ) : (
            <Row
              label="Upgrade to Pro"
              onPress={() => navigation.navigate('Paywall')}
              disabled={busy}
            />
          )}
          <Row
            label="Restore purchases"
            onPress={handleRestore}
            disabled={busy}
          />
        </Section>

        <Section title="General">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            Customize the home screen layout and default behavior.
          </Text>
          <Row
            label="General settings"
            onPress={() => navigation.navigate('General')}
          />
        </Section>

        <Section title="Widget (Pro)">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            Select habits to display on your iOS home screen widget with a
            weekly heatmap.
          </Text>
          <Row
            label={isPro ? 'Widget settings' : 'Widget settings — Pro'}
            onPress={() => {
              if (isPro) {
                navigation.navigate('WidgetSettings');
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
        </Section>

        <Section title="Analytics (Pro)">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            View detailed stats, charts, and insights about your habit
            performance.
          </Text>
          <Row
            label={isPro ? 'View analytics' : 'View analytics — Pro'}
            onPress={() => {
              if (isPro) {
                navigation.navigate('Analytics');
              } else {
                navigation.navigate('Paywall');
              }
            }}
          />
        </Section>

        <Section title="Notifications & Reminders">
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
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
            const isPremium = !FREE_THEMES.includes(t.name);
            const locked = isPremium && !isPro;
            return (
              <Row
                key={t.name}
                label={`${active ? '✓ ' : locked ? '🔒 ' : '   '}${t.label}${locked ? ' — Pro' : ''}`}
                onPress={() => {
                  if (locked) {
                    navigation.navigate('Paywall');
                  } else {
                    setTheme(t.name);
                  }
                }}
              />
            );
          })}
        </Section>

        <Section title="Community & Feedback">
          <Row label="Let's build together" onPress={handleRateApp} />
          <Row label="Send feedback" onPress={handleSendFeedback} />
          <Row label={`Follow @${X_HANDLE} on X`} onPress={handleFollowX} />
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
