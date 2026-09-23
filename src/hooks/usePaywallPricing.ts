import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { getOfferings } from '../services/revenueCat';
import { logEvent } from '../services/logger';
import {
  LIFETIME_OFFER_STRIKE_MULTIPLIER,
  isLifetimeOfferActive,
  getLifetimeOfferDaysLeft,
} from '../services/offerConfig';

export function formatCurrency(amount: number, currencyCode?: string) {
  if (!currencyCode) return amount.toFixed(2);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function computeSavings(realPrice: number, referencePrice: number) {
  if (!referencePrice || referencePrice <= realPrice) return null;
  const pct = Math.round((1 - realPrice / referencePrice) * 100);
  if (pct <= 0) return null;
  return pct;
}

async function getIntroEligibility(
  productIdentifiers: string[],
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const id of productIdentifiers) result[id] = false;
  if (Platform.OS !== 'ios' || productIdentifiers.length === 0) return result;
  try {
    const eligibilityMap =
      await Purchases.checkTrialOrIntroductoryPriceEligibility(
        productIdentifiers,
      );
    for (const id of productIdentifiers) {
      result[id] =
        eligibilityMap[id]?.status ===
        Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
    }
  } catch (err) {
    logEvent('error', 'usePaywallPricing: intro eligibility check failed', {
      error: String(err),
    });
  }
  return result;
}

export type PricingState = 'loading' | 'ready' | 'error';

export function usePaywallPricing() {
  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [introEligible, setIntroEligible] = useState<Record<string, boolean>>(
    {},
  );
  const [pricingState, setPricingState] = useState<PricingState>('loading');

  const loadPricing = useCallback(async () => {
    setPricingState('loading');
    try {
      const offerings = await getOfferings();
      if (!offerings?.current) {
        setPricingState('error');
        return;
      }
      const hasAnyPlan =
        offerings.current.weekly ||
        offerings.current.annual ||
        offerings.current.lifetime;
      if (!hasAnyPlan) {
        setPricingState('error');
        return;
      }
      setOffering(offerings.current);
      // Schedule model: ONE lifetime product whose store price is scheduled
      // ($9.99 until Oct 23, 2026, then $19.99). The offer treatment is gated
      // by the date window only (UI ends Oct 22, a day before the price
      // flips) — no promo offering to look up.
      const effectiveLifetime = offerings.current.lifetime;
      // v2 defaults to lifetime (Forever Pass) to mirror the reference.
      const pkg =
        effectiveLifetime ||
        offerings.current.annual ||
        offerings.current.weekly;
      if (pkg) setSelectedPackage(pkg);

      const subIds = [
        offerings.current.weekly?.product?.identifier,
        offerings.current.annual?.product?.identifier,
      ].filter(Boolean) as string[];
      if (subIds.length > 0) {
        setIntroEligible(await getIntroEligibility(subIds));
      }
      setPricingState('ready');
    } catch (err) {
      logEvent('error', 'usePaywallPricing: failed to load offerings', {
        error: String(err),
      });
      setPricingState('error');
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const weeklyPkg = offering?.weekly;
  const annualPkg = offering?.annual;
  const lifetimePkg = offering?.lifetime;

  let annualDisplayPrice: string | null = null;
  let annualStrike: string | null = null;
  let annualSavingsPct: number | null = null;

  const annualIntro = annualPkg?.product?.introPrice;
  const annualHasRealIntroOffer =
    !!annualPkg &&
    !!annualIntro &&
    annualIntro.price != null &&
    introEligible[annualPkg.product.identifier];

  if (annualHasRealIntroOffer) {
    const introPrice = annualIntro!.price as number;
    annualDisplayPrice = annualIntro!.priceString || null;
    annualStrike = annualPkg.product.priceString;
    annualSavingsPct = computeSavings(introPrice, annualPkg.product.price);
  } else if (annualPkg) {
    // Reference baseline is 1.5x the annual price itself (rounded to avoid
    // fractional currency like ₹1,498.50). Savings always work out to ~33%.
    const reference = Math.round(annualPkg.product.price * 1.5);
    const pct = computeSavings(annualPkg.product.price, reference);
    if (pct) {
      annualSavingsPct = pct;
      annualStrike = formatCurrency(
        reference,
        annualPkg.product.currencyCode,
      );
    }
  }

  let lifetimeStrike: string | null = null;
  let lifetimeSavingsPct: number | null = null;
  // Schedule model: the live lifetime price IS the sale price during the
  // window. The full-price reference is not exposed by any store API, so it
  // is derived as 2x live (matches the declared 9.99 → 19.99 schedule; may
  // differ by a cent, e.g. $19.98 vs $19.99 — never shown as store truth,
  // only as the visual reference next to SAVE %). Annual/weekly untouched.
  const lifetimeOfferActive =
    isLifetimeOfferActive() && !!lifetimePkg;
  if (lifetimeOfferActive && lifetimePkg) {
    const salePrice = lifetimePkg.product.price as number;
    const reference = salePrice * LIFETIME_OFFER_STRIKE_MULTIPLIER;
    const pct = computeSavings(salePrice, reference);
    if (pct) {
      lifetimeSavingsPct = pct;
      lifetimeStrike = formatCurrency(
        reference,
        lifetimePkg.product.currencyCode,
      );
    }
  } else if (lifetimePkg && annualPkg) {
    const twoYearsAnnual = annualPkg.product.price * 2;
    const pct = computeSavings(lifetimePkg.product.price, twoYearsAnnual);
    if (pct) {
      lifetimeSavingsPct = pct;
      lifetimeStrike = formatCurrency(
        twoYearsAnnual,
        lifetimePkg.product.currencyCode,
      );
    }
  }

  return {
    offering,
    weeklyPkg,
    annualPkg,
    // Lifetime is the single scheduled product: sale price during the
    // window, full price after. Annual/weekly are always full price.
    lifetimePkg,
    lifetimeOfferActive,
    // Schedule-declared discount % (9.99 → 19.99). Null when the offer is
    // off — the single source of truth for badge + analytics.
    lifetimeOfferPct: lifetimeOfferActive ? lifetimeSavingsPct : null,
    lifetimeOfferDaysLeft: getLifetimeOfferDaysLeft(),
    selectedPackage,
    setSelectedPackage,
    pricingState,
    loadPricing,
    annualDisplayPrice,
    annualStrike,
    annualSavingsPct,
    lifetimeStrike,
    lifetimeSavingsPct,
  };
}
