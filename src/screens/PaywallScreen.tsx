import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
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
import { getOfferings, purchasePackage, restorePurchases, isPro, getCustomerInfo } from '../services/revenueCat';
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
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const offerings = await getOfferings();
      if (offerings?.current) {
        setOffering(offerings.current);
        const pkg = offerings.current.annual || offerings.current.lifetime || offerings.current.weekly;
        if (pkg) setSelectedPackage(pkg);
      }
      setReady(true);
    })();
  }, []);

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
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const info = await restorePurchases();
      if (isPro(info)) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  const packages = [
    offering?.weekly && { key: 'weekly', pkg: offering.weekly, title: 'Weekly', subtitle: 'per week' },
    offering?.annual && { key: 'annual', pkg: offering.annual, title: 'Yearly', subtitle: 'per year', best: true },
    offering?.lifetime && { key: 'lifetime', pkg: offering.lifetime, title: 'Lifetime', subtitle: 'one-time' },
  ].filter(Boolean) as any[];

  const selectedPkg = selectedPackage?.product?.priceString || '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={cardStyle}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Habitic Pro
            </Text>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={[styles.closeText, { color: theme.colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Unlock the full Habitic experience. Support development and get powerful features to supercharge your habit tracking.
          </Text>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIconWrap, { backgroundColor: `${theme.colors.accent}18` }]}>
                    <Icon size={16} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.featureText, { color: theme.colors.textPrimary }]}>
                    {feat.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Choose your plan
          </Text>

          {packages.map(({ key, pkg, title, subtitle, best }: any) => {
            const selected = selectedPackage?.identifier === pkg.identifier;
            const price = pkg.product.priceString;
            const perWeek = key !== 'lifetime' ? pkg.product.pricePerWeekString : null;
            return (
              <Pressable key={key} onPress={() => setSelectedPackage(pkg)}>
                <View
                  style={[
                    styles.planCard,
                    { backgroundColor: theme.colors.surface },
                    selected && {
                      borderColor: theme.colors.accent,
                      backgroundColor: `${theme.colors.accent}08`,
                    },
                    !selected && { borderColor: 'transparent' },
                  ]}
                >
                  {best && (
                    <View style={[styles.bestBadge, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.bestText}>Best value</Text>
                    </View>
                  )}
                  <Text style={[styles.planTitle, { color: theme.colors.textPrimary }]}>
                    {title}
                  </Text>
                  <Text style={[styles.planPrice, { color: theme.colors.textPrimary }]}>
                    {price}
                  </Text>
                  <Text style={[styles.planSubtitle, { color: theme.colors.textMuted }]}>
                    {subtitle}
                  </Text>
                  {perWeek && (
                    <Text style={[styles.planPerWeek, { color: theme.colors.textMuted }]}>
                      {perWeek}/week
                    </Text>
                  )}
                </View>
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
              <Text style={[styles.footerLink, { color: theme.colors.textMuted }]}>
                Restore Purchases
              </Text>
            </Pressable>
            <View style={styles.footerRow}>
              <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={[styles.footerLinkSmall, { color: theme.colors.textMuted }]}>
                  Privacy
                </Text>
              </Pressable>
              <Text style={[styles.footerDot, { color: theme.colors.textMuted }]}>·</Text>
              <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={[styles.footerLinkSmall, { color: theme.colors.textMuted }]}>
                  Terms
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  planCard: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 10,
  },
  bestBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 14,
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
    fontSize: 24,
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
    marginTop: 8,
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
