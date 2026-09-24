import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  RadialGradient,
  Circle,
} from 'react-native-svg';
import BellAlertIcon from 'react-native-heroicons/outline/BellAlertIcon';
import { useTranslation } from '../i18n';
import { FREE_HABIT_LIMIT, FREE_GOAL_LIMIT } from '../constants/appInfo';

/* Subo-inspired palette — standalone, intentionally independent of ThemeProvider */
// const BG_TOP = '#080607';
// const BG = '#140B0A';
// const TITLE = '#FFFFFF';
// const TITLE_MUTED = '#8D7D76';
// const BODY = '#A89890';
// const CREAM = '#FFF3E8';
// const CREAM_TEXT = '#1A0F0E';
// const ACCENT = '#E07A2E';
// const GLASS_BG = 'rgba(255,255,255,0.06)';
// const GLASS_BORDER = 'rgba(255,255,255,0.12)';

// const BG_TOP = 'white';
// const BG = '#140B0A';
// const TITLE = '#FFFFFF';
// const TITLE_MUTED = '#8D7D76';
// const BODY = '#A89890';
// const CREAM = '#FFF3E8';
// const CREAM_TEXT = '#1A0F0E';
// const ACCENT = '#E07A2E';
// const GLASS_BG = 'rgba(255,255,255,0.06)';
// const GLASS_BORDER = 'rgba(255,255,255,0.12)';

// Background
const BG_TOP = '#F4F5F7'; // light neumorphic gray — matches Home/Settings
const BG = '#0F1410'; // deep near-black with a soft green undertone

// Text
const TITLE = '#FFFFFF'; // headline on dark
const TITLE_MUTED = '#93A399'; // muted sage-gray for secondary headline text
const BODY = '#A9B3AC'; // body copy on dark, cool and legible

// Light surface (cards, sheets, "cream" replacement)
const CREAM = '#F4F5F7'; // same light gray as your app surfaces
const CREAM_TEXT = '#1C1C1E'; // matches Home/Settings text exactly

// Accent
const ACCENT = '#34C759'; // your streak-flame / checkmark green
const ACCENT_SOFT = 'rgba(52,199,89,0.14)'; // for glows, highlighted rows, progress fills

// Light-mode ink (pages 2+3 sit on a pale green gradient, so pure white text
// and white-glass cards wash out — these give AA contrast on light).
const TITLE_DARK = '#14201A';
const BODY_DARK = '#4C5C52';
const LIGHT_CARD_BG = '#FFFFFF';
const LIGHT_CARD_BG_SOFT = 'rgba(255,255,255,0.94)';
const LIGHT_CARD_BORDER = '#DFEAE2';
const LIGHT_DIVIDER = '#E2ECE4';
const LIGHT_LABEL = '#5F6F64';

// Glass / overlay (legacy dark-mode tokens — kept for p1/p4, unused by p2/p3 now)
// const GLASS_BG = 'rgba(52,199,89,0.14)';
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

// function GradientBackground() {
//   return (
//     <View style={StyleSheet.absoluteFill} pointerEvents="none">
//       <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
//         <Defs>
//           <LinearGradient id="suboBg" x1="0" y1="0" x2="0" y2="1">
//             <Stop offset="0" stopColor="#080607" stopOpacity="1" />
//             <Stop offset="0.35" stopColor="#140B0A" stopOpacity="1" />
//             <Stop offset="0.7" stopColor="#2A1511" stopOpacity="1" />
//             <Stop offset="1" stopColor="#3E221A" stopOpacity="1" />
//           </LinearGradient>
//         </Defs>
//         <Rect x="0" y="0" width="100%" height="100%" fill="url(#suboBg)" />
//       </Svg>
//     </View>
//   );
// }

function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="suboBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F1F7F2" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#DCEEE0" stopOpacity="1" />
            <Stop offset="1" stopColor="#BFE0C7" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="accentGlow" cx="50%" cy="12%" r="65%">
            <Stop offset="0" stopColor="#34C759" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#34C759" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#suboBg)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#accentGlow)" />
      </Svg>
    </View>
  );
}

// function GradientBackground() {
//   return (
//     <View style={StyleSheet.absoluteFill} pointerEvents="none">
//       <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
//         <Defs>
//           {/* Base premium gradient — matches the "Habitic Unlimited" card */}
//           <LinearGradient id="suboBg" x1="0" y1="0" x2="0" y2="1">
//             <Stop offset="0" stopColor="#0A0807" stopOpacity="1" />
//             <Stop offset="0.4" stopColor="#1C0F0C" stopOpacity="1" />
//             <Stop offset="0.72" stopColor="#331B14" stopOpacity="1" />
//             <Stop offset="1" stopColor="#4A241A" stopOpacity="1" />
//           </LinearGradient>

