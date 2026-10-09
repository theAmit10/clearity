import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useHabitStore, computeStats } from '../store/habitStore';
import YearHeatmap from '../components/YearHeatmap';
import StatsRow from '../components/StatsRow';
import ActionButtons from '../components/ActionButtons';
import MonthlyCalendar from '../components/MonthlyCalendar';
import { getLockedHabitIds } from '../services/proAccess';
import { FREE_HABIT_LIMIT } from '../constants/appInfo';
import { openPaywall } from '../services/paywallRouter';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { getHabitIcon } from '../constants/habitIcons';
import { useTranslation } from '../i18n';

export default function HabitDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { id } = route.params;
  const habit = useHabitStore(s => s.habits.find(h => h.id === id));
  const deleteHabit = useHabitStore(s => s.deleteHabit);
  const isPro = useHabitStore(s => s.isPro);
  const proExpired = useHabitStore(s => s.proExpired);
  const habits = useHabitStore(s => s.habits);
  // Date-based lock set, memoized from the raw array (never return a fresh
  // collection from a zustand selector — see HomeScreen's warning).
  const locked = React.useMemo(
    () => !isPro && getLockedHabitIds(habits).has(id),
    [isPro, habits, id],
  );
  const openExpiredPaywall = useCallback(
    () =>
      openPaywall(navigation, {
        ...(proExpired ? { mode: 'expired' as const } : null),
        source: 'habit_limit',
      }),
    [navigation, proExpired],
  );
  const cardScale = useSharedValue(0.95);
  const cardOpacity = useSharedValue(0);

  React.useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 120 });
    cardOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const confirmDelete = useCallback(() => {
    Alert.alert(t('detail.settings'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('detail.deleteHabit'),
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(id);
          navigation.goBack();
        },
      },
    ]);
  }, [id, deleteHabit, navigation, t]);

  if (!habit) return null;
  const stats = computeStats(habit);

  // habit.icon is now a heroicons key (e.g. "fire"), not an emoji — look
  // up the actual component instead of rendering the key as text.
  const Icon = getHabitIcon(habit.icon);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={cardStyle}>
          <Raised
            radius={theme.radii.card}
            distance={10}
            style={styles.card}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Raised radius={18} distance={5} style={styles.iconBadge}>
                  <Icon size={26} color={habit.color} />
                </Raised>
                <View style={styles.headerText}>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{habit.name}</Text>
                  {habit.description && (
                    <Text style={[styles.description, { color: theme.colors.textMuted }]}>{habit.description}</Text>
                  )}
                </View>
              </View>
              <NeumorphicButton
                radius={16}
                distance={5}
                style={styles.closeButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.closeText, { color: theme.colors.textMuted }]}>✕</Text>
              </NeumorphicButton>
            </View>

            {locked && (
              <Pressable
                onPress={openExpiredPaywall}
                style={[
                  styles.lockBanner,
                  { backgroundColor: theme.colors.accent + '1A' },
                ]}
              >
                <Text
                  style={[styles.lockTitle, { color: theme.colors.accent }]}
                >
                  {t('proAccess.habitLockedTitle')}
                </Text>
                <Text
                  style={[
                    styles.lockBody,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t('proAccess.habitLockBannerBody', {
                    limit: FREE_HABIT_LIMIT,
                  })}
                </Text>
              </Pressable>
            )}

            <View style={styles.section}>
              <YearHeatmap
                habitId={habit.id}
                color={habit.color}
                locked={locked}
                onLockedPress={openExpiredPaywall}
              />
            </View>

            <View style={styles.section}>
              <StatsRow stats={stats} goal={habit.goal} />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.shadowDark + '80' }]} />

            <View style={styles.section}>
              <MonthlyCalendar
                habitId={habit.id}
                color={habit.color}
                locked={locked}
                onLockedPress={openExpiredPaywall}
              />
            </View>

            <View style={styles.actionRow}>
              <ActionButtons
                onEdit={() =>
                  locked
                    ? openExpiredPaywall()
                    : navigation.navigate('AddEditHabit', { id: habit.id })
                }
                onDelete={confirmDelete}
              />
            </View>
          </Raised>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  lockBanner: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  lockBody: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
});
