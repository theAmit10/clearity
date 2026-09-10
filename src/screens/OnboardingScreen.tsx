import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import { useTranslation } from '../i18n';
import { FREE_HABIT_LIMIT } from '../constants/appInfo';

/* Subo-inspired palette — standalone, intentionally independent of ThemeProvider */
const BG = '#140B0A';
const TITLE = '#FFFFFF';
const TITLE_MUTED = '#8D7D76';
const BODY = '#A89890';
const CREAM = '#FFF3E8';
const CREAM_TEXT = '#1A0F0E';
const ACCENT = '#E07A2E';
const GLASS_BG = 'rgba(255,255,255,0.06)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';

export type OnboardingResult = 'completed' | 'skipped';

const CRATERS = [
  { width: 56, height: 56, top: 34, left: 62 },
  { width: 34, height: 34, top: 52, left: 128 },
  { width: 44, height: 44, top: 88, left: 40 },
  { width: 52, height: 52, top: 92, left: 100 },
  { width: 46, height: 46, top: 96, left: 168 },
  { width: 40, height: 40, top: 148, left: 66 },
  { width: 36, height: 36, top: 152, left: 132 },
] as const;

interface Props {
  onFinish: (result: OnboardingResult, atIndex: number) => void;
}

function GlowBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </View>
  );
}

function LogoMark() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoOrange} />
      <View style={styles.logoCream} />
    </View>
  );
}

function PillButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function SkipButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      testID="onboarding-skip"
      onPress={onPress}
      hitSlop={12}
      style={styles.skipHit}
    >
      <Text style={styles.skipText}>{label}</Text>
    </Pressable>
  );
}

