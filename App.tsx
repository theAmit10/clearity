import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useHabitStore } from './src/store/habitStore';
import { installGlobalErrorHandler } from './src/services/logger';
import {
  setupChannel,
  requestPermission,
  rescheduleAll,
} from './src/services/notification';
import { initAnalytics } from './src/services/analytics';
import { initRevenueCat } from './src/services/revenueCat';
import crashlytics from '@react-native-firebase/crashlytics';

function AppContent() {
  const init = useHabitStore(s => s.init);
  const loaded = useHabitStore(s => s.loaded);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const adminNotifications = useHabitStore(s => s.adminNotifications);
  const { theme } = useTheme();

  useEffect(() => {
    crashlytics().setCrashlyticsCollectionEnabled(true);
    installGlobalErrorHandler();
    initAnalytics();
    initRevenueCat();
    init();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await setupChannel();
        await requestPermission();
        const habitConfigs = habitNotifications;
        await rescheduleAll(habitConfigs, adminNotifications);
      } catch (err) {
        // notification setup is non-critical
      }
    })();
  }, [loaded]);

  if (!loaded) {
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
