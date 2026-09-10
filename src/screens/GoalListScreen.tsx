import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useGoalStore } from '../store/goalStore';
import GoalCard from '../components/GoalCard';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

type GoalFilter = 'all' | 'active' | 'completed';

const FILTERS: GoalFilter[] = ['all', 'active', 'completed'];

export default function GoalListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const goals = useGoalStore(s => s.goals);
  const [filter, setFilter] = useState<GoalFilter>('all');

  const active = useMemo(
    () => goals.filter(g => g.status === 'active').sort((a, b) => +new Date(a.endAt) - +new Date(b.endAt)),
    [goals],
  );
  const completed = useMemo(
    () => goals.filter(g => g.status === 'completed').sort((a, b) => +new Date(b.completedAt ?? b.endAt) - +new Date(a.completedAt ?? a.endAt)),
    [goals],
  );

  const sections = useMemo(() => {
    const rows: { key: string; header?: string; goal?: any }[] = [];
    if (filter === 'all' || filter === 'active') {
      active.forEach(g => rows.push({ key: g.id, goal: g }));
    }
    if (filter === 'all' || filter === 'completed') {
      if (filter === 'all' && active.length > 0 && completed.length > 0) {
        rows.push({ key: '__completed_header', header: t('goals.completed') });
      }
      completed.forEach(g => rows.push({ key: g.id, goal: g }));
    }
    return rows;
  }, [active, completed, filter, t]);

  const emptyText =
    goals.length === 0
      ? t('goals.empty')
      : filter === 'active'
        ? t('goals.emptyActive')
        : t('goals.emptyCompleted');

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

      <View style={styles.body}>
        {sections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Raised radius={theme.radii.panel} distance={7} style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                {emptyText}
              </Text>
            </Raised>
          </View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={item => item.key}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              if (item.header) {
                return (
                  <Text style={[styles.sectionHeader, { color: theme.colors.textMuted }]}>
                    {item.header}
                  </Text>
                );
              }
              return (
                <GoalCard
                  goal={item.goal}
                  onPress={() => navigation.navigate('GoalDetail', { id: item.goal.id })}
                />
              );
            }}
          />
        )}
      </View>
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
