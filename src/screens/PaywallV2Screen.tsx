import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import ChartBarIcon from 'react-native-heroicons/outline/ChartBarIcon';
import Squares2X2Icon from 'react-native-heroicons/outline/Squares2X2Icon';
import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
import TagIcon from 'react-native-heroicons/outline/TagIcon';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import CubeIcon from 'react-native-heroicons/outline/CubeIcon';
import {
  getCustomerInfo,
  isPro,
  getProExpirationDate,
  purchasePackage,
  restorePurchases,
  showManageSubscriptions,
} from '../services/revenueCat';
import { useHabitStore } from '../store/habitStore';
import { usePaywallPricing } from '../hooks/usePaywallPricing';
import { logEvent } from '../services/logger';
import { useTranslation } from '../i18n';

const PRIVACY_URL = 'https://theamit10.github.io/habitic-legal/privacy-policy';
const TERMS_URL =
  'https://theamit10.github.io/habitic-legal/TERMS_AND_CONDITIONS';

const ACCENT = '#E07A2E';
const HERO_BG = '#3E2314';
const SHEET_BG = '#F2F2F7';

export default function PaywallV2Screen({ navigation, route }: any) {
  const { t } = useTranslation();
  const storeIsPro = useHabitStore(s => s.isPro);
  const storeProExpired = useHabitStore(s => s.proExpired);
  const refreshProStatus = useHabitStore(s => s.refreshProStatus);
  const habits = useHabitStore(s => s.habits);

  const [loading, setLoading] = useState(false);
  const [remoteIsPro, setRemoteIsPro] = useState(false);
  const [proExpiration, setProExpiration] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const {
    weeklyPkg,
    annualPkg,
    lifetimePkg,
    selectedPackage,
    setSelectedPackage,
    pricingState,
    loadPricing,
    annualStrike,
    annualSavingsPct,
    lifetimeStrike,
  } = usePaywallPricing();

  const isProUser = storeIsPro || remoteIsPro;
  const expiredMode =
    !isProUser && (route?.params?.mode === 'expired' || storeProExpired);

  useEffect(() => {
    (async () => {
      try {
        const info = await getCustomerInfo();
        setProExpiration(getProExpirationDate(info));
        if (isPro(info)) setRemoteIsPro(true);
      } catch (err) {
        logEvent('error', 'PaywallV2: failed to load status', {
          error: String(err),
        });
      }
      if (typeof refreshProStatus === 'function') refreshProStatus();
    })();
  }, [refreshProStatus]);

  const stats = useMemo(() => {
    const active = habits.filter(h => !h.archived);
    const checkIns = habits.reduce(
      (sum, h) =>
        sum +
        Object.values(h.completions || {}).reduce(
          (s, v) => s + (typeof v === 'number' ? v : v ? 1 : 0),
          0,
        ),
      0,
    );
    return { habitCount: active.length, checkIns };
  }, [habits]);

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
        Alert.alert(t('paywall.welcomeTitle'), t('paywall.welcomeBody'));
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
        logEvent('info', 'User became pro via paywall v2');
        useHabitStore.setState({ isPro: true, proExpired: false });
      }
    } catch (err) {
      logEvent('error', 'PaywallV2: dismiss status check failed', {
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
      if (!nowPro) navigation.goBack();
    } catch (err) {
      logEvent('error', 'PaywallV2: manage-subscription check failed', {
        error: String(err),
      });
    }
  }, [navigation]);

  if (isProUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: '#FFFFFF' }]}
        edges={['bottom']}
      >
        <View style={styles.proWrap}>
          <Text style={styles.proTitle}>{t('paywall.youArePro')}</Text>
          <Text style={styles.proBody}>{t('paywall.youHaveAccess')}</Text>
          {proExpiration && (
            <Text style={styles.proBody}>
              {t('paywall.expires', {
                date: new Date(proExpiration).toLocaleDateString(),
              })}
            </Text>
          )}
          <Pressable style={styles.ctaBlack} onPress={handleManageSubscription}>
            <Text style={styles.ctaBlackText}>
              {t('common.manageSubscription')}
            </Text>
          </Pressable>
          <Pressable style={styles.restoreWhite} onPress={handleRestore}>
            <Text style={styles.restoreWhiteText}>
              {t('common.restorePurchases')}
            </Text>
          </Pressable>
          <Pressable onPress={handleDismiss}>
            <Text style={styles.linkText}>✕ {t('common.cancel')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const selectedId = selectedPackage?.identifier;
  const isLifetime = selectedId === lifetimePkg?.identifier;
  const isAnnual = selectedId === annualPkg?.identifier;
  const ctaLabel = isAnnual
    ? t('paywallV2.unlockYearly')
    : selectedId === weeklyPkg?.identifier
    ? t('paywallV2.unlockWeekly')
    : t('paywallV2.unlockForever');
  const ctaNote = isAnnual
    ? t('paywallV2.perYearNote')
    : selectedId === weeklyPkg?.identifier
    ? t('paywallV2.perWeekNote')
    : t('paywallV2.oneTimeNote');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.brand}>◐ {t('paywallV2.brand')}</Text>
            <Pressable
              onPress={handleDismiss}
              style={styles.closeCircle}
              accessibilityLabel="Close"
            >
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.headline}>{t('paywallV2.headlineTop')}</Text>
          <Text style={[styles.headline, styles.headlineMuted]}>
            {t('paywallV2.headlineBottom')}
          </Text>
        </View>

        {/* Personalized proof */}
        <View style={styles.proofSection}>
          <Text style={styles.proofTitle}>{t('paywallV2.takingShape')}</Text>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.habitCount}</Text>
              <Text style={styles.statLabel}>{t('paywallV2.habits')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.checkIns.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>{t('paywallV2.checkIns')}</Text>
            </View>
          </View>
          <Text style={styles.proofBody}>
            {expiredMode
              ? t('paywall.expiredSubtitle')
              : t('paywallV2.unlockBody')}
          </Text>
          {expiredMode && proExpiration && (
            <Text style={styles.proofBody}>
              {t('paywall.expiredOn', {
                date: new Date(proExpiration).toLocaleDateString(),
              })}
            </Text>
          )}
        </View>

        {/* Plans */}
        <View style={styles.sheet}>
          {pricingState === 'loading' && (
            <View style={styles.centerPad}>
              <ActivityIndicator color={ACCENT} />
              <Text style={styles.muted}>{t('paywall.loadingPlans')}</Text>
            </View>
          )}
          {pricingState === 'error' && (
            <View style={styles.centerPad}>
              <Text style={styles.mutedCenter}>
                {t('paywall.pricingError')}
              </Text>
              <Pressable style={styles.retryBtn} onPress={loadPricing}>
                <Text style={styles.ctaBlackText}>{t('paywall.tryAgain')}</Text>
              </Pressable>
            </View>
          )}
          {pricingState === 'ready' && (
            <>
              {lifetimePkg && (
                <PlanOption
                  selected={isLifetime}
                  title={t('paywallV2.foreverPass')}
                  extra=" ∞"
                  price={lifetimePkg.product.priceString}
                  subtitle={t('paywallV2.foreverSub')}
                  strike={lifetimeStrike}
                  bullets={[
                    t('paywallV2.fullAccessForever'),
                    t('paywallV2.futureUpdates'),
                  ]}
                  footnote={t('paywallV2.familySharing')}
                  onSelect={() => setSelectedPackage(lifetimePkg)}
                />
              )}

              <Pressable
                style={styles.expander}
                onPress={() => setShowAlternatives(v => !v)}
              >
                <Text style={styles.expanderText}>
                  {t('paywallV2.notReadyYet')}
                </Text>
                <Text style={styles.expanderChevron}>
                  {showAlternatives ? '︿' : '﹀'}
                </Text>
              </Pressable>

              {showAlternatives && (
                <>
                  {annualPkg && (
                    <PlanOption
                      selected={isAnnual}
                      title={t('paywallV2.yearAccess')}
                      price={annualPkg.product.priceString}
                      subtitle={t('paywallV2.yearSub')}
                      strike={annualStrike}
                      savingsPct={annualSavingsPct}
                      onSelect={() => setSelectedPackage(annualPkg)}
                    />
                  )}
                  {weeklyPkg && (
                    <PlanOption
                      selected={selectedId === weeklyPkg.identifier}
                      title={t('paywallV2.weekAccess')}
                      price={weeklyPkg.product.priceString}
                      subtitle={t('paywallV2.weekSub')}
                      onSelect={() => setSelectedPackage(weeklyPkg)}
                    />
                  )}
                </>
              )}

              {/* What's included */}
              <View style={styles.includedCard}>
                <View style={styles.includedHeader}>
                  <View style={styles.includedLine} />
                  <Text style={styles.includedTitle}>
                    {t('paywallV2.whatsIncluded')}
                  </Text>
                  <View style={styles.includedLine} />
                </View>
                <IncludedRow
                  bg="#FDEBD9"
                  color={ACCENT}
                  Icon={SparklesIcon}
                  title={t('paywallV2.incUnlimitedTitle')}
                  body={t('paywallV2.incUnlimitedBody')}
                />
                <IncludedRow
                  bg="#E3ECFF"
                  color="#3B82F6"
                  Icon={Squares2X2Icon}
                  title={t('paywallV2.incWidgetsTitle')}
                  body={t('paywallV2.incWidgetsBody')}
                />
                <IncludedRow
                  bg="#E6F6EC"
                  color="#22A06B"
                  Icon={ChartBarIcon}
                  title={t('paywallV2.incAnalyticsTitle')}
                  body={t('paywallV2.incAnalyticsBody')}
                />
                <IncludedRow
                  bg="#EDE9FE"
                  color="#7C6CF0"
                  Icon={TagIcon}
                  title={t('paywallV2.incCategoriesTitle')}
                  body={t('paywallV2.incCategoriesBody')}
                />
                <IncludedRow
                  bg="#FFE9EC"
                  color="#E14D5A"
                  Icon={BellAlertIcon}
                  title={t('paywallV2.incRemindersTitle')}
                  body={t('paywallV2.incRemindersBody')}
                />
                <IncludedRow
                  bg="#F3E8FF"
                  color="#A855F7"
                  Icon={CubeIcon}
                  title={t('paywallV2.incUpdatesTitle')}
                  body={t('paywallV2.incUpdatesBody')}
                />
              </View>

              {/* Founder note (no star rating by request) */}
              <View style={styles.founder}>
                <Text style={styles.founderTitle}>
                  {t('paywallV2.founderTitle')}
                </Text>
                <Text style={styles.founderBody}>
                  {t('paywallV2.founderBody')}
                </Text>
              </View>

              <View style={styles.legalRow}>
                <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text style={styles.legalLink}>{t('paywall.privacy')}</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text style={styles.legalLink}>{t('paywall.terms')}</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.restoreWhite}
                onPress={handleRestore}
                disabled={loading}
              >
                <Text style={styles.restoreWhiteText}>
                  {t('common.restorePurchases')}
                </Text>
              </Pressable>
              {/* spacer so content clears the sticky CTA */}
              <View style={{ height: 132 }} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {pricingState === 'ready' && (
        <SafeAreaView edges={['bottom']} style={styles.stickyWrap}>
          <Pressable
            style={[
              styles.ctaBlack,
              (!selectedPackage || loading) && { opacity: 0.6 },
            ]}
            onPress={handlePurchase}
            disabled={!selectedPackage || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaBlackText}>{ctaLabel}</Text>
            )}
          </Pressable>
          <Text style={styles.ctaNote}>{ctaNote}</Text>
          {!isLifetime && lifetimePkg && (
            <Text style={styles.ctaHint}>
              {t('paywallV2.foreverSub')} {lifetimePkg.product.priceString}
            </Text>
          )}
        </SafeAreaView>
      )}
    </View>
  );
}

