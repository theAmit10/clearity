import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useHabitStore } from '../store/habitStore';
import { Habit } from '../types/habit';
import HabitCard from '../components/HabitCard';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';

export default function HomeScreen({ navigation }: any) {
  const { theme } = useTheme();
  // IMPORTANT: select the raw array (stable reference) from the store, then
  // derive the filtered list with useMemo. Never return a freshly-created
  // array/object directly from a Zustand selector — a new reference on every
  // call makes React think the store changed on every render, which causes
  // an infinite render loop ("Maximum update depth exceeded").
  const allHabits = useHabitStore(s => s.habits);
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const reorderHabits = useHabitStore(s => s.reorderHabits);
  const activeHabits = useMemo(
    () => allHabits.filter(h => !h.archived),
    [allHabits],
  );
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categorySet = useMemo(() => {
    const cats = new Set<string>();
    activeHabits.forEach(h => {
      if (h.category && h.category !== 'none') cats.add(h.category);
    });
    return ['all', ...cats];
  }, [activeHabits]);

  const habits = useMemo(
    () =>
      selectedCategory === 'all'
        ? activeHabits
        : activeHabits.filter(h => h.category === selectedCategory),
    [activeHabits, selectedCategory],
  );

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive,
    }: {
      item: Habit;
      drag: () => void;
      isActive: boolean;
    }) => {
      return (
        <ScaleDecorator>
          <HabitCard
            habit={item}
            onToggleToday={() => toggleCompletion(item.id)}
            onPress={() => navigation.navigate('HabitDetail', { id: item.id })}
            onLongPress={drag}
            isDragging={isActive}
          />
        </ScaleDecorator>
      );
    },
    [navigation, toggleCompletion],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Habitic
        </Text>
        <NeumorphicButton
          radius={18}
          distance={5}
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEditHabit')}
        >
          <Text
            style={[styles.addButtonText, { color: theme.colors.textPrimary }]}
          >
            +
          </Text>
        </NeumorphicButton>
      </View>

      {categorySet.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catFilterRow}
          style={{
            height: 60,
            maxHeight: 60,
            minHeight: 60,
          }}
        >
          {categorySet.map(cat => {
            const selected = selectedCategory === cat;
            return (
              <NeumorphicButton
                key={cat}
                radius={14}
                distance={4}
                forcePressed={selected}
                style={[
                  styles.catFilterPill,
                  selected && {
                    backgroundColor: `${theme.colors.textPrimary}15`,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.catFilterText,
                    {
                      color: selected
                        ? theme.colors.textPrimary
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {cat === 'all' ? 'All' : cat}
                </Text>
              </NeumorphicButton>
            );
          })}
        </ScrollView>
      )}

      {habits.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Raised radius={theme.radii.panel} distance={7} style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              {selectedCategory === 'all'
                ? 'No habits yet.\nTap + to add your first one.'
                : 'No habits in this category.'}
            </Text>
          </Raised>
        </View>
      ) : (
        <DraggableFlatList
          data={habits}
          keyExtractor={h => h.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderHabits(data)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 30,
    paddingBottom: 200,
    gap: 14,
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
  catFilterRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  catFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catFilterText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