function PageTitle({ top, bottom }: { top: string; bottom: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(380)}>
      <Text style={styles.title}>{top}</Text>
      <Text style={[styles.title, styles.titleMuted]}>{bottom}</Text>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [],
  );

  const handlePrimary = useCallback(() => {
    if (index >= 3) {
      onFinish('completed', 3);
    } else {
      goTo(index + 1);
    }
  }, [index, goTo, onFinish]);

  const handleSkip = useCallback(() => {
    onFinish('skipped', index);
  }, [index, onFinish]);

  const pages: React.ReactNode[] = [
    /* ── Page 1: welcome ─────────────────────────────── */
    <View key="p1" style={[styles.page, { width }]}>
      <View style={styles.heroSpacer} />
      <LogoMark />
      <Text style={styles.brand}>{t('onboarding.brand')}</Text>
      <View style={styles.flexSpacer} />
      <PageTitle top={t('onboarding.page1Top')} bottom={t('onboarding.page1Bottom')} />
      <View style={styles.ctaZone}>
        <PillButton
          testID="onboarding-continue"
          label={t('onboarding.getStarted')}
          onPress={handlePrimary}
        />
      </View>
    </View>,

    /* ── Page 2: everything in one place ─────────────── */
    <View key="p2" style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle top={t('onboarding.page2Top')} bottom={t('onboarding.page2Bottom')} />
      <Animated.Text entering={FadeIn.delay(120).duration(320)} style={styles.body}>
        {t('onboarding.page2Body')}
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(200).duration(380)} style={styles.cardsRow}>
        <View style={styles.glassCard}>
          <Text style={styles.cardLabel}>▦  {t('onboarding.today')}</Text>
          <Text style={styles.cardBig}>3/4</Text>
          <View style={styles.cardDivider} />
          <Text style={styles.cardSub}>{t('onboarding.doneToday')}</Text>
        </View>
        <View style={styles.glassCard}>
          <View style={styles.iconCluster}>
            <View style={[styles.clusterDot, styles.dotBlack]}><Text style={styles.clusterGlyph}>✓</Text></View>
            <View style={[styles.clusterDot, styles.dotBlue]}><Text style={styles.clusterGlyph}>≈</Text></View>
            <View style={[styles.clusterDot, styles.dotGreen]}><Text style={styles.clusterGlyph}>♪</Text></View>
            <View style={[styles.clusterDot, styles.dotPink]}><Text style={styles.clusterGlyph}>T</Text></View>
          </View>
          <Text style={styles.cardBig}>
            4 <Text style={styles.cardActive}>{t('onboarding.active')}</Text>
          </Text>
        </View>
      </Animated.View>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        <PillButton
          testID="onboarding-continue"
          label={t('onboarding.continue')}
          onPress={handlePrimary}
        />
      </View>
    </View>,

    /* ── Page 3: stay ahead of streaks ───────────────── */
    <View key="p3" style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle top={t('onboarding.page3Top')} bottom={t('onboarding.page3Bottom')} />
      <Animated.Text entering={FadeIn.delay(120).duration(320)} style={styles.body}>
        {t('onboarding.page3Body')}
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(200).duration(380)} style={styles.upNextWrap}>
        <View style={styles.upNextBadge}>
          <BellAlertIcon size={22} color="#1A0F0E" />
        </View>
        <Text style={styles.upNextTitle}>{t('onboarding.upNext')}</Text>
        <View style={styles.upNextRow}>
          <View style={styles.upNextCard}>
            <View style={styles.upNextHead}>
              <View style={[styles.habitDot, styles.dotBlack]}>
                <Text style={styles.clusterGlyph}>✓</Text>
              </View>
              <Text style={styles.upNextWhen}>• {t('onboarding.example1Meta').split('· ')[1] ?? ''}</Text>
            </View>
            <Text style={styles.upNextName}>{t('onboarding.example1Name')}</Text>
            <Text style={styles.upNextMeta}>{t('onboarding.example1Meta')}</Text>
          </View>
          <View style={styles.upNextCard}>
            <View style={styles.upNextHead}>
              <View style={[styles.habitDot, styles.dotBlue]}>
                <Text style={styles.clusterGlyph}>≈</Text>
              </View>
              <Text style={styles.upNextWhen}>• {t('onboarding.example2Meta').split('· ')[1] ?? ''}</Text>
            </View>
            <Text style={styles.upNextName}>{t('onboarding.example2Name')}</Text>
            <Text style={styles.upNextMeta}>{t('onboarding.example2Meta')}</Text>
          </View>
        </View>
      </Animated.View>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        <PillButton
          testID="onboarding-continue"
          label={t('onboarding.continue')}
          onPress={handlePrimary}
        />
      </View>
    </View>,

    /* ── Page 4: free tier ───────────────────────────── */
    <View key="p4" style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle
        top={t('onboarding.page4Top')}
        bottom={t('onboarding.page4Bottom', { count: FREE_HABIT_LIMIT })}
      />
      <Animated.Text entering={FadeIn.delay(120).duration(320)} style={styles.body}>
        {t('onboarding.page4Body')}
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(200).duration(380)} style={styles.moonWrap}>
        <View style={styles.moon}>
          {CRATERS.map((c, i) => (
            <View key={i} style={[styles.crater, c]} />
          ))}
        </View>
      </Animated.View>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        <PillButton
          testID="onboarding-continue"
          label={t('onboarding.continue')}
          onPress={handlePrimary}
        />
      </View>
    </View>,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <GlowBackground />
      <FlatList
        ref={listRef}
        data={[0, 1, 2, 3]}
        keyExtractor={i => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ index: i }) => <>{pages[i]}</>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  glowTop: {
    position: 'absolute',
    top: -180,
    left: -80,
    right: -80,
    height: 420,
    borderRadius: 999,
    backgroundColor: '#3A1A10',
    opacity: 0.55,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -220,
    left: -100,
    right: -100,
    height: 480,
    borderRadius: 999,
    backgroundColor: '#4A2412',
    opacity: 0.5,
  },
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  heroSpacer: {
    height: '18%',
  },
  topPad: {
    height: '8%',
  },
  flexSpacer: {
    flex: 1,
  },
  logoWrap: {
    alignSelf: 'center',
    width: 150,
    height: 110,
    marginBottom: 10,
  },
  logoOrange: {
    position: 'absolute',
    right: 18,
    top: 10,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ACCENT,
  },
  logoCream: {
    position: 'absolute',
    left: 14,
    top: 0,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(232,220,208,0.92)',
  },
  brand: {
    textAlign: 'center',
    color: TITLE,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1,
  },
  title: {
    textAlign: 'center',
    color: TITLE,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  titleMuted: {
    color: TITLE_MUTED,
  },
  body: {
    textAlign: 'center',
    color: BODY,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 44,
  },
  glassCard: {
    flex: 1,
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 168,
    justifyContent: 'center',
  },
  cardLabel: {
    color: BODY,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBig: {
    color: TITLE,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  cardActive: {
    fontSize: 16,
    fontWeight: '600',
    color: BODY,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 12,
  },
  cardSub: {
    color: BODY,
    fontSize: 13,
    fontWeight: '600',
  },
  iconCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 44,
  },
  clusterDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    borderWidth: 2,
    borderColor: 'rgba(20,11,10,0.9)',
  },
  dotBlack: {
    backgroundColor: '#111111',
  },
  dotBlue: {
    backgroundColor: '#3B82C4',
  },
  dotGreen: {
    backgroundColor: '#4CAF7D',
  },
  dotPink: {
    backgroundColor: '#C83E8B',
  },
  clusterGlyph: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  upNextWrap: {
    marginTop: 44,
    backgroundColor: GLASS_BG,
    borderColor: GLASS_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  upNextBadge: {
    position: 'absolute',
    top: -22,
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextTitle: {
    color: TITLE,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  upNextRow: {
    flexDirection: 'row',
    gap: 12,
  },
  upNextCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  upNextHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  habitDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextWhen: {
    color: BODY,
    fontSize: 12,
    fontWeight: '700',
  },
  upNextName: {
    color: TITLE,
    fontSize: 16,
    fontWeight: '700',
  },
  upNextMeta: {
    color: BODY,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  moonWrap: {
    alignItems: 'center',
    marginTop: 44,
  },
  moon: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
  },
  crater: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
  },
  ctaZone: {
    gap: 18,
    paddingBottom: 8,
  },
  skipHit: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: BODY,
    fontSize: 19,
    fontWeight: '600',
  },
  pill: {
    backgroundColor: CREAM,
    borderRadius: 32,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillText: {
    color: CREAM_TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
});
