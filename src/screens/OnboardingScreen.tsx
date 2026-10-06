import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useTranslation } from '../i18n';
import { FREE_HABIT_LIMIT, FREE_GOAL_LIMIT } from '../constants/appInfo';
import MorphField, { type MorphHandle } from '../components/onboarding/MorphField';
import HabitCard from '../components/HabitCard';
import type { Habit } from '../types/habit';
import { todayKey } from '../services/dateUtils';
import { useTheme } from '../theme/ThemeProvider';

/* Reference-style palette: pure black + white dots, white headline */
const BG = '#000000';
const TITLE = '#FFFFFF';
const BODY = '#9A9A9A';
const DOT_ACTIVE = '#FFFFFF';
const DOT_IDLE = 'rgba(255,255,255,0.28)';
const PILL_BG = '#FFFFFF';
const PILL_TEXT = '#000000';
const SKIP_TEXT = '#8E8E93';

export type OnboardingResult = 'completed' | 'skipped';

interface Props {
  onFinish: (result: OnboardingResult, atIndex: number) => void;
  /** When false (film-tail overlay), CTA/Skip presses are ignored until
   *  the film unmounts. Defaults to true. */
  interactive?: boolean;
}

function ThemeOption({
  label,
  selected,
  onSelect,
  testID,
  dark,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  testID?: string;
  dark?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.themeOption,
        dark ? styles.themeOptionDark : styles.themeOptionLight,
        selected && styles.themeOptionSelected,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={[styles.themeOptionText, dark && styles.themeOptionTextDark]}>
        {label}
      </Text>
    </Pressable>
  );
}

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
      accessibilityRole="button"
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

function PageHeadline({
  top,
  bottom,
  delay = 0,
  active = true,
}: {
  top: string;
  bottom: string;
  delay?: number;
  active?: boolean;
}) {
  return (
    <Animated.View
      entering={active ? FadeInDown.delay(delay).duration(400) : undefined}
    >
      <Text style={styles.title}>{top}</Text>
      <RevealText
        delay={delay + 60}
        duration={360}
        active={active}
        style={styles.title}
      >
        {bottom}
      </RevealText>
    </Animated.View>
  );
}

