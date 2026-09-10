import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { getOfferings } from '../services/revenueCat';
import { logEvent } from '../services/logger';

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
      // v2 defaults to lifetime (Forever Pass) to mirror the reference.
      const pkg =
        offerings.current.lifetime ||
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
  } else if (annualPkg && weeklyPkg) {
    const yearOfWeekly = weeklyPkg.product.price * 52;
    const pct = computeSavings(annualPkg.product.price, yearOfWeekly);
    if (pct) {
      annualSavingsPct = pct;
      annualStrike = formatCurrency(
        yearOfWeekly,
        annualPkg.product.currencyCode,
      );
    }
  }

  let lifetimeStrike: string | null = null;
  let lifetimeSavingsPct: number | null = null;
  if (lifetimePkg && annualPkg) {
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
    lifetimePkg,
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
