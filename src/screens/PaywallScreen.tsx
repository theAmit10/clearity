import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import Squares2X2Icon from 'react-native-heroicons/outline/Squares2X2Icon';
import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
import TagIcon from 'react-native-heroicons/outline/TagIcon';
import PaintBrushIcon from 'react-native-heroicons/outline/PaintBrushIcon';
import RocketLaunchIcon from 'react-native-heroicons/outline/RocketLaunchIcon';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import ArrowUpTrayIcon from 'react-native-heroicons/outline/ArrowUpTrayIcon';
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

interface Feature {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
}

const FEATURES: Feature[] = [
  { icon: ChartBarIcon, label: 'Full analytics dashboard' },
  { icon: Squares2X2Icon, label: 'iOS home screen widget' },
  { icon: SparklesIcon, label: 'Unlimited habits' },
  { icon: TagIcon, label: 'Custom categories' },
  { icon: PaintBrushIcon, label: 'Premium themes' },
  { icon: BellAlertIcon, label: 'Multiple reminders per habit' },
  { icon: ArrowUpTrayIcon, label: 'Export & import data' },
  { icon: RocketLaunchIcon, label: 'Early access to new features' },
];

const PRIVACY_URL = 'https://codethenic.com/privacy';
const TERMS_URL = 'https://codethenic.com/terms';

