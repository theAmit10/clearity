/**
 * Widget → paywall deep link (Mixpanel source `widget`).
 *
 * Locked OS widgets (free users and expired Pro) render a "Subscribe to Pro"
 * card. Tapping it opens the app via `habita://paywall?source=widget`
 * (scheme registered in Info.plist + AndroidManifest) and JS routes straight
 * into the paywall. No new analytics events — taps flow through the existing
 * funnel (`paywall_shown` with `source: 'widget'`).
 */

export const WIDGET_PAYWALL_URL = 'habita://paywall?source=widget';

/** True for app URLs that should open the paywall from a widget tap. */
export function isWidgetPaywallUrl(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith('habita://paywall')) return false;
  const query = lower.split('?')[1] ?? '';
  return query.split('&').some(part => part === 'source=widget');
}

// Cold-start tap flag: set when the app is opened from a locked widget
// before navigation is ready; drained by RootNavigator onReady.
let pendingWidgetTap = false;
export function markWidgetPaywallTap(): void {
  pendingWidgetTap = true;
}
export function drainWidgetPaywallTap(): boolean {
  const v = pendingWidgetTap;
  pendingWidgetTap = false;
  return v;
}
