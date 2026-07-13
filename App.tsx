import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useHabitStore } from './src/store/habitStore';
import { installGlobalErrorHandler } from './src/services/logger';
import { setupChannel, requestPermission, rescheduleAll } from './src/services/notification';

export default function App() {
  const init = useHabitStore(s => s.init);
  const loaded = useHabitStore(s => s.loaded);
  const habitNotifications = useHabitStore(s => s.habitNotifications);
  const adminNotifications = useHabitStore(s => s.adminNotifications);

  useEffect(() => {
    installGlobalErrorHandler();
    init();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await setupChannel();
        await requestPermission();
        const habitConfigs = Object.values(habitNotifications);
        await rescheduleAll(habitConfigs, adminNotifications);
      } catch (err) {
        // notification setup is non-critical
      }
    })();
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootNavigator />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F7' },
});
