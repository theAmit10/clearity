import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useGoalStore } from '../store/goalStore';
import type { Goal } from '../types/goal';
import GoalCard from '../components/GoalCard';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

type GoalFilter = 'all' | 'active' | 'completed';

const FILTERS: GoalFilter[] = ['all', 'active', 'completed'];

/** Merge a reordered section back into the full store array.
 * Items matching `status` are replaced in-place (in order) by
 * `reorderedSection`; all other items keep their positions. This keeps
 * active/completed orders independent (per-section reorder). */
function mergeSectionReorder(
  full: Goal[],
  reorderedSection: Goal[],
  status: Goal['status'],
): Goal[] {
  const queue = [...reorderedSection];
  return full.map(g => (g.status === status ? queue.shift() ?? g : g));
}

export default function GoalListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const goals = useGoalStore(s => s.goals);
  const reorderGoals = useGoalStore(s => s.reorderGoals);
  const [filter, setFilter] = useState<GoalFilter>('all');

  const confirmComplete = useCallback(
    (id: string) => {
      const goal = useGoalStore.getState().goals.find(g => g.id === id);
      if (!goal || goal.status !== 'active') return;
      Alert.alert(t('goals.completeGoal'), goal.title, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('goals.completeConfirm'),
          onPress: () => {
            useGoalStore.getState().completeGoal(id);
          },
        },
      ]);
    },
    [t],
  );

  // Manual (store) order — the list order IS the store order, like Home habits.
  // Long-press drag reorders directly; no separate reorder mode.
  const manualActive = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
  const manualCompleted = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);

  const handleDragEndActive = useCallback(
    ({ data }: { data: Goal[] }) => {
      reorderGoals(mergeSectionReorder(useGoalStore.getState().goals, data, 'active'));
    },
    [reorderGoals],
  );

  const handleDragEndCompleted = useCallback(
    ({ data }: { data: Goal[] }) => {
      reorderGoals(mergeSectionReorder(useGoalStore.getState().goals, data, 'completed'));
    },
    [reorderGoals],
  );

  const renderDragItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Goal>) => (
      <ScaleDecorator>
        <GoalCard
          goal={item}
          onPress={() => navigation.navigate('GoalDetail', { id: item.id })}
          onComplete={confirmComplete}
          onLongPress={drag}
          isDragging={isActive}
        />
      </ScaleDecorator>
    ),
    [navigation, confirmComplete],
  );

  const emptyText =
    goals.length === 0
      ? t('goals.empty')
      : filter === 'active'
        ? t('goals.emptyActive')
        : t('goals.emptyCompleted');

  const isEmpty =
    (filter === 'active' && manualActive.length === 0) ||
    (filter === 'completed' && manualCompleted.length === 0) ||
    (filter === 'all' && manualActive.length === 0 && manualCompleted.length === 0);

  const renderBody = () => {
    if (isEmpty) {
      return (
        <View style={styles.emptyWrap}>
          <Raised radius={theme.radii.panel} distance={7} style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              {emptyText}
            </Text>
          </Raised>
        </View>
      );
    }
    if (filter === 'active') {
      return (
        <DraggableFlatList
          data={manualActive}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderDragItem}
          onDragEnd={handleDragEndActive}
        />
      );
    }
    if (filter === 'completed') {
      return (
        <DraggableFlatList
          data={manualCompleted}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderDragItem}
          onDragEnd={handleDragEndCompleted}
        />
      );
    }
    // filter === 'all': two independent draggable sections
    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        {manualActive.length > 0 && (
          <DraggableFlatList
            data={manualActive}
            keyExtractor={g => g.id}
            renderItem={renderDragItem}
            onDragEnd={handleDragEndActive}
            scrollEnabled={false}
          />
        )}
        {manualActive.length > 0 && manualCompleted.length > 0 && (
          <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>
            {t('goals.completed')}
          </Text>
        )}
        {manualCompleted.length > 0 && (
          <DraggableFlatList
            data={manualCompleted}
            keyExtractor={g => g.id}
            renderItem={renderDragItem}
            onDragEnd={handleDragEndCompleted}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('goals.title')}
        </Text>
        <NeumorphicButton
          radius={18}
          distance={5}
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEditGoal')}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.textPrimary }]}>+</Text>
        </NeumorphicButton>
      </View>

      {goals.length > 0 && (
        <View style={styles.filterRow}>
          {FILTERS.map(f => {
            const selected = filter === f;
            return (
              <NeumorphicButton
                key={f}
                radius={14}
                distance={4}
                forcePressed={selected}
                style={[
                  styles.filterPill,
                  selected && {
                    backgroundColor: `${theme.colors.textPrimary}15`,
                  },
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: selected
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {t(`goals.filter_${f}`)}
                </Text>
              </NeumorphicButton>
            );
          })}
        </View>
      )}

      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: -2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    paddingBottom: 200,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
