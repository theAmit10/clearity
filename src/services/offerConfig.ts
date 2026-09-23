/**
 * Limited-time Lifetime offer config — 50% OFF the Forever Pass.
 *
 * Schedule model: there is ONE lifetime product whose store price is
 * scheduled in App Store Connect + Play Console ($9.99 until Oct 23, 2026,
 * then $19.99 after). No promo offering, no second product. The in-app
 * treatment ends a day early (Oct 22, end of day UTC) as a buffer so the
 * countdown can never outlive the store price.
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
 */

export const LIFETIME_OFFER_ID = 'lifetime50_2026';
/** Discount from the declared price schedule (9.99 → 19.99). */
export const LIFETIME_OFFER_DISCOUNT_PCT = 50;
/** Strike reference = live price × this multiplier. */
export const LIFETIME_OFFER_STRIKE_MULTIPLIER = 2;

/** Offer UI ends Oct 22, 2026 (end of day, UTC) — one day before the store price schedule flips on Oct 23. */
export const LIFETIME_OFFER_END_ISO = '2026-10-22T23:59:59Z';
/** Offer start — informational only, no gating on it. */
export const LIFETIME_OFFER_START_ISO = '2026-09-23T00:00:00Z';

export function getLifetimeOfferEndMs(): number {
  return Date.parse(LIFETIME_OFFER_END_ISO);
}

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

/** Short end-date label (e.g. "Oct 22") derived from the configured end. */
export function getLifetimeOfferEndLabel(): string {
  return new Date(getLifetimeOfferEndMs()).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
