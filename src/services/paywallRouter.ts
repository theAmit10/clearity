import { getStoredVariantSync } from '../store/paywallVariantStore';

export type PaywallSource =
  | 'pro_gate'
  | 'habit_limit'
  | 'category_limit'
  | 'goal_limit'
  | 'reminder_limit'
  | 'settings_upsell_card'
  | 'settings_export'
  | 'settings_import'
  | 'settings_upgrade_row'
  | 'settings_widgets'
  | 'settings_analytics'
  | 'settings_theme'
  | 'preview'
  | 'unknown';

export type PaywallParams =
  | { mode?: 'default' | 'expired'; source?: PaywallSource }
  | undefined;

/**
 * Single choke point for opening the paywall.
 * Reads the diagnostics-selected variant (classic = existing PaywallScreen,
 * v2 = new Subo-style PaywallV2Screen) so conversion tests don't require
 * touching every call site again.
 */
export function openPaywall(navigation: any, params?: PaywallParams): void {
  const variant = getStoredVariantSync();
  navigation.navigate(variant === 'v2' ? 'PaywallV2' : 'Paywall', params);
}

export function getPaywallRouteName(): 'Paywall' | 'PaywallV2' {
  return getStoredVariantSync() === 'v2' ? 'PaywallV2' : 'Paywall';
}
