import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { useGoalStore } from '../store/goalStore';
import GoalCard from '../components/GoalCard';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

export default function GoalListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const goals = useGoalStore(s => s.goals);

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
    active.forEach(g => rows.push({ key: g.id, goal: g }));
    if (completed.length > 0) {
      rows.push({ key: '__completed_header', header: t('goals.completed') });
      completed.forEach(g => rows.push({ key: g.id, goal: g }));
    }
    return rows;
  }, [active, completed, t]);

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

      <View style={styles.body}>
        {goals.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Raised radius={theme.radii.panel} distance={7} style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                {t('goals.empty')}
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