function PlanOption({
  selected,
  title,
  extra,
  price,
  subtitle,
  strike,
  savingsPct,
  bullets,
  footnote,
  onSelect,
}: {
  selected: boolean;
  title: string;
  extra?: string;
  price: string;
  subtitle: string;
  strike?: string | null;
  savingsPct?: number | null;
  bullets?: string[];
  footnote?: string;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.planCard,
        selected ? styles.planSelected : styles.planUnselected,
      ]}
    >
      <View style={styles.planTopRow}>
        <View style={styles.planTitleRow}>
          <View
            style={[styles.radio, selected ? styles.radioOn : styles.radioOff]}
          >
            {selected && <Text style={styles.radioCheck}>✓</Text>}
          </View>
          <Text style={styles.planTitle}>
            {title}
            {extra ? <Text style={styles.planExtra}>{extra}</Text> : null}
          </Text>
        </View>
        <Text style={styles.planPrice}>{price}</Text>
      </View>
      {savingsPct ? (
        <Text style={styles.planSavings}>
          SAVE {savingsPct}%{strike ? ` · ${strike}` : ''}
        </Text>
      ) : strike ? (
        <Text style={styles.planStrike}>{strike}</Text>
      ) : null}
      <Text style={styles.planSub}>{subtitle}</Text>
      {bullets?.map(b => (
        <View key={b} style={styles.bulletRow}>
          <Text style={styles.bulletCheck}>✓</Text>
          <Text style={styles.bulletText}>{b}</Text>
        </View>
      ))}
      {!!footnote && <Text style={styles.planFootnote}>👥 {footnote}</Text>}
    </Pressable>
  );
}

