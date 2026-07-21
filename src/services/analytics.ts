import { Mixpanel } from 'mixpanel-react-native';
import { APP_VERSION, MIXPANEL_TOKEN } from '../constants/appInfo';
import { logEvent } from './logger';

let mixpanel: Mixpanel | null = null;

export async function initAnalytics(): Promise<void> {
  if (!MIXPANEL_TOKEN) {
    logEvent('warn', 'Mixpanel token not configured — analytics disabled');
    return;
  }

  try {
    const instance = new Mixpanel(MIXPANEL_TOKEN, true);
    await instance.init(false, { $app_version_string: APP_VERSION });
    mixpanel = instance;
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

export function trackScreenView(screenName: string): void {
  trackEvent('screen_view', { screen_name: screenName });
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
  if (!mixpanel) return;
  try {
    mixpanel.registerSuperProperties(props);
  } catch (err) {
    logEvent('error', 'Mixpanel registerSuperProperties failed', err);
  }
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
