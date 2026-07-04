import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useHabitStore } from './src/store/habitStore';
import { installGlobalErrorHandler } from './src/services/logger';

export default function App() {
  const init = useHabitStore(s => s.init);
  const loaded = useHabitStore(s => s.loaded);

  useEffect(() => {
    installGlobalErrorHandler();
    init();
  }, []);

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
