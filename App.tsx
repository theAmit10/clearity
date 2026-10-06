import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox, AppState } from 'react-native';

LogBox.ignoreLogs([/InteractionManager has been deprecated/]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useHabitStore } from './src/store/habitStore';
import { useGoalStore } from './src/store/goalStore';
import { installGlobalErrorHandler } from './src/services/logger';
import {
  setupChannel,
  rescheduleAll,
  onNotificationEvent,
} from './src/services/notification';
import {
  syncOfferReminder,
  cancelOfferReminder,
  isOfferPushNotification,
  markOfferPushTap,
  wasOpenedFromOfferPush,
} from './src/services/offerReminder';
import { openPushPaywall } from './src/navigation/RootNavigator';
import { EventType } from '@notifee/react-native';
import {
  initAnalytics,
  trackEvent,
  setAnalyticsDefaults,
  updatePaywallVariantProp,
  updateProProp,
} from './src/services/analytics';
import { initRevenueCat } from './src/services/revenueCat';
import { initI18n, useI18nStore } from './src/i18n';
import { usePaywallVariantStore } from './src/store/paywallVariantStore';
import {
  loadOnboardingSeen,
  saveOnboardingSeen,
} from './src/services/storage';
import type { OnboardingResult } from './src/screens/OnboardingScreen';
import type { IntroFilmResult } from './src/components/intro/IntroFilm';
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
    'checking' | 'film' | 'show' | 'done'
  >('checking');
  // True once the film's tail starts: the onboarding atoms bloom over the
  // fading video, but the film stays mounted until `onEnd` stops audio.
  const [filmHandoff, setFilmHandoff] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    installGlobalErrorHandler();
    initAnalytics();
    initRevenueCat();
    initI18n();
    usePaywallVariantStore.getState().loadVariant();
    // Baseline super props for every event; the subscriptions below keep
    // the mutable ones (variant, pro status) correct for the whole session.
    setAnalyticsDefaults({
      paywallVariant: usePaywallVariantStore.getState().variant,
      isPro: useHabitStore.getState().isPro,
    });
    const unsubVariant = usePaywallVariantStore.subscribe((s, p) => {
      if (s.variant !== p?.variant) updatePaywallVariantProp(s.variant);
    });
    const unsubPro = useHabitStore.subscribe((s, p) => {
      if (s.isPro !== p?.isPro) {
        updateProProp(s.isPro);
        // Offer reminder is free-users-only: cancel on Pro, re-sync on free.
        if (s.isPro) cancelOfferReminder();
        else syncOfferReminder();
      }
    });
    // Foreground tap on the daily offer reminder → paywall (source offer_push).
    const unsubOfferPush = onNotificationEvent((event: any) => {
      try {
        const tapped =
          event?.type === EventType.PRESS ||
          event?.type === EventType.ACTION_PRESS;
        if (tapped && isOfferPushNotification(event?.detail?.notification?.id)) {
          openPushPaywall();
        }
      } catch {
        // tap routing is non-critical
      }
    });
    // Killed-state tap: park it; RootNavigator drains it onReady.
    wasOpenedFromOfferPush().then(fromPush => {
      if (fromPush) markOfferPushTap();
    });
    init();
    initGoals();
    loadOnboardingSeen()
      .then(seen => {
        setOnboardingState(seen === true ? 'done' : 'film');
      })
      .catch(() => {
        setOnboardingState('film');
      });
    return () => {
      unsubVariant();
      unsubPro();
      if (typeof unsubOfferPush === 'function') unsubOfferPush();
    };
  }, []);

  useEffect(() => {
    if (onboardingState === 'film') {
      trackEvent('intro_film_started');
    } else if (onboardingState === 'show') {
      trackEvent('onboarding_started');
    }
  }, [onboardingState]);

  const handleIntroFinish = useCallback(
    (result: IntroFilmResult, atScene: number) => {
      if (result === 'completed') {
        trackEvent('intro_film_completed');
      } else {
        trackEvent('intro_film_skipped', { at_scene: atScene + 1 });
      }
      // Onboarding-seen persists only on real onboarding finish; a kill
      // during the film replays the film next launch.
      setFilmHandoff(false);
      setOnboardingState('show');
    },
    [],
  );

  const handleIntroTail = useCallback(() => {
    setFilmHandoff(true);
  }, []);

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

  // Widget taps queue natively while the app is backgrounded — drain the
  // queue every time the app comes to the foreground.
  useEffect(() => {
    if (!loaded) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        useHabitStore.getState().syncWidgetToggles().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !goalsLoaded) return;
    (async () => {
      try {
        await setupChannel();
        const habitConfigs = habitNotifications;
        // NOTE: rescheduleAll cancels every pending notification, so the
        // offer reminder must sync AFTER it.
        await rescheduleAll(habitConfigs, adminNotifications);
        await useGoalStore.getState().rescheduleActive();
        await syncOfferReminder();
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
      showIntroFilm={onboardingState === 'film'}
      onIntroFinish={handleIntroFinish}
      onIntroTail={handleIntroTail}
      handoffToOnboarding={filmHandoff}
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
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
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
