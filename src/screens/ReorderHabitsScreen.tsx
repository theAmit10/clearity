import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useHabitStore } from '../store/habitStore';
import { Habit } from '../types/habit';
import { getHabitIcon } from '../constants/habitIcons';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import ScreenHeader from '../components/ScreenHeader';

export default function ReorderHabitsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const allHabits = useHabitStore(s => s.habits);
  const reorderHabits = useHabitStore(s => s.reorderHabits);
  const habits = useMemo(() => allHabits.filter(h => !h.archived), [allHabits]);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => {
      const Icon = getHabitIcon(item.icon);
      return (
        <ScaleDecorator>
          <Raised
            radius={14}
            distance={isActive ? 10 : 5}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Pressable
              style={styles.dragHandle}
              onPressIn={drag}
              onLongPress={drag}
            >
              <Text style={[styles.dragIcon, { color: theme.colors.textMuted }]}>⋮⋮</Text>
            </Pressable>
            <Raised radius={16} distance={3} style={styles.iconBadge}>
              <Icon size={20} color={item.color} />
            </Raised>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
          </Raised>
        </ScaleDecorator>
      );
    },
    [theme],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerWrap}>
        <ScreenHeader navigation={navigation} title="Reorder Habits" />
      </View>
      <Text style={[styles.helpText, { color: theme.colors.textMuted }]}>
        Hold the drag handle ⋮⋮ to reorder your habits
      </Text>
      <DraggableFlatList
        data={habits}
        keyExtractor={h => h.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => reorderHabits(data)}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  helpText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginVertical: 5,
  },
  itemActive: {
    shadowOpacity: 0.2,
    elevation: 10,
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginRight: 10,
  },
  dragIcon: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -2,
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
});
