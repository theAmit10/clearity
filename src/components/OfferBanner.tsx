import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from '../i18n';
import {
  isLifetimeOfferActive,
  getLifetimeOfferDaysLeft,
  getLifetimeOfferEndLabel,
  LIFETIME_OFFER_DISCOUNT_PCT,
} from '../services/offerConfig';

/**
 * Subtle Home banner for the scheduled lifetime offer (through local
 * Oct 22, 2026). Static copy only (no per-second tick) — tap opens the
 * paywall, ✕ dismisses for this session only (caller-owned state, never
 * persisted, so the banner returns on next launch).
 * Returns null when the date window is over so it hides with no app update.
 */
export function OfferBanner({
  onPress,
  onClose,
}: {
  onPress: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  if (!isLifetimeOfferActive()) return null;
  const daysLeft = getLifetimeOfferDaysLeft();
  const endLabel = getLifetimeOfferEndLabel();
  const pct = LIFETIME_OFFER_DISCOUNT_PCT;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t('offerBanner.title', { pct })}. ${t('offerBanner.subtitle', { date: endLabel, count: daysLeft })}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('offerBanner.badge')}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {t('offerBanner.title', { pct })}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t('offerBanner.subtitle', { date: endLabel, count: daysLeft })}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('offerBanner.dismiss')}
        hitSlop={12}
        style={styles.close}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E07A2E',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  textWrap: { flex: 1 },
  title: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 1 },
  chevron: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  close: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 4,
    paddingTop: 2,
  },
  closeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '700',
  },
});