//           {/* Subtle green glow to tie back to the brand accent */}
//           <RadialGradient id="accentGlow" cx="50%" cy="15%" r="65%">
//             <Stop offset="0" stopColor="#3ED96B" stopOpacity="0.16" />
//             <Stop offset="1" stopColor="#3ED96B" stopOpacity="0" />
//           </RadialGradient>
//         </Defs>

//         <Rect x="0" y="0" width="100%" height="100%" fill="url(#suboBg)" />
//         <Rect x="0" y="0" width="100%" height="100%" fill="url(#accentGlow)" />
//       </Svg>
//     </View>
//   );
// }

function PillButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
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

function SkipButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
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

function Reveal({
  delay = 0,
  duration = 380,
  active = true,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  active?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <Animated.View
      // Changing key on active/index (set by callers) remounts and replays.
      entering={active ? FadeInDown.delay(delay).duration(duration) : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

function RevealText({
  delay = 0,
  duration = 340,
  active = true,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  active?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <Animated.Text
      entering={active ? FadeIn.delay(delay).duration(duration) : undefined}
      style={style}
    >
      {children}
    </Animated.Text>
  );
}

function GradientDot({
  size = 38,
  from,
  to,
  id,
  glyph,
}: {
  size?: number;
  from: string;
  to: string;
  id: string;
  glyph: string;
}) {
  const radius = size / 2;
  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: to,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#0F2418',
        shadowOpacity: 0.22,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.95)',
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${id})`} />
      </Svg>
      {/* glossy highlight */}
      <View
        pointerEvents="none"
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          position: 'absolute',
          top: size * 0.08,
          left: size * 0.16,
          width: size * 0.5,
          height: size * 0.26,
          borderRadius: size * 0.2,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
      <Text
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          color: '#FFFFFF',
          fontSize: size * 0.4,
          fontWeight: '800',
        }}
      >
        {glyph}
      </Text>
    </View>
  );
}

function PageTitle({
  top,
  bottom,
  delay = 0,
  active = true,
  dark = false,
}: {
  top: string;
  bottom: string;
  delay?: number;
  active?: boolean;
  dark?: boolean;
}) {
  return (
    <Animated.View
      entering={active ? FadeInDown.delay(delay).duration(400) : undefined}
    >
      <Text style={[styles.title, dark && styles.titleDark]}>{top}</Text>
      <RevealText
        delay={delay + 60}
        duration={360}
        active={active}
        style={[styles.title, dark ? styles.titleDarkMuted : styles.titleMuted]}
      >
        {bottom}
      </RevealText>
    </Animated.View>
  );
}

export default function OnboardingScreen({ onFinish }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((next: number) => {
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, []);

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

  const isActive = (i: number) => i === index;
  // Key suffix flips between "on-<index>" and "off" so the active page
  // remounts on every landing and its `entering` animations replay.
  const pageKey = (i: number, tag: string) =>
    `${tag}-${isActive(i) ? `on-${index}` : 'off'}`;

  const pages: React.ReactNode[] = [
    /* ── Page 1: welcome ─────────────────────────────── */
    <View key={pageKey(0, 'p1')} style={[styles.page, { width }]}>
      <View style={styles.heroSpacer} />
      <Animated.View
        key={pageKey(0, 'p1-logo')}
        entering={isActive(0) ? ZoomIn.delay(0).duration(450) : undefined}
      >
        <Image
          source={require('../assets/app-logo.png')}
          style={styles.heroLogo}
          resizeMode="contain"
        />
      </Animated.View>
      <RevealText
        key={pageKey(0, 'p1-brand')}
        delay={80}
        duration={340}
        active={isActive(0)}
        style={styles.brand}
      >
        {t('onboarding.brand')}
      </RevealText>
      <View style={styles.flexSpacer} />
      <PageTitle
        key={pageKey(0, 'p1-title')}
        top={t('onboarding.page1Top')}
        bottom={t('onboarding.page1Bottom')}
        delay={160}
        active={isActive(0)}
      />
      <View style={styles.ctaZone}>
        <Reveal key={pageKey(0, 'p1-cta')} delay={320} active={isActive(0)}>
          <PillButton
            testID="onboarding-continue"
            label={t('onboarding.getStarted')}
            onPress={handlePrimary}
          />
        </Reveal>
      </View>
    </View>,

    /* ── Page 2: everything in one place ─────────────── */
    <View key={pageKey(1, 'p2')} style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle
        key={pageKey(1, 'p2-title')}
        top={t('onboarding.page2Top')}
        bottom={t('onboarding.page2Bottom')}
        delay={0}
        active={isActive(1)}
        dark
      />
      <RevealText
        key={pageKey(1, 'p2-body')}
        delay={90}
        active={isActive(1)}
        style={[styles.body, styles.bodyDark]}
      >
        {t('onboarding.page2Body')}
      </RevealText>
      <View style={styles.cardsRow}>
        <Reveal
          key={pageKey(1, 'p2-card-left')}
          delay={180}
          active={isActive(1)}
          style={styles.lightCard}
        >
          <Text style={styles.lightCardLabel}>▦ {t('onboarding.today')}</Text>
          <Text style={styles.lightCardBig} numberOfLines={1}>
            3/4
          </Text>
          <View style={styles.lightDivider} />
          <Text style={styles.lightCardSub}>{t('onboarding.doneToday')}</Text>
        </Reveal>
        <Reveal
          key={pageKey(1, 'p2-card-right')}
          delay={260}
          active={isActive(1)}
          style={styles.lightCard}
        >
          <View style={styles.iconCluster}>
            <GradientDot
              size={36}
              id="p2-dot-black"
              from="#3A3A40"
              to="#0E0E11"
              glyph="✓"
            />
            <View style={styles.dotOverlap}>
              <GradientDot
                size={36}
                id="p2-dot-blue"
                from="#6FB3FF"
                to="#2F6FED"
                glyph="≈"
              />
            </View>
            <View style={styles.dotOverlap}>
              <GradientDot
                size={36}
                id="p2-dot-green"
                from="#5BE584"
                to="#1FA84F"
                glyph="♪"
              />
            </View>
            <View style={styles.dotOverlap}>
              <GradientDot
                size={36}
                id="p2-dot-pink"
                from="#F27BB5"
                to="#C83E8B"
                glyph="T"
              />
            </View>
          </View>
          <Text style={styles.lightCardBig} numberOfLines={1}>
            4{' '}
            <Text style={styles.lightCardActive}>{t('onboarding.active')}</Text>
          </Text>
        </Reveal>
      </View>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <Reveal
          key={pageKey(1, 'p2-skip')}
          delay={300}
          duration={340}
          active={isActive(1)}
        >
          <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        </Reveal>
        <Reveal key={pageKey(1, 'p2-cta')} delay={360} active={isActive(1)}>
          <PillButton
            testID="onboarding-continue"
            label={t('onboarding.continue')}
            onPress={handlePrimary}
          />
        </Reveal>
      </View>
    </View>,

    /* ── Page 3: stay ahead of streaks ───────────────── */
    <View key={pageKey(2, 'p3')} style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle
        key={pageKey(2, 'p3-title')}
        top={t('onboarding.page3Top')}
        bottom={t('onboarding.page3Bottom')}
        delay={0}
        active={isActive(2)}
        dark
      />
      <RevealText
        key={pageKey(2, 'p3-body')}
        delay={90}
        active={isActive(2)}
        style={[styles.body, styles.bodyDark]}
      >
        {t('onboarding.page3Body')}
      </RevealText>
      <Reveal
        key={pageKey(2, 'p3-card')}
        delay={180}
        active={isActive(2)}
        style={styles.lightUpNextWrap}
      >
        <View style={styles.upNextBadge}>
          <BellAlertIcon size={22} color="#1A0F0E" />
        </View>
        <Text style={styles.lightUpNextTitle}>{t('onboarding.upNext')}</Text>
        <View style={styles.upNextRow}>
          <Reveal
            key={pageKey(2, 'p3-inner-left')}
            delay={260}
            duration={340}
            active={isActive(2)}
            style={styles.lightUpNextCard}
          >
            <View style={styles.upNextHead}>
              <GradientDot
                size={36}
                id="p3-dot-black"
                from="#3A3A40"
                to="#0E0E11"
                glyph="✓"
              />
              <Text style={styles.lightUpNextWhen}>
                • {t('onboarding.example1Meta').split('· ')[1] ?? ''}
              </Text>
            </View>
            <Text style={styles.lightUpNextName}>
              {t('onboarding.example1Name')}
            </Text>
            <Text style={styles.lightUpNextMeta}>
              {t('onboarding.example1Meta')}
            </Text>
          </Reveal>
          <Reveal
            key={pageKey(2, 'p3-inner-right')}
            delay={320}
            duration={340}
            active={isActive(2)}
            style={styles.lightUpNextCard}
          >
            <View style={styles.upNextHead}>
              <GradientDot
                size={36}
                id="p3-dot-blue"
                from="#6FB3FF"
                to="#2F6FED"
                glyph="≈"
              />
              <Text style={styles.lightUpNextWhen}>
                • {t('onboarding.example2Meta').split('· ')[1] ?? ''}
              </Text>
            </View>
            <Text style={styles.lightUpNextName}>
              {t('onboarding.example2Name')}
            </Text>
            <Text style={styles.lightUpNextMeta}>
              {t('onboarding.example2Meta')}
            </Text>
          </Reveal>
        </View>
      </Reveal>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <Reveal
          key={pageKey(2, 'p3-skip')}
          delay={340}
          duration={340}
          active={isActive(2)}
        >
          <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        </Reveal>
        <Reveal key={pageKey(2, 'p3-cta')} delay={400} active={isActive(2)}>
          <PillButton
            testID="onboarding-continue"
            label={t('onboarding.continue')}
            onPress={handlePrimary}
          />
        </Reveal>
      </View>
    </View>,

    /* ── Page 4: free tier ───────────────────────────── */
    <View key={pageKey(3, 'p4')} style={[styles.page, { width }]}>
      <View style={styles.topPad} />
      <PageTitle
        key={pageKey(3, 'p4-title')}
        top={t('onboarding.page4Top')}
        bottom={t('onboarding.page4Bottom', {
          habitCount: FREE_HABIT_LIMIT,
          goalCount: FREE_GOAL_LIMIT,
        })}
        delay={0}
        active={isActive(3)}
      />
      <RevealText
        key={pageKey(3, 'p4-body')}
        delay={90}
        active={isActive(3)}
        style={styles.body}
      >
        {t('onboarding.page4Body')}
      </RevealText>
      <Animated.View
        key={pageKey(3, 'p4-moon')}
        entering={isActive(3) ? ZoomIn.delay(180).duration(500) : undefined}
        style={styles.moonWrap}
      >
        <View style={styles.moon}>
          {CRATERS.map((c, i) => (
            <View key={i} style={[styles.crater, c]} />
          ))}
        </View>
      </Animated.View>
      <View style={styles.flexSpacer} />
      <View style={styles.ctaZone}>
        <Reveal
          key={pageKey(3, 'p4-skip')}
          delay={300}
          duration={340}
          active={isActive(3)}
        >
          <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        </Reveal>
        <Reveal key={pageKey(3, 'p4-cta')} delay={360} active={isActive(3)}>
          <PillButton
            testID="onboarding-continue"
            label={t('onboarding.continue')}
            onPress={handlePrimary}
          />
        </Reveal>
      </View>
    </View>,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_TOP} />
      <GradientBackground />
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
    backgroundColor: BG_TOP,
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
  heroLogo: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 10,
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
  titleDark: {
    color: TITLE_DARK,
  },
  titleDarkMuted: {
    color: '#3E5546',
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
  bodyDark: {
    color: BODY_DARK,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
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
  lightCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: LIGHT_CARD_BG_SOFT,
    borderColor: LIGHT_CARD_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    minHeight: 172,
    justifyContent: 'center',
    shadowColor: '#0F2418',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lightCardLabel: {
    color: LIGHT_LABEL,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  lightCardBig: {
    color: TITLE_DARK,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  lightCardActive: {
    fontSize: 15,
    fontWeight: '600',
    color: LIGHT_LABEL,
  },
  lightDivider: {
    height: 1,
    backgroundColor: LIGHT_DIVIDER,
    marginVertical: 12,
  },
  lightCardSub: {
    color: LIGHT_LABEL,
    fontSize: 13,
    fontWeight: '600',
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
    height: 40,
  },
  dotOverlap: {
    marginLeft: -10,
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
  lightUpNextWrap: {
    marginTop: 32,
    backgroundColor: LIGHT_CARD_BG_SOFT,
    borderColor: LIGHT_CARD_BORDER,
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0F2418',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lightUpNextTitle: {
    color: TITLE_DARK,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  lightUpNextCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: LIGHT_CARD_BG,
    borderColor: LIGHT_CARD_BORDER,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  lightUpNextWhen: {
    color: LIGHT_LABEL,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  lightUpNextName: {
    color: TITLE_DARK,
    fontSize: 16,
    fontWeight: '700',
  },
  lightUpNextMeta: {
    color: LIGHT_LABEL,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
    borderColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
  },
  crater: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.19)',
    borderColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
  },
  ctaZone: {
    gap: 18,
    paddingBottom: 8,
    marginTop: 10,
  },
  skipHit: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    color: BODY_DARK,
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
