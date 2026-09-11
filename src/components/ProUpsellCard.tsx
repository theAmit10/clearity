import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

/* Subo-style hero banner: brand row (app logo + Habitic Unlimited) over a
 * big two-line headline. Background is a diagonal linear gradient
 * (react-native-svg — no new dependency) tinted with the active theme's
 * accent: richer top-left, deeper bottom-right. Whole banner is a single
 * tap target into the paywall — no button, no price. */

const BASE_BG = '#1B1B1E';
const CARD_RADIUS = 28;

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '');
  const full =
    m.length === 3
      ? m
          .split('')
          .map(c => c + c)
          .join('')
      : m;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return [r, g, b];
}

/** Mix `accent` over `BASE_BG` so the card reads as dark-accent-tinted. */
function mixAccent(accent: string, ratio: number): string {
  const rgb = hexToRgb(accent);
  const base = hexToRgb(BASE_BG)!;
  if (!rgb) return BASE_BG;
  const mix = (a: number, b: number) => Math.round(a * ratio + b * (1 - ratio));
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

  const [stopTop, stopBottom] = useMemo(
    () => [
      mixAccent(theme.colors.accent, 0.45),
      mixAccent(theme.colors.accent, 0.12),
    ],
    [theme.colors.accent],
  );

  // Explicit card size for the gradient: percentage sizes on the SVG root
  // resolve against the parent's measured size, which is unreliable when
  // the parent itself sizes from content (and the SVG is absolute, so it
  // doesn't participate in measurement). Measuring via onLayout is
  // deterministic. The solid backgroundColor keeps the first frame (and
  // any gradient failure) looking correct.
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const gradientReady = cardSize.width > 0 && cardSize.height > 0;

  const line1 = t('settings.proCard.headlineTop');
  const line2 = t('settings.proCard.headlineBottom');
  const a11yLabel = expired
    ? `${line1} ${line2}. ${t('common.renewPro')}`
    : `${line1} ${line2}. ${t('common.upgradeToPro')}`;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setCardSize(prev =>
            prev.width === width && prev.height === height
              ? prev
              : { width, height },
          );
        }}
        style={[styles.card, { backgroundColor: stopBottom }]}
      >
        {gradientReady && (
          <Svg
            style={StyleSheet.absoluteFill}
            width={cardSize.width}
            height={cardSize.height}
          >
            <Defs>
              <LinearGradient id="proCardBg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={stopTop} />
                <Stop offset="1" stopColor={stopBottom} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={cardSize.width}
              height={cardSize.height}
              rx={CARD_RADIUS}
              fill="url(#proCardBg)"
            />
          </Svg>
        )}

        <View style={styles.brandRow}>
          <Image
            source={require('../assets/app-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.brandText}>{t('paywallV2.brand')}</Text>
        </View>

        <View style={styles.headlineWrap}>
          <Text
            style={styles.headlineTop}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="tail"
          >
            {line1}
          </Text>
          <Text
            style={styles.headlineBottom}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            ellipsizeMode="tail"
          >
            {line2}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 24,
    marginHorizontal: -4,
  },
  card: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 56,
  },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    marginRight: 10,
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
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  headlineBottom: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
});
