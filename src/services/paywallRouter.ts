import { getStoredVariantSync } from '../store/paywallVariantStore';

export type PaywallParams = { mode?: string } | undefined;

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
