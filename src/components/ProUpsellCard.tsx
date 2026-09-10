import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

/* Subo-style hero banner: brand row (overlapping circles + Habitic
 * Unlimited) over a big two-line headline. The card stays dark in every
 * theme but is tinted with the active theme's accent color. Whole banner
 * is a single tap target into the paywall — no button, no price. */

const BASE_BG = '#1B1B1E';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  const full =
    m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

/** Mix `accent` over `BASE_BG` so the card reads as dark-accent-tinted. */
function tintedCardBg(accent: string, ratio = 0.28): string {
  const rgb = hexToRgb(accent);
  const base = hexToRgb(BASE_BG)!;
  if (!rgb) return BASE_BG;
  const mix = (a: number, b: number) =>
    Math.round(a * ratio + b * (1 - ratio));
  return `rgb(${mix(rgb[0], base[0])}, ${mix(rgb[1], base[1])}, ${mix(
    rgb[2],
    base[2],
  )})`;
}

export function ProUpsellCard({
  expired,
  onPress,
}: {
  expired?: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const cardBg = useMemo(
    () => tintedCardBg(theme.colors.accent),
    [theme.colors.accent],
  );

  const line1 = t('paywallV2.headlineTop');
  const line2 = t('paywallV2.headlineBottom');
  const a11yLabel = expired
    ? `${line1} ${line2}. ${t('common.renewPro')}`
    : `${line1} ${line2}. ${t('common.upgradeToPro')}`;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={[styles.card, { backgroundColor: cardBg }]}
      >
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <View
              style={[styles.circle, { backgroundColor: theme.colors.accent }]}
            />
            <View
              style={[
                styles.circle,
                styles.circleOverlap,
                { backgroundColor: `${theme.colors.accent}8C` },
              ]}
            />
          </View>
          <Text style={styles.brandText}>{t('paywallV2.brand')}</Text>
        </View>

        <View style={styles.headlineWrap}>
          <Text style={styles.headlineTop}>{line1}</Text>
          <Text style={styles.headlineBottom}>{line2}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 56,
  },
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  circleOverlap: {
    marginLeft: -12,
  },
  brandText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 20,
    fontWeight: '600',
  },
  headlineWrap: {
    gap: 2,
  },
  headlineTop: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 37,
  },
  headlineBottom: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 37,
  },
});
