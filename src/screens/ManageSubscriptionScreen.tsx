import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
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
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import ArrowUpTrayIcon from 'react-native-heroicons/outline/ArrowUpTrayIcon';
import RocketLaunchIcon from 'react-native-heroicons/outline/RocketLaunchIcon';
import { useTheme } from '../theme/ThemeProvider';
import {
  getCustomerInfo,
  getProExpirationDate,
  isPro,
  restorePurchases,
  showManageSubscriptions,
} from '../services/revenueCat';
import { useHabitStore } from '../store/habitStore';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';

const FEATURES = [
  { icon: ChartBarIcon, label: 'Full analytics dashboard' },
  { icon: Squares2X2Icon, label: 'iOS home screen widget' },
  { icon: SparklesIcon, label: 'Unlimited habits' },
  { icon: TagIcon, label: 'Custom categories' },
  { icon: PaintBrushIcon, label: 'Premium themes' },
  { icon: BellAlertIcon, label: 'Multiple reminders per habit' },
  { icon: ArrowUpTrayIcon, label: 'Export & import data' },
  { icon: RocketLaunchIcon, label: 'Early access to new features' },
];

export default function ManageSubscriptionScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proExpiration, setProExpiration] = useState<string | null>(null);

  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    (async () => {
      const info = await getCustomerInfo();
      if (isPro(info)) {
        setProExpiration(getProExpirationDate(info));
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

  const handleManage = async () => {
    setLoading(true);
    try {
      await showManageSubscriptions();
      const info = await getCustomerInfo();
      useHabitStore.setState({ isPro: isPro(info) });
      if (!isPro(info)) {
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
      if (info) {
        useHabitStore.setState({ isPro: isPro(info) });
        if (isPro(info)) {
          Alert.alert('Restore Complete', 'Your Pro subscription has been restored.');
          setProExpiration(getProExpirationDate(info));
        } else {
          Alert.alert('No Purchases Found', 'No previous purchases could be restored.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    navigation.goBack();
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

            <View style={styles.proBadgeContainer}>
              <View style={[styles.proBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.proBadgeText}>ACTIVE</Text>
              </View>
              <Text style={[styles.proTitle, { color: theme.colors.textPrimary }]}>
                You're a Pro user!
              </Text>
              <Text style={[styles.proSubtitle, { color: theme.colors.textMuted }]}>
                You have access to all premium features.
              </Text>
              {proExpiration && (
                <Text style={[styles.proExpiration, { color: theme.colors.textMuted }]}>
                  Expires: {new Date(proExpiration).toLocaleDateString()}
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
              onPress={handleManage}
            >
              <Text style={styles.ctaText}>
                {loading ? 'Opening…' : 'Manage in App Store'}
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
});
