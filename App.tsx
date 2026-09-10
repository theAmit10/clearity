import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';

LogBox.ignoreLogs([/InteractionManager has been deprecated/]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useHabitStore } from './src/store/habitStore';
import { useGoalStore } from './src/store/goalStore';
import { installGlobalErrorHandler } from './src/services/logger';
import {
  setupChannel,
  rescheduleAll,
} from './src/services/notification';
import { initAnalytics } from './src/services/analytics';
import { initRevenueCat } from './src/services/revenueCat';
import { initI18n, useI18nStore } from './src/i18n';
import crashlytics from '@react-native-firebase/crashlytics';

function AppContent() {
  const init = useHabitStore(s => s.init);
  const initGoals = useGoalStore(s => s.init);
  const loaded = useHabitStore(s => s.loaded);
  const goalsLoaded = useGoalStore(s => s.loaded);
  const i18nLoaded = useI18nStore(s => s.loaded);
  const crashlyticsEnabled = useHabitStore(s => s.crashlyticsEnabled);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const adminNotifications = useHabitStore(s => s.adminNotifications);
  const { theme } = useTheme();

  useEffect(() => {
    installGlobalErrorHandler();
    initAnalytics();
    initRevenueCat();
    initI18n();
    init();
    initGoals();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    crashlytics().setCrashlyticsCollectionEnabled(crashlyticsEnabled);
  }, [crashlyticsEnabled, loaded]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await setupChannel();
        const habitConfigs = habitNotifications;
        await rescheduleAll(habitConfigs, adminNotifications);
      } catch (err) {
        // notification setup is non-critical
      }
    })();
  }, [loaded]);

  if (!loaded || !goalsLoaded || !i18nLoaded) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppContent />
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