export default function PaywallScreen({ navigation }: any) {
  const { theme } = useTheme();

  // ── Fix #1 ──────────────────────────────────────────────────────────────
  // Subscribe directly to the store's `isPro` flag instead of copying it
  // into local state with `useState(storeIsPro)`. A `useState` initializer
  // only runs once, on first render — if the store's isPro flips true
  // *after* this screen mounts (e.g. refreshProStatus resolves elsewhere,
  // a webhook-driven update lands, restore completes on another screen),
  // the old local copy never picked that up and kept showing the paywall
  // to an already-pro user.
  const storeIsPro = useHabitStore(s => s.isPro);
  const refreshProStatus = useHabitStore(s => s.refreshProStatus);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  // Remote-verified pro status (fresh RevenueCat check), separate from the
  // store's cached flag. We treat the user as pro if *either* signal says
  // so, rather than requiring the remote fetch to succeed before trusting
  // what the store already knows.
  const [remoteIsPro, setRemoteIsPro] = useState(false);
  const [proExpiration, setProExpiration] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const isProUser = storeIsPro || remoteIsPro;

  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    console.log('[Paywall DEBUG] ── mount ──');
    console.log('[Paywall DEBUG] storeIsPro at mount:', storeIsPro);
    console.log(
      '[Paywall DEBUG] typeof refreshProStatus:',
      typeof refreshProStatus,
    );

    (async () => {
      try {
        // ── Fix #2 ────────────────────────────────────────────────────────
        // `refreshProStatus` was imported but never called. Call it so the
        // global store is reconciled with RevenueCat as soon as the paywall
        // opens — this is the highest-stakes moment to have correct status.
        if (typeof refreshProStatus === 'function') {
          const refreshResult = await refreshProStatus();
          console.log(
            '[Paywall DEBUG] refreshProStatus() resolved with:',
            JSON.stringify(refreshResult, null, 2),
          );
        } else {
          console.log(
            '[Paywall DEBUG] refreshProStatus is not a function — skipping call',
          );
        }

        console.log(
          '[Paywall DEBUG] storeIsPro right after refreshProStatus:',
          useHabitStore.getState().isPro,
        );

        const [offerings, info] = await Promise.all([
          getOfferings(),
          getCustomerInfo(),
        ]);

        console.log(
          '[Paywall DEBUG] getOfferings() result:',
          JSON.stringify(offerings, null, 2),
        );
        console.log(
          '[Paywall DEBUG] getCustomerInfo() raw result:',
          JSON.stringify(info, null, 2),
        );
        console.log(
          '[Paywall DEBUG] info.entitlements.active keys:',
          info?.entitlements?.active
            ? Object.keys(info.entitlements.active)
            : 'entitlements.active missing/undefined',
        );

        const proResult = isPro(info);
        console.log('[Paywall DEBUG] isPro(info) returned:', proResult);

        if (offerings?.current) {
          setOffering(offerings.current);
          const pkg =
            offerings.current.annual ||
            offerings.current.lifetime ||
            offerings.current.weekly;
          if (pkg) setSelectedPackage(pkg);
        } else {
          console.log(
            '[Paywall DEBUG] offerings.current is falsy — no offering set',
          );
        }

        if (proResult) {
          setRemoteIsPro(true);
          const exp = getProExpirationDate(info);
          console.log('[Paywall DEBUG] getProExpirationDate(info):', exp);
          setProExpiration(exp);
        }
      } catch (err) {
        // ── Fix #3 ────────────────────────────────────────────────────────
        // Previously, any failure here (network blip, RevenueCat error)
        // left `ready` stuck at false forever — an infinite spinner — and
        // silently prevented the pro check from ever completing. Now we
        // surface the error and still fall back to whatever the store
        // already knows (storeIsPro), so a paying user isn't shown the
        // paywall just because one fetch failed.
        console.log('[Paywall DEBUG] ERROR thrown during status check:', err);
        logEvent('error', 'PaywallScreen: failed to load offerings/status', {
          error: String(err),
        });
        setFetchError(true);
      } finally {
        console.log(
          '[Paywall DEBUG] final storeIsPro:',
          useHabitStore.getState().isPro,
        );
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    console.log(
      '[Paywall DEBUG] render — storeIsPro:',
      storeIsPro,
      'remoteIsPro:',
      remoteIsPro,
      'combined isProUser:',
      storeIsPro || remoteIsPro,
    );
  }, [storeIsPro, remoteIsPro]);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    cardOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [ready]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const handlePurchase = async () => {
    if (!selectedPackage || loading) return;
    setLoading(true);
    try {
      const result = await purchasePackage(selectedPackage);
      if (result) {
        const nowPro = isPro(result.customerInfo);
        useHabitStore.setState({ isPro: nowPro });
        setRemoteIsPro(nowPro);
        Alert.alert(
          'Welcome to Pro!',
          'You now have access to all premium features.',
        );
        navigation.goBack();
      } else {
        Alert.alert(
          'Purchase Failed',
          'The transaction could not be completed. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const info = await restorePurchases();
      if (info) {
        const nowPro = isPro(info);
        useHabitStore.setState({ isPro: nowPro });
        setRemoteIsPro(nowPro);
        if (nowPro) {
          Alert.alert(
            'Restore Complete',
            'Your Pro subscription has been restored.',
          );
          navigation.goBack();
        } else {
          Alert.alert(
            'No Purchases Found',
            'No previous purchases could be restored.',
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const info = await getCustomerInfo();
      if (isPro(info)) {
        logEvent('info', 'User became pro via paywall');
        useHabitStore.setState({ isPro: true });
      }
    } catch (err) {
      logEvent('error', 'PaywallScreen: dismiss status check failed', {
        error: String(err),
      });
    }
    navigation.goBack();
  };

  const handleManageSubscription = async () => {
    await showManageSubscriptions();
    try {
      const info = await getCustomerInfo();
      const nowPro = isPro(info);
      useHabitStore.setState({ isPro: nowPro });
      setRemoteIsPro(nowPro);
      if (!nowPro) {
        navigation.goBack();
      }
    } catch (err) {
      logEvent(
        'error',
        'PaywallScreen: manage-subscription status check failed',
        {
          error: String(err),
        },
      );
    }
  };

  if (!ready) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  if (isProUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['bottom']}
      >
        <View style={styles.proContainer}>
          <Animated.View style={cardStyle}>
            <Raised radius={theme.radii.card} distance={10} style={styles.card}>
              <View style={styles.header}>
                <Text
                  style={[styles.title, { color: theme.colors.textPrimary }]}
                >
                  Habitic Pro
                </Text>
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
              </View>

              <View style={styles.proBadgeContainer}>
                <View
                  style={[
                    styles.proBadge,
                    { backgroundColor: theme.colors.accent },
                  ]}
                >
                  <Text style={styles.proBadgeText}>ACTIVE</Text>
                </View>
                <Text
                  style={[styles.proTitle, { color: theme.colors.textPrimary }]}
                >
                  You're a Pro user!
                </Text>
                <Text
                  style={[
                    styles.proSubtitle,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  You have access to all premium features.
                </Text>
                {proExpiration && (
                  <Text
                    style={[
                      styles.proExpiration,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Expires: {new Date(proExpiration).toLocaleDateString()}
                  </Text>
                )}
                {fetchError && (
                  <Text
                    style={[
                      styles.proExpiration,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    (Showing cached status — couldn't refresh from the store
                    just now)
                  </Text>
                )}
              </View>

              <View style={styles.featuresGrid}>
                {FEATURES.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <View key={i} style={styles.featureRow}>
                      <Raised
                        radius={10}
                        distance={3}
                        style={styles.featureIconWrap}
                      >
                        <Icon size={16} color={theme.colors.accent} />
                      </Raised>
                      <Text
                        style={[
                          styles.featureText,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {feat.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.shadowDark + '80' },
                ]}
              />

              <NeumorphicButton
                radius={16}
                distance={6}
                backgroundColor={theme.colors.accent}
                style={styles.ctaButton}
                onPress={handleManageSubscription}
              >
                <Text style={styles.ctaText}>Manage Subscription</Text>
              </NeumorphicButton>

              <View style={styles.footer}>
                <Pressable onPress={handleRestore} disabled={loading}>
                  <Text
                    style={[
                      styles.footerLink,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Restore Purchases
                  </Text>
                </Pressable>
              </View>
            </Raised>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const packages = [
    offering?.weekly && {
      key: 'weekly',
      pkg: offering.weekly,
      title: 'Weekly',
      subtitle: 'per week',
    },
    offering?.annual && {
      key: 'annual',
      pkg: offering.annual,
      title: 'Yearly',
      subtitle: 'per year',
      best: true,
    },
    offering?.lifetime && {
      key: 'lifetime',
      pkg: offering.lifetime,
      title: 'Lifetime',
      subtitle: 'one-time',
    },
  ].filter(Boolean) as any[];

  const selectedPkg = selectedPackage?.product?.priceString || '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={cardStyle}>
          <Raised radius={theme.radii.card} distance={10} style={styles.card}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                Habitic Pro
              </Text>
              <NeumorphicButton
                radius={16}
                distance={5}
                style={styles.closeButton}
                onPress={handleDismiss}
              >
                <Text
                  style={[styles.closeText, { color: theme.colors.textMuted }]}
                >
                  ✕
                </Text>
              </NeumorphicButton>
            </View>

            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Unlock the full Habitic experience. Support development and get
              powerful features to supercharge your habit tracking.
            </Text>

            {fetchError && (
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.textMuted, marginTop: -12 },
                ]}
              >
                We couldn't refresh your subscription status just now. If you're
                already Pro, try again shortly or restore purchases below.
              </Text>
            )}

            <View style={styles.featuresGrid}>
              {FEATURES.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <View key={i} style={styles.featureRow}>
                    <Raised
                      radius={10}
                      distance={3}
                      style={styles.featureIconWrap}
                    >
                      <Icon size={16} color={theme.colors.accent} />
                    </Raised>
                    <Text
                      style={[
                        styles.featureText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {feat.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.shadowDark + '80' },
              ]}
            />

            <Text
              style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
            >
              Choose your plan
            </Text>

            {packages.map(({ key, pkg, title, subtitle, best }: any) => {
              const selected = selectedPackage?.identifier === pkg.identifier;
              const Wrapper = selected ? Inset : Raised;
              const price = pkg.product.priceString;
              const perWeek =
                key !== 'lifetime' ? pkg.product.pricePerWeekString : null;
              return (
                <Pressable key={key} onPress={() => setSelectedPackage(pkg)}>
                  <Wrapper
                    radius={14}
                    distance={4}
                    style={[
                      styles.planCard,
                      selected && {
                        backgroundColor: `${theme.colors.accent}12`,
                      },
                    ]}
                    backgroundColor={
                      selected ? `${theme.colors.accent}08` : undefined
                    }
                  >
                    {best && (
                      <View
                        style={[
                          styles.bestBadge,
                          { backgroundColor: theme.colors.accent },
                        ]}
                      >
                        <Text style={styles.bestText}>Best value</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.planTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.planPrice,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {price}
                    </Text>
                    <Text
                      style={[
                        styles.planSubtitle,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {subtitle}
                    </Text>
                    {perWeek && (
                      <Text
                        style={[
                          styles.planPerWeek,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {perWeek}/week
                      </Text>
                    )}
                  </Wrapper>
                </Pressable>
              );
            })}

            <NeumorphicButton
              radius={16}
              distance={6}
              disabled={!selectedPackage || loading}
              backgroundColor={theme.colors.accent}
              style={styles.ctaButton}
              onPress={handlePurchase}
            >
              <Text style={styles.ctaText}>
                {loading ? 'Processing…' : `Continue — ${selectedPkg}`}
              </Text>
            </NeumorphicButton>

            <View style={styles.footer}>
              <Pressable onPress={handleRestore} disabled={loading}>
                <Text
                  style={[styles.footerLink, { color: theme.colors.textMuted }]}
                >
                  Restore Purchases
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
                    Privacy
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
                    Terms
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  plansContainer: {
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  bestBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bestText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  planSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  planPerWeek: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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

// import React, { useEffect, useState } from 'react';
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
//   Easing,
// } from 'react-native-reanimated';
// import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
// import Squares2X2Icon from 'react-native-heroicons/outline/Squares2X2Icon';
// import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
// import TagIcon from 'react-native-heroicons/outline/TagIcon';
// import PaintBrushIcon from 'react-native-heroicons/outline/PaintBrushIcon';
// import RocketLaunchIcon from 'react-native-heroicons/outline/RocketLaunchIcon';
// import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
// import ArrowUpTrayIcon from 'react-native-heroicons/outline/ArrowUpTrayIcon';
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

// const PRIVACY_URL = 'https://codethenic.com/privacy';
// const TERMS_URL = 'https://codethenic.com/terms';

// export default function PaywallScreen({ navigation }: any) {
//   const { theme } = useTheme();
//   const storeIsPro = useHabitStore(s => s.isPro);
//   const refreshProStatus = useHabitStore(s => s.refreshProStatus);
//   const [ready, setReady] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [offering, setOffering] = useState<any>(null);
//   const [selectedPackage, setSelectedPackage] = useState<any>(null);
//   const [isProUser, setIsProUser] = useState(storeIsPro);
//   const [proExpiration, setProExpiration] = useState<string | null>(null);

//   const cardScale = useSharedValue(0.95);
//   const cardOpacity = useSharedValue(0);

//   useEffect(() => {
//     (async () => {
//       const [offerings, info] = await Promise.all([
//         getOfferings(),
//         getCustomerInfo(),
//       ]);
//       if (offerings?.current) {
//         setOffering(offerings.current);
//         const pkg =
//           offerings.current.annual ||
//           offerings.current.lifetime ||
//           offerings.current.weekly;
//         if (pkg) setSelectedPackage(pkg);
//       }

//       console.log(info);
//       if (isPro(info)) {
//         setIsProUser(true);
//         setProExpiration(getProExpirationDate(info));
//       }
//       setReady(true);
//     })();
//   }, []);

//   useEffect(() => {
//     cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
//     cardOpacity.value = withTiming(1, {
//       duration: 400,
//       easing: Easing.out(Easing.cubic),
//     });
//   }, [ready]);

//   const cardStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: cardScale.value }],
//     opacity: cardOpacity.value,
//   }));

//   const handlePurchase = async () => {
//     if (!selectedPackage || loading) return;
//     setLoading(true);
//     try {
//       const result = await purchasePackage(selectedPackage);
//       if (result) {
//         useHabitStore.setState({ isPro: isPro(result.customerInfo) });
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
//   };

//   const handleRestore = async () => {
//     setLoading(true);
//     try {
//       const info = await restorePurchases();
//       if (info) {
//         useHabitStore.setState({ isPro: isPro(info) });
//         if (isPro(info)) {
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
//   };

//   const handleDismiss = async () => {
//     const info = await getCustomerInfo();
//     if (isPro(info)) {
//       logEvent('info', 'User became pro via paywall');
//       useHabitStore.setState({ isPro: true });
//     }
//     navigation.goBack();
//   };

//   const handleManageSubscription = async () => {
//     await showManageSubscriptions();
//     const info = await getCustomerInfo();
//     useHabitStore.setState({ isPro: isPro(info) });
//     if (!isPro(info)) {
//       navigation.goBack();
//     }
//   };

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

//   if (isProUser) {
//     return (
//       <SafeAreaView
//         style={[styles.container, { backgroundColor: theme.colors.background }]}
//         edges={['bottom']}
//       >
//         <View style={styles.proContainer}>
//           <Animated.View style={cardStyle}>
//             <Raised radius={theme.radii.card} distance={10} style={styles.card}>
//               <View style={styles.header}>
//                 <Text
//                   style={[styles.title, { color: theme.colors.textPrimary }]}
//                 >
//                   Habitic Pro
//                 </Text>
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
//               </View>

//               <View style={styles.proBadgeContainer}>
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
//               </View>

//               <View style={styles.featuresGrid}>
//                 {FEATURES.map((feat, i) => {
//                   const Icon = feat.icon;
//                   return (
//                     <View key={i} style={styles.featureRow}>
//                       <Raised
//                         radius={10}
//                         distance={3}
//                         style={styles.featureIconWrap}
//                       >
//                         <Icon size={16} color={theme.colors.accent} />
//                       </Raised>
//                       <Text
//                         style={[
//                           styles.featureText,
//                           { color: theme.colors.textPrimary },
//                         ]}
//                       >
//                         {feat.label}
//                       </Text>
//                     </View>
//                   );
//                 })}
//               </View>

//               <View
//                 style={[
//                   styles.divider,
//                   { backgroundColor: theme.colors.shadowDark + '80' },
//                 ]}
//               />

//               <NeumorphicButton
//                 radius={16}
//                 distance={6}
//                 backgroundColor={theme.colors.accent}
//                 style={styles.ctaButton}
//                 onPress={handleManageSubscription}
//               >
//                 <Text style={styles.ctaText}>Manage Subscription</Text>
//               </NeumorphicButton>

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
//         <Animated.View style={cardStyle}>
//           <Raised radius={theme.radii.card} distance={10} style={styles.card}>
//             <View style={styles.header}>
//               <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
//                 Habitic Pro
//               </Text>
//               <NeumorphicButton
//                 radius={16}
//                 distance={5}
//                 style={styles.closeButton}
//                 onPress={handleDismiss}
//               >
//                 <Text
//                   style={[styles.closeText, { color: theme.colors.textMuted }]}
//                 >
//                   ✕
//                 </Text>
//               </NeumorphicButton>
//             </View>

//             <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
//               Unlock the full Habitic experience. Support development and get
//               powerful features to supercharge your habit tracking.
//             </Text>

//             <View style={styles.featuresGrid}>
//               {FEATURES.map((feat, i) => {
//                 const Icon = feat.icon;
//                 return (
//                   <View key={i} style={styles.featureRow}>
//                     <Raised
//                       radius={10}
//                       distance={3}
//                       style={styles.featureIconWrap}
//                     >
//                       <Icon size={16} color={theme.colors.accent} />
//                     </Raised>
//                     <Text
//                       style={[
//                         styles.featureText,
//                         { color: theme.colors.textPrimary },
//                       ]}
//                     >
//                       {feat.label}
//                     </Text>
//                   </View>
//                 );
//               })}
//             </View>

//             <View
//               style={[
//                 styles.divider,
//                 { backgroundColor: theme.colors.shadowDark + '80' },
//               ]}
//             />

//             <Text
//               style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}
//             >
//               Choose your plan
//             </Text>

//             {packages.map(({ key, pkg, title, subtitle, best }: any) => {
//               const selected = selectedPackage?.identifier === pkg.identifier;
//               const Wrapper = selected ? Inset : Raised;
//               const price = pkg.product.priceString;
//               const perWeek =
//                 key !== 'lifetime' ? pkg.product.pricePerWeekString : null;
//               return (
//                 <Pressable key={key} onPress={() => setSelectedPackage(pkg)}>
//                   <Wrapper
//                     radius={14}
//                     distance={4}
//                     style={[
//                       styles.planCard,
//                       selected && {
//                         backgroundColor: `${theme.colors.accent}12`,
//                       },
//                     ]}
//                     backgroundColor={
//                       selected ? `${theme.colors.accent}08` : undefined
//                     }
//                   >
//                     {best && (
//                       <View
//                         style={[
//                           styles.bestBadge,
//                           { backgroundColor: theme.colors.accent },
//                         ]}
//                       >
//                         <Text style={styles.bestText}>Best value</Text>
//                       </View>
//                     )}
//                     <Text
//                       style={[
//                         styles.planTitle,
//                         { color: theme.colors.textPrimary },
//                       ]}
//                     >
//                       {title}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.planPrice,
//                         { color: theme.colors.textPrimary },
//                       ]}
//                     >
//                       {price}
//                     </Text>
//                     <Text
//                       style={[
//                         styles.planSubtitle,
//                         { color: theme.colors.textMuted },
//                       ]}
//                     >
//                       {subtitle}
//                     </Text>
//                     {perWeek && (
//                       <Text
//                         style={[
//                           styles.planPerWeek,
//                           { color: theme.colors.textMuted },
//                         ]}
//                       >
//                         {perWeek}/week
//                       </Text>
//                     )}
//                   </Wrapper>
//                 </Pressable>
//               );
//             })}

//             <NeumorphicButton
//               radius={16}
//               distance={6}
//               disabled={!selectedPackage || loading}
//               backgroundColor={theme.colors.accent}
//               style={styles.ctaButton}
//               onPress={handlePurchase}
//             >
//               <Text style={styles.ctaText}>
//                 {loading ? 'Processing…' : `Continue — ${selectedPkg}`}
//               </Text>
//             </NeumorphicButton>

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
//   plansContainer: {
//     gap: 10,
//     marginBottom: 16,
//   },
//   planCard: {
//     padding: 16,
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   bestBadge: {
//     position: 'absolute',
//     top: -8,
//     paddingHorizontal: 12,
//     paddingVertical: 3,
//     borderRadius: 10,
//   },
//   bestText: {
//     color: '#FFFFFF',
//     fontSize: 11,
//     fontWeight: '800',
//   },
//   planTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     marginBottom: 4,
//   },
//   planPrice: {
//     fontSize: 22,
//     fontWeight: '800',
//     marginBottom: 2,
//   },
//   planSubtitle: {
//     fontSize: 13,
//     fontWeight: '500',
//   },
//   planPerWeek: {
//     fontSize: 11,
//     fontWeight: '600',
//     marginTop: 2,
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
