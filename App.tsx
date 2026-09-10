import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
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
import { initAnalytics, trackEvent } from './src/services/analytics';
import { initRevenueCat } from './src/services/revenueCat';
import { initI18n, useI18nStore } from './src/i18n';
import { usePaywallVariantStore } from './src/store/paywallVariantStore';
import {
  loadOnboardingSeen,
  saveOnboardingSeen,
} from './src/services/storage';
import type { OnboardingResult } from './src/screens/OnboardingScreen';
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
  const [onboardingState, setOnboardingState] = useState<
    'checking' | 'show' | 'done'
  >('checking');
  const { theme } = useTheme();

  useEffect(() => {
    installGlobalErrorHandler();
    initAnalytics();
    initRevenueCat();
    initI18n();
    usePaywallVariantStore.getState().loadVariant();
    init();
    initGoals();
    loadOnboardingSeen()
      .then(seen => {
        setOnboardingState(seen === true ? 'done' : 'show');
      })
      .catch(() => {
        setOnboardingState('show');
      });
  }, []);

  useEffect(() => {
    if (onboardingState === 'show') {
      trackEvent('onboarding_started');
    }
  }, [onboardingState]);

  const handleOnboardingFinish = useCallback(
    async (result: OnboardingResult, atIndex: number) => {
      try {
        await saveOnboardingSeen(true);
      } catch {
        // non-critical — still let the user into the app
      }
      if (result === 'completed') {
        trackEvent('onboarding_completed');
      } else {
        trackEvent('onboarding_skipped', { at_screen: atIndex + 1 });
      }
      setOnboardingState('done');
    },
    [],
  );

  useEffect(() => {
    if (!loaded) return;
    crashlytics().setCrashlyticsCollectionEnabled(crashlyticsEnabled);
  }, [crashlyticsEnabled, loaded]);

  useEffect(() => {
    if (!loaded || !goalsLoaded) return;
    (async () => {
      try {
        await setupChannel();
        const habitConfigs = habitNotifications;
        await rescheduleAll(habitConfigs, adminNotifications);
        await useGoalStore.getState().rescheduleActive();
      } catch (err) {
        // notification setup is non-critical
      }
    })();
  }, [loaded, goalsLoaded]);

  if (!loaded || !goalsLoaded || !i18nLoaded || onboardingState === 'checking') {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.textMuted} />
      </View>
    );
  }

  return (
    <RootNavigator
      showOnboarding={onboardingState === 'show'}
      onOnboardingFinish={handleOnboardingFinish}
    />
  );
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