function PagerDots({ index, total }: { index: number; total: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen({ onFinish, interactive = true }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { themeName, setTheme } = useTheme();
  const listRef = useRef<FlatList<number>>(null);
  const morphRef = useRef<MorphHandle>(null);
  const morphingRef = useRef(false);
  const [index, setIndex] = useState(0);

  // Static sample habit so users can see each theme on real UI.
  const previewHabit: Habit = useMemo(
    () => ({
      id: 'onboarding-preview',
      name: 'Read 10 pages',
      icon: 'fire',
      color: '#34C759',
      frequency: 'daily',
      category: 'none',
      createdAt: new Date().toISOString(),
      archived: false,
      completions: { [todayKey()]: 1 },
    }),
    [],
  );

  const selectTheme = useCallback(
    (name: 'light' | 'dark') => {
      setTheme(name).catch(() => {});
    },
    [setTheme],
  );

  const goTo = useCallback((next: number) => {
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: true });
  }, []);

  const handlePrimary = useCallback(() => {
    if (!interactive || morphingRef.current) return;
    if (index >= 4) {
      onFinish('completed', 4);
      return;
    }
    const next = index + 1;
    morphingRef.current = true;
    // Persistent atoms morph to the next shape; copy swaps mid-flight
    // for a seamless shared-element handoff.
    morphRef.current?.morphTo(
      next,
      () => goTo(next),
      () => {
        morphingRef.current = false;
      },
    );
  }, [index, goTo, onFinish, interactive]);

  const handleSkip = useCallback(() => {
    if (!interactive) return;
    onFinish('skipped', index);
  }, [index, onFinish, interactive]);

  const isActive = (i: number) => i === index;
  // Key suffix flips between "on-<index>" and "off" so the active page
  // remounts on every landing and its `entering` animations replay.
  const pageKey = (i: number, tag: string) =>
    `${tag}-${isActive(i) ? `on-${index}` : 'off'}`;

  const ctaLabel = (i: number) =>
    i === 0 ? t('onboarding.getStarted') : t('onboarding.continue');

  const bodies: (string | null)[] = [
    t('onboarding.page1Body'),
    t('onboarding.page2Body'),
    t('onboarding.page3Body'),
    t('onboarding.page4Body'),
    t('onboarding.page5Body'),
  ];

  const headlines: { top: string; bottom: string }[] = [
    { top: t('onboarding.page1Top'), bottom: t('onboarding.page1Bottom') },
    { top: t('onboarding.page2Top'), bottom: t('onboarding.page2Bottom') },
    { top: t('onboarding.page3Top'), bottom: t('onboarding.page3Bottom') },
    {
      top: t('onboarding.page4Top'),
      bottom: t('onboarding.page4Bottom', {
        habitCount: FREE_HABIT_LIMIT,
        goalCount: FREE_GOAL_LIMIT,
      }),
    },
    { top: t('onboarding.page5Top'), bottom: t('onboarding.page5Bottom') },
  ];

  const pages: React.ReactNode[] = [0, 1, 2, 3, 4].map(i => (
    <View key={pageKey(i, `p${i}`)} style={[styles.page, { width }]}>
      {i > 0 && (
        <View style={styles.skipRow}>
          <SkipButton label={t('onboarding.skip')} onPress={handleSkip} />
        </View>
      )}
      {i === 0 && <View style={styles.skipRowPlaceholder} />}
      {/* Spacer — the living atoms render once in the persistent canvas
          behind the pager, so page changes morph rather than remount.
          Compact on the theme page to fit the card + toggle. */}
      <View style={[styles.artSpacer, i === 4 && styles.artSpacerCompact]} />
      <View style={styles.copy}>
        <PageHeadline
          key={pageKey(i, `p${i}-title`)}
          top={headlines[i].top}
          bottom={headlines[i].bottom}
          delay={120}
          active={isActive(i)}
        />
        {bodies[i] ? (
          <RevealText
            key={pageKey(i, `p${i}-body`)}
            delay={200}
            active={isActive(i)}
            style={styles.body}
          >
            {bodies[i]}
          </RevealText>
        ) : null}
      </View>
      {i === 4 && (
        <Reveal key={pageKey(i, 'p4-theme')} delay={240} active={isActive(i)}>
          <View style={styles.themePreview}>
            <HabitCard
              habit={previewHabit}
              onToggleToday={() => {}}
              onPress={() => {}}
            />
          </View>
          <View style={styles.themeRow}>
            <View style={styles.themeOptionHalf}>
              <ThemeOption
                testID="onboarding-theme-light"
                label={t('onboarding.themeLight')}
                selected={themeName === 'light'}
                onSelect={() => selectTheme('light')}
              />
            </View>
            <View style={styles.themeOptionHalf}>
              <ThemeOption
                testID="onboarding-theme-dark"
                label={t('onboarding.themeDark')}
                selected={themeName === 'dark'}
                onSelect={() => selectTheme('dark')}
                dark
              />
            </View>
          </View>
        </Reveal>
      )}
      <View style={styles.ctaZone}>
        <Reveal key={pageKey(i, `p${i}-dots`)} delay={280} active={isActive(i)}>
          <PagerDots index={index} total={5} />
        </Reveal>
        <Reveal key={pageKey(i, `p${i}-cta`)} delay={340} active={isActive(i)}>
          <PillButton
            testID="onboarding-continue"
            label={ctaLabel(i)}
            onPress={handlePrimary}
          />
        </Reveal>
      </View>
    </View>
  ));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      {/* Shared-element atom canvas — mounted once, never remounts.
          Blooms in on mount so the film-tail handoff materializes. */}
      <Animated.View
        entering={FadeIn.duration(900)}
        style={styles.canvasWrap}
        pointerEvents="none"
      >
        <MorphField ref={morphRef} />
      </Animated.View>
      <FlatList
        ref={listRef}
        data={[0, 1, 2, 3, 4]}
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
  page: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingTop: 8,
    minHeight: 40,
  },
  skipRowPlaceholder: {
    minHeight: 48,
  },
  artSpacer: {
    flex: 1,
    minHeight: 280,
    marginTop: 4,
  },
  artSpacerCompact: {
    flex: 0,
    minHeight: 24,
  },
  canvasWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 48,
    bottom: 300,
  },
  copy: {
    paddingTop: 12,
    minHeight: 168,
  },
  themePreview: {
    marginTop: 16,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  themeOptionHalf: {
    flex: 1,
  },
  themeOption: {
    borderRadius: 18,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionLight: {
    backgroundColor: '#F4F5F7',
  },
  themeOptionDark: {
    backgroundColor: '#1C1C1E',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  themeOptionSelected: {
    borderWidth: 3,
    borderColor: '#34C759',
    shadowColor: '#34C759',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  themeOptionText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '700',
  },
  themeOptionTextDark: {
    color: '#FFFFFF',
  },
  title: {
    color: TITLE,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
    textAlign: 'left',
  },
  body: {
    color: BODY,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    marginTop: 12,
    textAlign: 'left',
  },
  ctaZone: {
    gap: 18,
    paddingBottom: 8,
    marginTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: DOT_ACTIVE,
  },
  dotIdle: {
    backgroundColor: DOT_IDLE,
  },
  skipHit: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: SKIP_TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  pill: {
    backgroundColor: PILL_BG,
    borderRadius: 32,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: {
    opacity: 0.85,
  },
  pillText: {
    color: PILL_TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
});
