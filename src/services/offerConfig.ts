/**
 * Limited-time Lifetime offer config — 50% OFF the Forever Pass.
 *
 * Schedule model: there is ONE lifetime product whose store price is
 * scheduled in App Store Connect + Play Console ($9.99 until Oct 23, 2026,
 * then $19.99 after). No promo offering, no second product. The in-app
 * treatment shows through Oct 22 on each device's LOCAL clock (cutoff =
 * local Oct 23 00:00) so "till Oct 22" reads accurately worldwide.
 *
 * Consequences:
 * - Only the CURRENT price is readable from the store. The full-price
 *   reference ($19.99) is not exposed by any store API, so the strike is
 *   derived as 2x the live price (see usePaywallPricing) — it can differ by
 *   a cent from the true future price (e.g. $19.98 vs $19.99).
 * - `DISCOUNT_PCT` is a business fact from the declared schedule
 *   (9.99 → 19.99), not a measured value.
 * - After the end date the stores revert the price automatically and the
 *   date gate below hides the whole treatment — no dashboard action needed.
 * - Gating uses the device clock; a wrong device clock shifts the window.
 *   The store sheet always charges/shows the true live price, so a skewed
 *   clock can never cause a mischarge.
 */

export const LIFETIME_OFFER_ID = 'lifetime50_2026';
/** Discount from the declared price schedule (9.99 → 19.99). */
export const LIFETIME_OFFER_DISCOUNT_PCT = 50;
/** Strike reference = live price × this multiplier. */
export const LIFETIME_OFFER_STRIKE_MULTIPLIER = 2;

/**
 * Offer UI shows through Oct 22, 2026 on the device's LOCAL clock.
 * Cutoff = local Oct 23 00:00 (the first instant that is no longer Oct 22).
 * Built with local date components — never a UTC instant — so the window
 * matches "till Oct 22" in every timezone.
 */
export function getLifetimeOfferEndMs(): number {
  return new Date(2026, 9, 23, 0, 0, 0, 0).getTime();
}
/** Offer start — informational only, no gating on it. */
export const LIFETIME_OFFER_START_ISO = '2026-09-23T00:00:00Z';

export function isLifetimeOfferActive(nowMs: number = Date.now()): boolean {
  return nowMs <= getLifetimeOfferEndMs();
}

/** Whole days left (ceil). Returns 0 once expired. */
export function getLifetimeOfferDaysLeft(nowMs: number = Date.now()): number {
  const diff = getLifetimeOfferEndMs() - nowMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function getLifetimeOfferProps(nowMs: number = Date.now()): {
  offer_id: string;
  discount_pct: number;
  days_left: number;
} {
  return {
    offer_id: LIFETIME_OFFER_ID,
    discount_pct: LIFETIME_OFFER_DISCOUNT_PCT,
    days_left: getLifetimeOfferDaysLeft(nowMs),
  };
}

/**
 * Short end-date label (e.g. "Oct 22").
 * Formats a fixed LOCAL midday on Oct 22 — never the end instant itself —
 * so the label reads "Oct 22" in every timezone (formatting the end
 * instant, local Oct 23 00:00, would render "Oct 23").
 */
export function getLifetimeOfferEndLabel(): string {
  return new Date(2026, 9, 22, 12, 0, 0, 0).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
