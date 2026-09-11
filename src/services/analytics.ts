import { Platform } from 'react-native';
import { Mixpanel } from 'mixpanel-react-native';
import { APP_VERSION, MIXPANEL_TOKEN } from '../constants/appInfo';
import { logEvent } from './logger';

let mixpanel: Mixpanel | null = null;
// Super properties set before init completes are queued and flushed once
// the instance is ready, so early events never lose their defaults.
let pendingSuperProps: Record<string, unknown> = {};

export async function initAnalytics(): Promise<void> {
  if (!MIXPANEL_TOKEN) {
    logEvent('warn', 'Mixpanel token not configured — analytics disabled');
    return;
  }

  try {
    const instance = new Mixpanel(MIXPANEL_TOKEN, true);
    await instance.init(false, { $app_version_string: APP_VERSION });
    mixpanel = instance;
    if (Object.keys(pendingSuperProps).length > 0) {
      try {
        mixpanel.registerSuperProperties(pendingSuperProps);
      } catch (err) {
        logEvent('error', 'Mixpanel flush super properties failed', err);
      }
    }
    logEvent('info', 'Mixpanel initialized');
  } catch (err) {
    logEvent('error', 'Failed to init Mixpanel', err);
  }
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!mixpanel) return;
  try {
    mixpanel.track(name, properties);
  } catch (err) {
    logEvent('error', 'Mixpanel track failed', { name, err });
  }
}

export async function identifyUser(userId: string): Promise<void> {
  if (!mixpanel) return;
  try {
    await mixpanel.identify(userId);
  } catch (err) {
    logEvent('error', 'Mixpanel identify failed', { userId, err });
  }
}

export function registerSuperProperties(props: Record<string, unknown>): void {
  pendingSuperProps = { ...pendingSuperProps, ...props };
  if (!mixpanel) return;
  try {
    mixpanel.registerSuperProperties(props);
  } catch (err) {
    logEvent('error', 'Mixpanel registerSuperProperties failed', err);
  }
}

/**
 * Baseline super properties attached to every event: app version,
 * platform, paywall variant (classic/v2), and pro status. Refresh the
 * mutable ones via updatePaywallVariantProp/updateProProp when they change.
 */
export function setAnalyticsDefaults(opts: {
  paywallVariant: string;
  isPro: boolean;
}): void {
  registerSuperProperties({
    app_version: APP_VERSION,
    platform: Platform.OS,
    paywall_variant: opts.paywallVariant,
    is_pro: opts.isPro,
  });
}

export function updatePaywallVariantProp(variant: string): void {
  registerSuperProperties({ paywall_variant: variant });
}

export function updateProProp(isPro: boolean): void {
  registerSuperProperties({ is_pro: isPro });
}

type ActivationProps = Record<string, unknown>;

// RevenueCat is the source of truth for entitlements; its customer-info
// listener can fire right after a purchase/restore handler already tracked
// the same activation. Dedupe within a window so the funnel endpoint never
// double-counts a single conversion.
let lastActivationTrackedAt = 0;
const ACTIVATION_DEDUPE_MS = 60 * 1000;

export function trackSubscriptionActivated(props: ActivationProps): void {
  const now = Date.now();
  if (now - lastActivationTrackedAt < ACTIVATION_DEDUPE_MS) return;
  lastActivationTrackedAt = now;
  trackEvent('subscription_activated', props);
}

export function resetAnalytics(): void {
  if (!mixpanel) return;
  try {
    mixpanel.reset();
  } catch (err) {
    logEvent('error', 'Mixpanel reset failed', err);
  }
}

export function getMixpanelInstance(): Mixpanel | null {
  return mixpanel;
}
