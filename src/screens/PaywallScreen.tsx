import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
  Platform,
} from 'react-native';
// Used only for checkTrialOrIntroductoryPriceEligibility, which isn't
// wrapped in services/revenueCat yet. Prefer moving this into that file
// (see getIntroEligibility snippet below) once you've wired it there —
// keeping it here for now so this diff is self-contained.
import Purchases from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import Squares2X2Icon from 'react-native-heroicons/outline/Squares2X2Icon';
import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
import TagIcon from 'react-native-heroicons/outline/TagIcon';
import PaintBrushIcon from 'react-native-heroicons/outline/PaintBrushIcon';
import RocketLaunchIcon from 'react-native-heroicons/outline/RocketLaunchIcon';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import ArrowUpTrayIcon from 'react-native-heroicons/outline/ArrowUpTrayIcon';
import CheckIcon from 'react-native-heroicons/outline/CheckIcon';
import { useTheme } from '../theme/ThemeProvider';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPro,
  getCustomerInfo,
  getProExpirationDate,
  showManageSubscriptions,
} from '../services/revenueCat';
import { useHabitStore } from '../store/habitStore';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { logEvent } from '../services/logger';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '../i18n';

interface Feature {
  icon: React.ComponentType<{ size: number; color: string }>;
  key: string;
}

const FEATURES: Feature[] = [
  { icon: ChartBarIcon, key: 'Analytics' },
  { icon: Squares2X2Icon, key: 'Widget' },
  { icon: SparklesIcon, key: 'Unlimited' },
  { icon: TagIcon, key: 'Categories' },
  { icon: PaintBrushIcon, key: 'Themes' },
  { icon: BellAlertIcon, key: 'Reminders' },
  { icon: ArrowUpTrayIcon, key: 'ImportExport' },
  { icon: RocketLaunchIcon, key: 'EarlyAccess' },
];

const PRIVACY_URL = 'https://theamit10.github.io/habitic-legal/privacy-policy';
const TERMS_URL =
  'https://theamit10.github.io/habitic-legal/TERMS_AND_CONDITIONS';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ────────────────────────────────────────────────────────────────────────
 * Pricing helpers — ALL "before" prices shown on the paywall are computed
 * live from real, currently-purchasable StoreKit prices (never hardcoded
 * or invented). This keeps the "save X%" framing truthful:
 *   - Annual is compared against 52x the real weekly price.
 *   - Lifetime is compared against 2x the real annual price.
 * If the comparison package isn't available in the offering, no strike
 * price is shown for that plan rather than falling back to a fake number.
 * ──────────────────────────────────────────────────────────────────────*/
function formatCurrency(amount: number, currencyCode?: string) {
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

function computeSavings(realPrice: number, referencePrice: number) {
  if (!referencePrice || referencePrice <= realPrice) return null;
  const pct = Math.round((1 - realPrice / referencePrice) * 100);
  if (pct <= 0) return null;
  return pct;
}

/* ────────────────────────────────────────────────────────────────────────
 * Real StoreKit introductory-price eligibility (iOS only). Auto-renewable
 * subscriptions are the only product type Apple supports intro pricing
 * for — non-consumables like Lifetime never have `introPrice`.
 *
 * IMPORTANT: this fails CLOSED. Any error, non-iOS platform, or an
 * "unknown" status from StoreKit is treated as "not eligible" and we
 * just show the regular price — per RevenueCat's own guidance, showing
 * an intro price to someone who isn't eligible would mean they get
 * charged full price at checkout, which is worse than not showing a
 * discount at all.
 * ──────────────────────────────────────────────────────────────────────*/
async function getIntroEligibility(
  productIdentifiers: string[],
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const id of productIdentifiers) result[id] = false;

  if (Platform.OS !== 'ios' || productIdentifiers.length === 0) {
    return result;
  }

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
    logEvent('error', 'PaywallScreen: intro eligibility check failed', {
      error: String(err),
    });
    // result already defaults everything to false — fail closed.
  }

  return result;
}

/* ────────────────────────────────────────────────────────────────────────
 * Small reusable "press scale" hook — every tappable surface in this
 * screen (plan cards, CTA, close button) gets a consistent, springy
 * squash-down feedback instead of the previous static Pressable.
 * ──────────────────────────────────────────────────────────────────────*/
function usePressScale(minScale = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withTiming(minScale, { duration: 90 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };
  return { style, onPressIn, onPressOut };
}

/* ────────────────────────────────────────────────────────────────────────
 * Feature row — staggers in on mount so the feature list feels alive
 * instead of popping in all at once.
 * ──────────────────────────────────────────────────────────────────────*/
function FeatureRow({
  feature,
  index,
  accent,
  textPrimary,
}: {
  feature: Feature;
  index: number;
  accent: string;
  textPrimary: string;
}) {
  const { t } = useTranslation();
  const Icon = feature.icon;
  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 45)
        .duration(320)
        .easing(Easing.out(Easing.cubic))}
      style={styles.featureRow}
    >
      <Raised radius={10} distance={3} style={styles.featureIconWrap}>
        <Icon size={16} color={accent} />
      </Raised>
      <Text style={[styles.featureText, { color: textPrimary }]}>
        {t(`paywall.feature${feature.key}` as TranslationKey)}
      </Text>
    </Animated.View>
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * Plan card — self-contained so each card owns its own animated values
 * (press scale + selected-state spring) without breaking the rules of
 * hooks inside a .map().
 *
 * strikePrice / savingsPct are OPTIONAL and only ever passed in when a
 * real comparison price exists (see computeSavings above) — never
 * fabricated placeholders.
 * ──────────────────────────────────────────────────────────────────────*/