function IncludedRow({
  bg,
  color,
  Icon,
  title,
  body,
}: {
  bg: string;
  color: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.includedRow}>
      <View style={[styles.includedIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.includedTextWrap}>
        <Text style={styles.includedItemTitle}>{title}</Text>
        <Text style={styles.includedItemBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHEET_BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 8 },
  hero: {
    backgroundColor: HERO_BG,
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 42,
  },
  brand: { color: '#F5D9C4', fontSize: 20, fontWeight: '700' },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CBB9AC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: { fontSize: 18, fontWeight: '700', color: '#3E2314' },
  headline: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  headlineMuted: { color: '#E8C9B3', marginTop: 2 },
  proofSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  proofTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
  },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#F4F2EC',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 14, color: '#8A8A8E', marginTop: 2 },
  proofBody: { fontSize: 16, color: '#8A8A8E', lineHeight: 22, marginTop: 14 },
  sheet: { paddingHorizontal: 16, paddingTop: 18 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  planSelected: { borderColor: ACCENT },
  planUnselected: { borderColor: '#FFFFFF' },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: ACCENT },
  radioOff: {
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    backgroundColor: '#FFF',
  },
  radioCheck: { color: '#FFF', fontWeight: '800' },
  planTitle: { fontSize: 19, fontWeight: '800', color: '#111' },
  planExtra: { color: '#8A8A8E', fontWeight: '400' },
  planPrice: { fontSize: 20, fontWeight: '800', color: '#111' },
  planSub: { color: '#8A8A8E', fontSize: 15, marginTop: 6 },
  planStrike: {
    color: '#8A8A8E',
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  planSavings: { color: ACCENT, fontSize: 12, fontWeight: '800', marginTop: 6 },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  bulletCheck: { color: '#B9B9BE', fontSize: 18, fontWeight: '700' },
  bulletText: { fontSize: 16, color: '#111' },
  planFootnote: { fontSize: 15, color: '#111', marginTop: 12 },
  expander: {
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  expanderText: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  expanderChevron: { color: '#8A8A8E', fontSize: 14 },
  includedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 20,
    marginTop: 10,
  },
  includedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  includedLine: { flex: 1, height: 1, backgroundColor: '#E5E5EA' },
  includedTitle: { fontSize: 19, fontWeight: '800', color: '#111' },
  includedRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  includedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includedTextWrap: { flex: 1 },
  includedItemTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  includedItemBody: {
    fontSize: 14,
    color: '#8A8A8E',
    lineHeight: 20,
    marginTop: 2,
  },
  founder: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 30 },
  founderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  founderBody: {
    fontSize: 16,
    color: '#8A8A8E',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 6,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 14,
  },
  legalLink: { fontSize: 15, color: '#111', textDecorationLine: 'underline' },
  restoreWhite: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  restoreWhiteText: { fontSize: 17, fontWeight: '700', color: '#111' },
  stickyWrap: {
    backgroundColor: SHEET_BG,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  ctaBlack: {
    backgroundColor: '#111',
    borderRadius: 30,
    paddingVertical: 19,
    alignItems: 'center',
  },
  ctaBlackText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  ctaNote: { textAlign: 'center', fontSize: 14, color: '#111', marginTop: 10 },
  ctaHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8A8A8E',
    marginTop: 4,
  },
  centerPad: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  muted: { color: '#8A8A8E', fontSize: 14, fontWeight: '600' },
  mutedCenter: {
    color: '#8A8A8E',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#111',
    borderRadius: 20,
    paddingHorizontal: 26,
    paddingVertical: 12,
    marginTop: 8,
  },
  proWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  proTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  proBody: { fontSize: 15, color: '#666', textAlign: 'center' },
  linkText: { fontSize: 14, color: '#666', marginTop: 8 },
});
