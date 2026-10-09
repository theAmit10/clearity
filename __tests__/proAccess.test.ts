jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: 'test',
  REVENUECAT_API_KEY: 'test',
}));

import {
  getFreeGoalIds,
  getFreeHabitIds,
  getLockedGoalIds,
  getLockedHabitIds,
} from '../src/services/proAccess';
import { FREE_GOAL_LIMIT, FREE_HABIT_LIMIT } from '../src/constants/appInfo';

function habit(id: string, createdAt: string, archived = false): any {
  return { id, createdAt, archived, completions: {} };
}

function goal(id: string, createdAt: string, status = 'active'): any {
  return { id, createdAt, status };
}

describe('proAccess habit locks', () => {
  it('keeps the oldest habits free and locks the rest', () => {
    const habits = [
      habit('h5', '2026-05-01'),
      habit('h1', '2026-01-01'),
      habit('h10', '2026-10-01'),
      habit('h3', '2026-03-01'),
      habit('h2', '2026-02-01'),
      habit('h6', '2026-06-01'),
    ];
    expect(getFreeHabitIds(habits)).toEqual(new Set(['h1', 'h2', 'h3', 'h5']));
    expect(getLockedHabitIds(habits)).toEqual(new Set(['h10', 'h6']));
  });

  it('locks nothing at or under the free limit', () => {
    const habits = [habit('a', '2026-01-01'), habit('b', '2026-02-01')];
    expect(getLockedHabitIds(habits)).toEqual(new Set());
    expect(getFreeHabitIds(habits)).toEqual(new Set(['a', 'b']));
  });

  it('ignores archived habits entirely', () => {
    const habits = [
      habit('a', '2026-01-01'),
      habit('b', '2026-02-01'),
      habit('c', '2026-03-01'),
      habit('d', '2026-04-01'),
      habit('e', '2026-05-01'),
      habit('old-archived', '2025-01-01', true),
    ];
    // Archived habit doesn't consume a free slot and is never locked.
    expect(getFreeHabitIds(habits)).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(getLockedHabitIds(habits)).toEqual(new Set(['e']));
  });

  it('promotes the next-oldest habit after a delete', () => {
    const habits = [
      habit('h1', '2026-01-01'),
      habit('h2', '2026-02-01'),
      habit('h3', '2026-03-01'),
      habit('h4', '2026-04-01'),
      habit('h5', '2026-05-01'),
    ];
    expect(getLockedHabitIds(habits)).toEqual(new Set(['h5']));
    const afterDelete = habits.filter(h => h.id !== 'h1');
    expect(getLockedHabitIds(afterDelete)).toEqual(new Set());
    expect(getFreeHabitIds(afterDelete)).toEqual(
      new Set(['h2', 'h3', 'h4', 'h5']),
    );
  });

  it(`uses the FREE_HABIT_LIMIT (${FREE_HABIT_LIMIT}) as the free count`, () => {
    const habits = Array.from({ length: FREE_HABIT_LIMIT + 2 }, (_, i) =>
      habit(`h${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`),
    );
    expect(getFreeHabitIds(habits).size).toBe(FREE_HABIT_LIMIT);
    expect(getLockedHabitIds(habits).size).toBe(2);
  });
});

describe('proAccess goal locks', () => {
  it('keeps the oldest goals free and locks the rest', () => {
    const goals = [
      goal('g4', '2026-04-01'),
      goal('g1', '2026-01-01'),
      goal('g5', '2026-05-01'),
      goal('g2', '2026-02-01'),
      goal('g3', '2026-03-01'),
    ];
    expect(getFreeGoalIds(goals)).toEqual(new Set(['g1', 'g2']));
    expect(getLockedGoalIds(goals)).toEqual(new Set(['g4', 'g5', 'g3']));
  });

  it('counts completed goals like addGoal does', () => {
    const goals = [
      goal('done1', '2026-01-01', 'completed'),
      goal('done2', '2026-02-01', 'completed'),
      goal('active', '2026-03-01', 'active'),
    ];
    expect(getFreeGoalIds(goals)).toEqual(new Set(['done1', 'done2']));
    expect(getLockedGoalIds(goals)).toEqual(new Set(['active']));
  });

  it(`uses the FREE_GOAL_LIMIT (${FREE_GOAL_LIMIT}) as the free count`, () => {
    const goals = Array.from({ length: FREE_GOAL_LIMIT + 1 }, (_, i) =>
      goal(`g${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`),
    );
    expect(getFreeGoalIds(goals).size).toBe(FREE_GOAL_LIMIT);
    expect(getLockedGoalIds(goals).size).toBe(1);
  });
});