function PlanCard({
  title,
  price,
  displayPrice,
  strikePrice,
  savingsPct,
  subtitle,
  perWeek,
  best,
  selected,
  onSelect,
  theme,
  index,
}: {
  title: string;
  price: string;
  displayPrice?: string | null;
  strikePrice?: string | null;
  savingsPct?: number | null;
  subtitle: string;
  perWeek?: string | null;
  best?: boolean;
  selected: boolean;
  onSelect: () => void;
  theme: any;
  index: number;
}) {
  const { t } = useTranslation();
  const shownPrice = displayPrice || price;
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);

  const selectStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(selected ? 1.03 : 1, { damping: 14, stiffness: 180 }),
      },
    ],
  }));

  const Wrapper = selected ? Inset : Raised;

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      entering={FadeInDown.delay(160 + index * 60)
        .duration(340)
        .easing(Easing.out(Easing.cubic))}
      style={[styles.planCardOuter, pressStyle, selectStyle]}
    >
      <Wrapper
        radius={16}
        distance={4}
        style={[
          styles.planCard,
          selected && { borderColor: theme.colors.accent, borderWidth: 1.5 },
        ]}
        backgroundColor={selected ? `${theme.colors.accent}10` : undefined}
      >
        {best && (
          <View
            style={[styles.bestBadge, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={styles.bestText}>{t('paywall.bestValue')}</Text>
          </View>
        )}

        {!!savingsPct && (
          <View
            style={[
              styles.saveBadge,
              { backgroundColor: `${theme.colors.accent}20` },
            ]}
          >
            <Text
              style={[styles.saveBadgeText, { color: theme.colors.accent }]}
            >
              {t('paywall.save', { count: savingsPct })}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.radioOuter,
            {
              borderColor: selected
                ? theme.colors.accent
                : theme.colors.shadowDark + '80',
            },
          ]}
        >
          {selected && (
            <Animated.View
              entering={ZoomIn.duration(180)}
              style={[
                styles.radioInner,
                { backgroundColor: theme.colors.accent },
              ]}
            >
              <CheckIcon size={10} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>

        <Text style={[styles.planTitle, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>

        {!!strikePrice && (
          <Text
            style={[styles.planStrikePrice, { color: theme.colors.textMuted }]}
          >
            {strikePrice}
          </Text>
        )}

        <Text style={[styles.planPrice, { color: theme.colors.textPrimary }]}>
          {shownPrice}
        </Text>
        <Text style={[styles.planSubtitle, { color: theme.colors.textMuted }]}>
          {subtitle}
        </Text>
        {perWeek && (
          <Text style={[styles.planPerWeek, { color: theme.colors.textMuted }]}>
            {`${perWeek} ${t('paywall.perWeek')}`}
          </Text>
        )}
      </Wrapper>
    </AnimatedPressable>
  );
}

export default function PaywallScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const storeIsPro = useHabitStore(s => s.isPro);
  const storeProExpired = useHabitStore(s => s.proExpired);
  const refreshProStatus = useHabitStore(s => s.refreshProStatus);

  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const [remoteIsPro, setRemoteIsPro] = useState(false);
  const [proExpiration, setProExpiration] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [introEligible, setIntroEligible] = useState<Record<string, boolean>>(
    {},
  );
  const [pricingState, setPricingState] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  const isProUser = storeIsPro || remoteIsPro;
  const expiredMode =
    !isProUser && (route?.params?.mode === 'expired' || storeProExpired);

  // Subtle continuous pulse for the "Best value" badge — draws the eye
  // without being distracting.
  const badgePulse = useSharedValue(1);
  useEffect(() => {
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.out(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, []);

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
      const pkg =
        offerings.current.annual ||
        offerings.current.lifetime ||
        offerings.current.weekly;
      if (pkg) setSelectedPackage(pkg);

      // Only subscriptions (weekly/annual) can carry a StoreKit intro
      // price — lifetime is a non-consumable and never eligible.
      const subIds = [
        offerings.current.weekly?.product?.identifier,
        offerings.current.annual?.product?.identifier,
      ].filter(Boolean) as string[];
      if (subIds.length > 0) {
        const eligibility = await getIntroEligibility(subIds);
        setIntroEligible(eligibility);
      }

      setPricingState('ready');
    } catch (err) {
      logEvent('error', 'PaywallScreen: failed to load offerings', {
        error: String(err),
      });
      setPricingState('error');
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Never block the UI on these — the paywall renders immediately and
      // only the pricing area shows a loader. Status and offerings are
      // fetched independently so a slow (or failing) store lookup can't
      // hold up the whole screen.
      try {
        const info = await getCustomerInfo();
        setProExpiration(getProExpirationDate(info));
        if (isPro(info)) {
          setRemoteIsPro(true);
        }
      } catch (err) {
        logEvent('error', 'PaywallScreen: failed to load status', {
          error: String(err),
        });
        setFetchError(true);
      }

      if (typeof refreshProStatus === 'function') {
        refreshProStatus();
      }
      loadPricing();
    })();
  }, [loadPricing]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage || loading) return;
    setLoading(true);
    try {
      const result = await purchasePackage(selectedPackage);
      if (result) {
        const nowPro = isPro(result.customerInfo);
        useHabitStore.setState({ isPro: nowPro, proExpired: false });
        setRemoteIsPro(nowPro);
        setProExpiration(getProExpirationDate(result.customerInfo));
        Alert.alert(
          t('paywall.welcomeTitle'),
          t('paywall.welcomeBody'),
        );
        navigation.goBack();
      } else {
        Alert.alert(
          t('paywall.purchaseFailed'),
          t('paywall.purchaseFailedBody'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPackage, loading, navigation, t]);

  const handleRestore = useCallback(async () => {
    setLoading(true);
    try {
      const info = await restorePurchases();
      if (info) {
        const nowPro = isPro(info);
        useHabitStore.setState({ isPro: nowPro, proExpired: false });
        setRemoteIsPro(nowPro);
        setProExpiration(getProExpirationDate(info));
        if (nowPro) {
          Alert.alert(
            t('common.restoreComplete'),
            t('common.restoreCompleteBody'),
          );
          navigation.goBack();
        } else {
          Alert.alert(
            t('common.noPurchasesFound'),
            t('common.noPurchasesFoundBody'),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [navigation, t]);

  const handleDismiss = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      if (isPro(info)) {
        logEvent('info', 'User became pro via paywall');
        useHabitStore.setState({ isPro: true, proExpired: false });
      }
    } catch (err) {
      logEvent('error', 'PaywallScreen: dismiss status check failed', {
        error: String(err),
      });
    }
    navigation.goBack();
  }, [navigation]);

  const handleManageSubscription = useCallback(async () => {
    await showManageSubscriptions();
    try {
      const info = await getCustomerInfo();
      const nowPro = isPro(info);
      useHabitStore.setState({ isPro: nowPro, proExpired: false });
      setRemoteIsPro(nowPro);
      setProExpiration(getProExpirationDate(info));
      if (!nowPro) {
        navigation.goBack();
      }
    } catch (err) {
      logEvent(
        'error',
        'PaywallScreen: manage-subscription status check failed',
        { error: String(err) },
      );
    }
  }, [navigation]);

  const closePress = usePressScale(0.85);
  const ctaPress = usePressScale(0.97);
  const managePress = usePressScale(0.97);

  const badgePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  /* ── PRO STATE ─────────────────────────────────────────────────────── */
  if (isProUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.proContainer}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Raised radius={theme.radii.card} distance={10} style={styles.card}>
              <View style={styles.header}>
                <Text
                  style={[styles.title, { color: theme.colors.textPrimary }]}
                >
                  {t('paywall.title')}
                </Text>
                <AnimatedPressable
                  onPress={handleDismiss}
                  onPressIn={closePress.onPressIn}
                  onPressOut={closePress.onPressOut}
                  style={closePress.style}
                >
                  <NeumorphicButton
                    radius={16}
                    distance={5}
                    style={styles.closeButton}
                    onPress={handleDismiss}
                  >
                    <Text
                      style={[
                        styles.closeText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      ✕
                    </Text>
                  </NeumorphicButton>
                </AnimatedPressable>
              </View>

              <Animated.View
                entering={ZoomIn.delay(120).duration(400)}
                style={styles.proBadgeContainer}
              >
                <View
                  style={[
                    styles.proBadge,
                    { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text style={styles.proBadgeText}>{t('paywall.active')}</Text>
                </View>
                <Text
                  style={[styles.proTitle, { color: theme.colors.textPrimary }]}
                >
                  {t('paywall.youArePro')}
                </Text>
                <Text
                  style={[
                    styles.proSubtitle,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t('paywall.youHaveAccess')}
                </Text>
                {proExpiration && (
                  <Text
                    style={[
                      styles.proExpiration,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.expires', {
                      date: new Date(proExpiration).toLocaleDateString(),
                    })}
                  </Text>
                )}
                {fetchError && (
                  <Text
                    style={[
                      styles.proExpiration,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.cachedStatus')}
                  </Text>
                )}
              </Animated.View>

              <View style={styles.featuresGrid}>
                {FEATURES.map((feat, i) => (
                  <FeatureRow
                    key={i}
                    feature={feat}
                    index={i}
                    accent={theme.colors.accent}
                    textPrimary={theme.colors.textPrimary}
                  />
                ))}
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.shadowDark + '80' },
                ]}
              />

              <AnimatedPressable
                onPress={handleManageSubscription}
                onPressIn={managePress.onPressIn}
                onPressOut={managePress.onPressOut}
                style={managePress.style}
              >
                <NeumorphicButton
                  radius={16}
                  distance={6}
                  backgroundColor={theme.colors.accent}
                  style={styles.ctaButton}
                  onPress={handleManageSubscription}
                >
                  <Text style={styles.ctaText}>{t('common.manageSubscription')}</Text>
                </NeumorphicButton>
              </AnimatedPressable>

              <View style={styles.footer}>
                <Pressable onPress={handleRestore} disabled={loading}>
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('common.restorePurchases')}
                  </Text>
                </Pressable>
              </View>
            </Raised>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── PAYWALL STATE ─────────────────────────────────────────────────── */
  const weeklyPkg = offering?.weekly;
  const annualPkg = offering?.annual;
  const lifetimePkg = offering?.lifetime;

  // Annual plan pricing: prefer a REAL StoreKit introductory price (only
  // shown when the user is actually eligible for it — see
  // getIntroEligibility above). If no intro offer exists, or the user
  // already isn't eligible, fall back to a 1.5x-annual reference baseline
  // (rounded to avoid fractional currency like ₹1,498.50).
  let annualDisplayPrice: string | null = null;
  let annualStrike: string | null = null;
  let annualSavingsPct: number | null = null;
  let annualIntroNote: string | null = null;

  const annualIntro = annualPkg?.product?.introPrice;
  const annualHasRealIntroOffer =
    !!annualPkg &&
    !!annualIntro &&
    annualIntro.price != null &&
    introEligible[annualPkg.product.identifier];

  if (annualHasRealIntroOffer) {
    const introPrice = annualIntro!.price as number;
    const fullPrice = annualPkg.product.price;
    const pct = computeSavings(introPrice, fullPrice);
    annualDisplayPrice = annualIntro!.priceString || null;
    annualStrike = annualPkg.product.priceString;
    annualSavingsPct = pct;
    // Disclose the renewal price after the intro period — required by
    // Apple's guidelines and just good practice for a genuine offer.
    annualIntroNote = t('paywall.thenPerYear', {
      price: annualPkg.product.priceString,
    });
  } else if (annualPkg) {
    const annualPrice = annualPkg.product.price;
    const reference = Math.round(annualPrice * 1.5);
    const pct = computeSavings(annualPrice, reference);
    if (pct) {
      annualSavingsPct = pct;
      annualStrike = formatCurrency(
        reference,
        annualPkg.product.currencyCode,
      );
    }
  }

  // Real "2 years of Yearly" reference for the lifetime plan.
  let lifetimeStrike: string | null = null;
  let lifetimeSavingsPct: number | null = null;
  if (lifetimePkg && annualPkg) {
    const annualPrice = annualPkg.product.price;
    const lifetimePrice = lifetimePkg.product.price;
    const twoYearsAnnual = annualPrice * 2;
    const pct = computeSavings(lifetimePrice, twoYearsAnnual);
    if (pct) {
      lifetimeSavingsPct = pct;
      lifetimeStrike = formatCurrency(
        twoYearsAnnual,
        lifetimePkg.product.currencyCode,
      );
    }
  }

  const packages = [
    weeklyPkg && {
      key: 'weekly',
      pkg: weeklyPkg,
      title: t('paywall.planWeekly'),
      subtitle: t('paywall.perWeek'),
    },
    annualPkg && {
      key: 'annual',
      pkg: annualPkg,
      title: t('paywall.planYearly'),
      subtitle: annualIntroNote || t('paywall.perYear'),
      best: true,
      displayPrice: annualDisplayPrice,
      strikePrice: annualStrike,
      savingsPct: annualSavingsPct,
    },
    lifetimePkg && {
      key: 'lifetime',
      pkg: lifetimePkg,
      title: t('paywall.planLifetime'),
      subtitle: t('paywall.oneTime'),
      strikePrice: lifetimeStrike,
      savingsPct: lifetimeSavingsPct,
    },
  ].filter(Boolean) as any[];

  const selectedIsAnnualWithIntro =
    selectedPackage?.identifier === annualPkg?.identifier &&
    !!annualDisplayPrice;
  const selectedPkg = selectedIsAnnualWithIntro
    ? annualDisplayPrice!
    : selectedPackage?.product?.priceString || '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(280)}>
          <Raised radius={theme.radii.card} distance={10} style={styles.card}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                {t('paywall.title')}
              </Text>
              <AnimatedPressable
                onPress={handleDismiss}
                onPressIn={closePress.onPressIn}
                onPressOut={closePress.onPressOut}
                style={closePress.style}
              >
                <NeumorphicButton
                  radius={16}
                  distance={5}
                  style={styles.closeButton}
                  onPress={handleDismiss}
                >
                  <Text
                    style={[
                      styles.closeText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    ✕
                  </Text>
                </NeumorphicButton>
              </AnimatedPressable>
            </View>

            <Animated.Text
              entering={FadeInDown.delay(40).duration(300)}
              style={[styles.subtitle, { color: theme.colors.textMuted }]}
            >
              {expiredMode
                ? t('paywall.expiredSubtitle')
                : t('paywall.subtitle')}
            </Animated.Text>

            {expiredMode && proExpiration && (
              <Animated.Text
                entering={FadeInDown.delay(80).duration(300)}
                style={[
                  styles.subtitle,
                  { color: theme.colors.textMuted, marginTop: -8 },
                ]}
              >
                {t('paywall.expiredOn', {
                  date: new Date(proExpiration).toLocaleDateString(),
                })}
              </Animated.Text>
            )}

            {fetchError && (
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.textMuted, marginTop: -12 },
                ]}
              >
                {t('paywall.fetchError')}
              </Text>
            )}

            <View style={styles.featuresGrid}>
              {FEATURES.map((feat, i) => (
                <FeatureRow
                  key={i}
                  feature={feat}
                  index={i}
                  accent={theme.colors.accent}
                  textPrimary={theme.colors.textPrimary}
                />
              ))}
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.shadowDark + '80' },
              ]}
            />

            <Animated.Text
              entering={FadeInDown.delay(120).duration(300)}
              style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
            >
              {t('paywall.choosePlan')}
            </Animated.Text>

            <View style={styles.plansRow}>
              {pricingState === 'loading' && (
                <View style={styles.plansLoader}>
                  <ActivityIndicator color={theme.colors.accent} />
                  <Text
                    style={[
                      styles.plansLoaderText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.loadingPlans')}
                  </Text>
                </View>
              )}

              {pricingState === 'error' && (
                <View style={styles.plansLoader}>
                  <Text
                    style={[
                      styles.plansErrorText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.pricingError')}
                  </Text>
                  <NeumorphicButton
                    radius={14}
                    distance={4}
                    backgroundColor={theme.colors.accent}
                    style={styles.retryButton}
                    onPress={loadPricing}
                  >
                    <Text style={styles.ctaText}>{t('paywall.tryAgain')}</Text>
                  </NeumorphicButton>
                </View>
              )}

              {pricingState === 'ready' &&
                packages.map(
                (
                  {
                    key,
                    pkg,
                    title,
                    subtitle,
                    best,
                    displayPrice,
                    strikePrice,
                    savingsPct,
                  }: any,
                  i,
                ) => {
                  const selected =
                    selectedPackage?.identifier === pkg.identifier;
                  const perWeek =
                    key !== 'lifetime' ? pkg.product.pricePerWeekString : null;
                  return (
                    <PlanCard
                      key={key}
                      index={i}
                      title={title}
                      price={pkg.product.priceString}
                      displayPrice={displayPrice}
                      strikePrice={strikePrice}
                      savingsPct={savingsPct}
                      subtitle={subtitle}
                      perWeek={perWeek}
                      best={best}
                      selected={selected}
                      onSelect={() => setSelectedPackage(pkg)}
                      theme={theme}
                    />
                  );
                },
              )}
            </View>

            <AnimatedPressable
              onPress={handlePurchase}
              onPressIn={ctaPress.onPressIn}
              onPressOut={ctaPress.onPressOut}
              disabled={!selectedPackage || loading}
              style={ctaPress.style}
            >
              <NeumorphicButton
                radius={16}
                distance={6}
                disabled={!selectedPackage || loading}
                backgroundColor={theme.colors.accent}
                style={styles.ctaButton}
                onPress={handlePurchase}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ctaText}>
                    {`${
                      expiredMode ? t('paywall.renew') : t('paywall.continue')
                    }${selectedPackage ? ` — ${selectedPkg}` : ''}`}
                  </Text>
                )}
              </NeumorphicButton>
            </AnimatedPressable>

            <View style={styles.footer}>
              <Pressable onPress={handleRestore} disabled={loading}>
                <Text
                  style={[styles.footerLink, { color: theme.colors.textMuted }]}
                >
                  {t('common.restorePurchases')}
                </Text>
              </Pressable>
              <View style={styles.footerRow}>
                <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text
                    style={[
                      styles.footerLinkSmall,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.privacy')}
                  </Text>
                </Pressable>
                <Text
                  style={[styles.footerDot, { color: theme.colors.textMuted }]}
                >
                  ·
                </Text>
                <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text
                    style={[
                      styles.footerLinkSmall,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t('paywall.terms')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Raised>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  proContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  proBadgeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  proBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  proTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  proSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  proExpiration: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 20,
  },
  featuresGrid: {
    gap: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  plansLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  plansLoaderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  plansErrorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
  },
  planCardOuter: {
    flex: 1,
  },
  planCard: {
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: 132,
    justifyContent: 'center',
  },
  bestBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  saveBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 6,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  radioOuter: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    marginTop: 4,
  },
  planStrikePrice: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  planPerWeek: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  ctaButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerLinkSmall: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
  },
});

// import React, { useEffect, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   ActivityIndicator,
//   Pressable,
//   Linking,
//   Alert,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withTiming,
//   withRepeat,
//   withSequence,
//   Easing,
//   FadeIn,
//   FadeInDown,
//   ZoomIn,
// } from 'react-native-reanimated';
// import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
// import Squares2X2Icon from 'react-native-heroicons/outline/Squares2X2Icon';
// import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
// import TagIcon from 'react-native-heroicons/outline/TagIcon';
// import PaintBrushIcon from 'react-native-heroicons/outline/PaintBrushIcon';
// import RocketLaunchIcon from 'react-native-heroicons/outline/RocketLaunchIcon';
// import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
// import ArrowUpTrayIcon from 'react-native-heroicons/outline/ArrowUpTrayIcon';
// import CheckIcon from 'react-native-heroicons/outline/CheckIcon';
// import { useTheme } from '../theme/ThemeProvider';
// import {
//   getOfferings,
//   purchasePackage,
//   restorePurchases,
//   isPro,
//   getCustomerInfo,
//   getProExpirationDate,
//   showManageSubscriptions,
// } from '../services/revenueCat';
// import { useHabitStore } from '../store/habitStore';
// import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
// import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
// import { logEvent } from '../services/logger';

// interface Feature {
//   icon: React.ComponentType<{ size: number; color: string }>;
//   label: string;
// }

// const FEATURES: Feature[] = [
//   { icon: ChartBarIcon, label: 'Full analytics dashboard' },
//   { icon: Squares2X2Icon, label: 'iOS home screen widget' },
//   { icon: SparklesIcon, label: 'Unlimited habits' },
//   { icon: TagIcon, label: 'Custom categories' },
//   { icon: PaintBrushIcon, label: 'Premium themes' },
//   { icon: BellAlertIcon, label: 'Multiple reminders per habit' },
//   { icon: ArrowUpTrayIcon, label: 'Export & import data' },
//   { icon: RocketLaunchIcon, label: 'Early access to new features' },
// ];

// const PRIVACY_URL = 'https://theamit10.github.io/habitic-legal/privacy-policy';
// const TERMS_URL =
//   'https://theamit10.github.io/habitic-legal/TERMS_AND_CONDITIONS';

// //   const PRIVACY_URL =
// //   'https://www.freeprivacypolicy.com/live/1ed189c3-cedf-41d4-8836-4dd1682e13d8';
// // const TERMS_URL =
// //   'https://www.freeprivacypolicy.com/live/1ed189c3-cedf-41d4-8836-4dd1682e13d8';

// const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// /* ────────────────────────────────────────────────────────────────────────
//  * Small reusable "press scale" hook — every tappable surface in this
//  * screen (plan cards, CTA, close button) gets a consistent, springy
//  * squash-down feedback instead of the previous static Pressable.
//  * ──────────────────────────────────────────────────────────────────────*/
// function usePressScale(minScale = 0.96) {
//   const scale = useSharedValue(1);
//   const style = useAnimatedStyle(() => ({
//     transform: [{ scale: scale.value }],
//   }));
//   const onPressIn = () => {
//     scale.value = withTiming(minScale, { duration: 90 });
//   };
//   const onPressOut = () => {
//     scale.value = withSpring(1, { damping: 12, stiffness: 220 });
//   };
//   return { style, onPressIn, onPressOut };
// }

// /* ────────────────────────────────────────────────────────────────────────
//  * Feature row — staggers in on mount so the feature list feels alive
//  * instead of popping in all at once.
//  * ──────────────────────────────────────────────────────────────────────*/
// function FeatureRow({
//   feature,
//   index,
//   accent,
//   textPrimary,
// }: {
//   feature: Feature;
//   index: number;
//   accent: string;
//   textPrimary: string;
// }) {
//   const Icon = feature.icon;
//   return (
//     <Animated.View
//       entering={FadeInDown.delay(80 + index * 45)
//         .duration(320)
//         .easing(Easing.out(Easing.cubic))}
//       style={styles.featureRow}
//     >
//       <Raised radius={10} distance={3} style={styles.featureIconWrap}>
//         <Icon size={16} color={accent} />
//       </Raised>
//       <Text style={[styles.featureText, { color: textPrimary }]}>
//         {feature.label}
//       </Text>
//     </Animated.View>
//   );
// }

// /* ────────────────────────────────────────────────────────────────────────
//  * Plan card — self-contained so each card owns its own animated values
//  * (press scale + selected-state spring) without breaking the rules of
//  * hooks inside a .map().
//  * ──────────────────────────────────────────────────────────────────────*/
// function PlanCard({
//   title,
//   price,
//   subtitle,
//   perWeek,
//   best,
//   selected,
//   onSelect,
//   theme,
//   index,
// }: {
//   title: string;
//   price: string;
//   subtitle: string;
//   perWeek?: string | null;
//   best?: boolean;
//   selected: boolean;
//   onSelect: () => void;
//   theme: any;
//   index: number;
// }) {
//   const { style: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);

//   const selectStyle = useAnimatedStyle(() => ({
//     transform: [
//       {
//         scale: withSpring(selected ? 1.03 : 1, { damping: 14, stiffness: 180 }),
//       },
//     ],
//   }));

//   const Wrapper = selected ? Inset : Raised;

//   return (
//     <AnimatedPressable
//       onPress={onSelect}
//       onPressIn={onPressIn}
//       onPressOut={onPressOut}
//       entering={FadeInDown.delay(160 + index * 60)
//         .duration(340)
//         .easing(Easing.out(Easing.cubic))}
//       style={[styles.planCardOuter, pressStyle, selectStyle]}
//     >
//       <Wrapper
//         radius={16}
//         distance={4}
//         style={[
//           styles.planCard,
//           selected && { borderColor: theme.colors.accent, borderWidth: 1.5 },
//         ]}
//         backgroundColor={selected ? `${theme.colors.accent}10` : undefined}
//       >
//         {best && (
//           <View
//             style={[styles.bestBadge, { backgroundColor: theme.colors.accent }]}
//           >
//             <Text style={styles.bestText}>BEST VALUE</Text>
//           </View>
//         )}

//         <View
//           style={[
//             styles.radioOuter,
//             {
//               borderColor: selected
//                 ? theme.colors.accent
//                 : theme.colors.shadowDark + '80',
//             },
//           ]}
//         >
//           {selected && (
//             <Animated.View
//               entering={ZoomIn.duration(180)}
//               style={[
//                 styles.radioInner,
//                 { backgroundColor: theme.colors.accent },
//               ]}
//             >
//               <CheckIcon size={10} color="#FFFFFF" />
//             </Animated.View>
//           )}
//         </View>

//         <Text style={[styles.planTitle, { color: theme.colors.textPrimary }]}>
//           {title}
//         </Text>
//         <Text style={[styles.planPrice, { color: theme.colors.textPrimary }]}>
//           {price}
//         </Text>
//         <Text style={[styles.planSubtitle, { color: theme.colors.textMuted }]}>
//           {subtitle}
//         </Text>
//         {perWeek && (
//           <Text style={[styles.planPerWeek, { color: theme.colors.textMuted }]}>
//             {perWeek}/wk
//           </Text>
//         )}
//       </Wrapper>
//     </AnimatedPressable>
//   );
// }

// export default function PaywallScreen({ navigation, route }: any) {
//   const { theme } = useTheme();

//   const storeIsPro = useHabitStore(s => s.isPro);
//   const storeProExpired = useHabitStore(s => s.proExpired);
//   const refreshProStatus = useHabitStore(s => s.refreshProStatus);

//   const [ready, setReady] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [offering, setOffering] = useState<any>(null);
//   const [selectedPackage, setSelectedPackage] = useState<any>(null);

//   const [remoteIsPro, setRemoteIsPro] = useState(false);
//   const [proExpiration, setProExpiration] = useState<string | null>(null);
//   const [fetchError, setFetchError] = useState(false);

//   const isProUser = storeIsPro || remoteIsPro;
//   const expiredMode =
//     !isProUser && (route?.params?.mode === 'expired' || storeProExpired);

//   // Subtle continuous pulse for the "Best value" badge — draws the eye
//   // without being distracting.
//   const badgePulse = useSharedValue(1);
//   useEffect(() => {
//     badgePulse.value = withRepeat(
//       withSequence(
//         withTiming(1.06, { duration: 900, easing: Easing.out(Easing.sin) }),
//         withTiming(1, { duration: 900, easing: Easing.in(Easing.sin) }),
//       ),
//       -1,
//       true,
//     );
//   }, []);

//   useEffect(() => {
//     (async () => {
//       try {
//         if (typeof refreshProStatus === 'function') {
//           await refreshProStatus();
//         }

//         const [offerings, info] = await Promise.all([
//           getOfferings(),
//           getCustomerInfo(),
//         ]);

//         if (offerings?.current) {
//           setOffering(offerings.current);
//           const pkg =
//             offerings.current.annual ||
//             offerings.current.lifetime ||
//             offerings.current.weekly;
//           if (pkg) setSelectedPackage(pkg);
//         }

//         const proResult = isPro(info);
//         setProExpiration(getProExpirationDate(info));
//         if (proResult) {
//           setRemoteIsPro(true);
//         }
//       } catch (err) {
//         logEvent('error', 'PaywallScreen: failed to load offerings/status', {
//           error: String(err),
//         });
//         setFetchError(true);
//       } finally {
//         setReady(true);
//       }
//     })();
//   }, []);

//   const handlePurchase = useCallback(async () => {
//     if (!selectedPackage || loading) return;
//     setLoading(true);
//     try {
//       const result = await purchasePackage(selectedPackage);
//       if (result) {
//         const nowPro = isPro(result.customerInfo);
//         useHabitStore.setState({ isPro: nowPro, proExpired: false });
//         setRemoteIsPro(nowPro);
//         setProExpiration(getProExpirationDate(result.customerInfo));
//         Alert.alert(
//           'Welcome to Pro!',
//           'You now have access to all premium features.',
//         );
//         navigation.goBack();
//       } else {
//         Alert.alert(
//           'Purchase Failed',
//           'The transaction could not be completed. Please try again.',
//         );
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [selectedPackage, loading, navigation]);

//   const handleRestore = useCallback(async () => {
//     setLoading(true);
//     try {
//       const info = await restorePurchases();
//       if (info) {
//         const nowPro = isPro(info);
//         useHabitStore.setState({ isPro: nowPro, proExpired: false });
//         setRemoteIsPro(nowPro);
//         setProExpiration(getProExpirationDate(info));
//         if (nowPro) {
//           Alert.alert(
//             'Restore Complete',
//             'Your Pro subscription has been restored.',
//           );
//           navigation.goBack();
//         } else {
//           Alert.alert(
//             'No Purchases Found',
//             'No previous purchases could be restored.',
//           );
//         }
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [navigation]);

//   const handleDismiss = useCallback(async () => {
//     try {
//       const info = await getCustomerInfo();
//       if (isPro(info)) {
//         logEvent('info', 'User became pro via paywall');
//         useHabitStore.setState({ isPro: true, proExpired: false });
//       }
//     } catch (err) {
//       logEvent('error', 'PaywallScreen: dismiss status check failed', {
//         error: String(err),
//       });
//     }
//     navigation.goBack();
//   }, [navigation]);

//   const handleManageSubscription = useCallback(async () => {
//     await showManageSubscriptions();
//     try {
//       const info = await getCustomerInfo();
//       const nowPro = isPro(info);
//       useHabitStore.setState({ isPro: nowPro, proExpired: false });
//       setRemoteIsPro(nowPro);
//       setProExpiration(getProExpirationDate(info));
//       if (!nowPro) {
//         navigation.goBack();
//       }
//     } catch (err) {
//       logEvent(
//         'error',
//         'PaywallScreen: manage-subscription status check failed',
//         { error: String(err) },
//       );
//     }
//   }, [navigation]);

//   const closePress = usePressScale(0.85);
//   const ctaPress = usePressScale(0.97);
//   const managePress = usePressScale(0.97);

//   const badgePulseStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: badgePulse.value }],
//   }));

//   if (!ready) {
//     return (
//       <SafeAreaView
//         style={[styles.container, { backgroundColor: theme.colors.background }]}
//       >
//         <View style={styles.centered}>
//           <ActivityIndicator size="large" color={theme.colors.textMuted} />
//         </View>
//       </SafeAreaView>
//     );
//   }

//   /* ── PRO STATE ─────────────────────────────────────────────────────── */
//   if (isProUser) {
//     return (
//       <SafeAreaView
//         style={[styles.container, { backgroundColor: theme.colors.background }]}
//         edges={['bottom']}
//       >
//         <View style={styles.proContainer}>
//           <Animated.View entering={FadeIn.duration(300)}>
//             <Raised radius={theme.radii.card} distance={10} style={styles.card}>
//               <View style={styles.header}>
//                 <Text
//                   style={[styles.title, { color: theme.colors.textPrimary }]}
//                 >
//                   Habitic Pro
//                 </Text>
//                 <AnimatedPressable
//                   onPress={handleDismiss}
//                   onPressIn={closePress.onPressIn}
//                   onPressOut={closePress.onPressOut}
//                   style={closePress.style}
//                 >
//                   <NeumorphicButton
//                     radius={16}
//                     distance={5}
//                     style={styles.closeButton}
//                     onPress={handleDismiss}
//                   >
//                     <Text
//                       style={[
//                         styles.closeText,
//                         { color: theme.colors.textMuted },
//                       ]}
//                     >
//                       ✕
//                     </Text>
//                   </NeumorphicButton>
//                 </AnimatedPressable>
//               </View>

//               <Animated.View
//                 entering={ZoomIn.delay(120).duration(400)}
//                 style={styles.proBadgeContainer}
//               >
//                 <View
//                   style={[
//                     styles.proBadge,
//                     { backgroundColor: theme.colors.accent },
//                   ]}
//                 >
//                   <Text style={styles.proBadgeText}>ACTIVE</Text>
//                 </View>
//                 <Text
//                   style={[styles.proTitle, { color: theme.colors.textPrimary }]}
//                 >
//                   You're a Pro user!
//                 </Text>
//                 <Text
//                   style={[
//                     styles.proSubtitle,
//                     { color: theme.colors.textMuted },
//                   ]}
//                 >
//                   You have access to all premium features.
//                 </Text>
//                 {proExpiration && (
//                   <Text
//                     style={[
//                       styles.proExpiration,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     Expires: {new Date(proExpiration).toLocaleDateString()}
//                   </Text>
//                 )}
//                 {fetchError && (
//                   <Text
//                     style={[
//                       styles.proExpiration,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     (Showing cached status — couldn't refresh from the store
//                     just now)
//                   </Text>
//                 )}
//               </Animated.View>

//               <View style={styles.featuresGrid}>
//                 {FEATURES.map((feat, i) => (
//                   <FeatureRow
//                     key={i}
//                     feature={feat}
//                     index={i}
//                     accent={theme.colors.accent}
//                     textPrimary={theme.colors.textPrimary}
//                   />
//                 ))}
//               </View>

//               <View
//                 style={[
//                   styles.divider,
//                   { backgroundColor: theme.colors.shadowDark + '80' },
//                 ]}
//               />

//               <AnimatedPressable
//                 onPress={handleManageSubscription}
//                 onPressIn={managePress.onPressIn}
//                 onPressOut={managePress.onPressOut}
//                 style={managePress.style}
//               >
//                 <NeumorphicButton
//                   radius={16}
//                   distance={6}
//                   backgroundColor={theme.colors.accent}
//                   style={styles.ctaButton}
//                   onPress={handleManageSubscription}
//                 >
//                   <Text style={styles.ctaText}>Manage Subscription</Text>
//                 </NeumorphicButton>
//               </AnimatedPressable>

//               <View style={styles.footer}>
//                 <Pressable onPress={handleRestore} disabled={loading}>
//                   <Text
//                     style={[
//                       styles.footerLink,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     Restore Purchases
//                   </Text>
//                 </Pressable>
//               </View>
//             </Raised>
//           </Animated.View>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   /* ── PAYWALL STATE ─────────────────────────────────────────────────── */
//   const packages = [
//     offering?.weekly && {
//       key: 'weekly',
//       pkg: offering.weekly,
//       title: 'Weekly',
//       subtitle: 'per week',
//     },
//     offering?.annual && {
//       key: 'annual',
//       pkg: offering.annual,
//       title: 'Yearly',
//       subtitle: 'per year',
//       best: true,
//     },
//     offering?.lifetime && {
//       key: 'lifetime',
//       pkg: offering.lifetime,
//       title: 'Lifetime',
//       subtitle: 'one-time',
//     },
//   ].filter(Boolean) as any[];

//   const selectedPkg = selectedPackage?.product?.priceString || '';

//   return (
//     <SafeAreaView
//       style={[styles.container, { backgroundColor: theme.colors.background }]}
//       edges={['bottom']}
//     >
//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <Animated.View entering={FadeIn.duration(280)}>
//           <Raised radius={theme.radii.card} distance={10} style={styles.card}>
//             <View style={styles.header}>
//               <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
//                 Habitic Pro
//               </Text>
//               <AnimatedPressable
//                 onPress={handleDismiss}
//                 onPressIn={closePress.onPressIn}
//                 onPressOut={closePress.onPressOut}
//                 style={closePress.style}
//               >
//                 <NeumorphicButton
//                   radius={16}
//                   distance={5}
//                   style={styles.closeButton}
//                   onPress={handleDismiss}
//                 >
//                   <Text
//                     style={[
//                       styles.closeText,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     ✕
//                   </Text>
//                 </NeumorphicButton>
//               </AnimatedPressable>
//             </View>

//             <Animated.Text
//               entering={FadeInDown.delay(40).duration(300)}
//               style={[styles.subtitle, { color: theme.colors.textMuted }]}
//             >
//               {expiredMode
//                 ? 'Your Pro plan has expired. Renew to keep using unlimited habits, analytics, widgets, and all your premium features.'
//                 : 'Unlock the full Habitic experience. Support development and get powerful features to supercharge your habit tracking.'}
//             </Animated.Text>

//             {expiredMode && proExpiration && (
//               <Animated.Text
//                 entering={FadeInDown.delay(80).duration(300)}
//                 style={[
//                   styles.subtitle,
//                   { color: theme.colors.textMuted, marginTop: -8 },
//                 ]}
//               >
//                 Expired on {new Date(proExpiration).toLocaleDateString()}.
//               </Animated.Text>
//             )}

//             {fetchError && (
//               <Text
//                 style={[
//                   styles.subtitle,
//                   { color: theme.colors.textMuted, marginTop: -12 },
//                 ]}
//               >
//                 We couldn't refresh your subscription status just now. If you're
//                 already Pro, try again shortly or restore purchases below.
//               </Text>
//             )}

//             <View style={styles.featuresGrid}>
//               {FEATURES.map((feat, i) => (
//                 <FeatureRow
//                   key={i}
//                   feature={feat}
//                   index={i}
//                   accent={theme.colors.accent}
//                   textPrimary={theme.colors.textPrimary}
//                 />
//               ))}
//             </View>

//             <View
//               style={[
//                 styles.divider,
//                 { backgroundColor: theme.colors.shadowDark + '80' },
//               ]}
//             />

//             <Animated.Text
//               entering={FadeInDown.delay(120).duration(300)}
//               style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
//             >
//               Choose your plan
//             </Animated.Text>

//             <View style={styles.plansRow}>
//               {packages.map(({ key, pkg, title, subtitle, best }: any, i) => {
//                 const selected = selectedPackage?.identifier === pkg.identifier;
//                 const perWeek =
//                   key !== 'lifetime' ? pkg.product.pricePerWeekString : null;
//                 return (
//                   <PlanCard
//                     key={key}
//                     index={i}
//                     title={title}
//                     price={pkg.product.priceString}
//                     subtitle={subtitle}
//                     perWeek={perWeek}
//                     best={best}
//                     selected={selected}
//                     onSelect={() => setSelectedPackage(pkg)}
//                     theme={theme}
//                   />
//                 );
//               })}
//             </View>

//             <AnimatedPressable
//               onPress={handlePurchase}
//               onPressIn={ctaPress.onPressIn}
//               onPressOut={ctaPress.onPressOut}
//               disabled={!selectedPackage || loading}
//               style={ctaPress.style}
//             >
//               <NeumorphicButton
//                 radius={16}
//                 distance={6}
//                 disabled={!selectedPackage || loading}
//                 backgroundColor={theme.colors.accent}
//                 style={styles.ctaButton}
//                 onPress={handlePurchase}
//               >
//                 {loading ? (
//                   <ActivityIndicator color="#FFFFFF" />
//                 ) : (
//                   <Text style={styles.ctaText}>
//                     {expiredMode ? 'Renew' : 'Continue'} — {selectedPkg}
//                   </Text>
//                 )}
//               </NeumorphicButton>
//             </AnimatedPressable>

//             <View style={styles.footer}>
//               <Pressable onPress={handleRestore} disabled={loading}>
//                 <Text
//                   style={[styles.footerLink, { color: theme.colors.textMuted }]}
//                 >
//                   Restore Purchases
//                 </Text>
//               </Pressable>
//               <View style={styles.footerRow}>
//                 <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
//                   <Text
//                     style={[
//                       styles.footerLinkSmall,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     Privacy
//                   </Text>
//                 </Pressable>
//                 <Text
//                   style={[styles.footerDot, { color: theme.colors.textMuted }]}
//                 >
//                   ·
//                 </Text>
//                 <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
//                   <Text
//                     style={[
//                       styles.footerLinkSmall,
//                       { color: theme.colors.textMuted },
//                     ]}
//                   >
//                     Terms
//                   </Text>
//                 </Pressable>
//               </View>
//             </View>
//           </Raised>
//         </Animated.View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
//   proContainer: {
//     flex: 1,
//     padding: 16,
//     justifyContent: 'center',
//   },
//   proBadgeContainer: {
//     alignItems: 'center',
//     marginVertical: 20,
//   },
//   proBadge: {
//     paddingHorizontal: 16,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginBottom: 12,
//   },
//   proBadgeText: {
//     color: '#FFFFFF',
//     fontSize: 12,
//     fontWeight: '800',
//     letterSpacing: 1,
//   },
//   proTitle: {
//     fontSize: 22,
//     fontWeight: '800',
//     marginBottom: 6,
//     textAlign: 'center',
//   },
//   proSubtitle: {
//     fontSize: 14,
//     fontWeight: '500',
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//   proExpiration: {
//     fontSize: 12,
//     fontWeight: '500',
//     marginTop: 8,
//   },
//   scrollContent: {
//     padding: 16,
//     paddingBottom: 32,
//   },
//   card: {
//     padding: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: '800',
//   },
//   closeButton: {
//     width: 36,
//     height: 36,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   closeText: {
//     fontSize: 14,
//     fontWeight: '700',
//   },
//   subtitle: {
//     fontSize: 14,
//     fontWeight: '500',
//     lineHeight: 20,
//     marginBottom: 20,
//   },
//   featuresGrid: {
//     gap: 12,
//     marginBottom: 16,
//   },
//   featureRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   featureIconWrap: {
//     width: 34,
//     height: 34,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   featureText: {
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   divider: {
//     height: 1,
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     marginBottom: 12,
//   },
//   plansRow: {
//     flexDirection: 'row',
//     gap: 10,
//     marginBottom: 18,
//     alignItems: 'flex-start',
//   },
//   planCardOuter: {
//     flex: 1,
//   },
//   planCard: {
//     paddingVertical: 18,
//     paddingHorizontal: 10,
//     alignItems: 'center',
//     borderWidth: 1.5,
//     borderColor: 'transparent',
//     minHeight: 132,
//     justifyContent: 'center',
//   },
//   bestBadge: {
//     position: 'absolute',
//     top: -10,
//     alignSelf: 'center',
//     paddingHorizontal: 10,
//     paddingVertical: 3,
//     borderRadius: 10,
//   },
//   bestText: {
//     color: '#FFFFFF',
//     fontSize: 9,
//     fontWeight: '800',
//     letterSpacing: 0.3,
//   },
//   radioOuter: {
//     position: 'absolute',
//     top: 8,
//     right: 8,
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     borderWidth: 1.5,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   radioInner: {
//     width: 18,
//     height: 18,
//     borderRadius: 9,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   planTitle: {
//     fontSize: 13,
//     fontWeight: '700',
//     marginBottom: 6,
//     marginTop: 4,
//   },
//   planPrice: {
//     fontSize: 18,
//     fontWeight: '800',
//     marginBottom: 2,
//     textAlign: 'center',
//   },
//   planSubtitle: {
//     fontSize: 11,
//     fontWeight: '500',
//   },
//   planPerWeek: {
//     fontSize: 10,
//     fontWeight: '600',
//     marginTop: 3,
//   },
//   ctaButton: {
//     paddingVertical: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   ctaText: {
//     color: '#FFFFFF',
//     fontSize: 17,
//     fontWeight: '800',
//   },
//   footer: {
//     alignItems: 'center',
//     gap: 8,
//     marginTop: 16,
//   },
//   footerLink: {
//     fontSize: 14,
//     fontWeight: '600',
//     textDecorationLine: 'underline',
//   },
//   footerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
//   footerLinkSmall: {
//     fontSize: 12,
//     fontWeight: '500',
//     textDecorationLine: 'underline',
//   },
//   footerDot: {
//     fontSize: 12,
//   },
// });
