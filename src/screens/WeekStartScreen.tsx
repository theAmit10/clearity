import React from 'react';
import { Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import {
  SETTINGS_SHARED_TAGS,
  settingsCardTransition,
} from '../components/SettingsRevealItem';
import CheckIcon from 'react-native-heroicons/outline/CheckIcon';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import { useHabitStore } from '../store/habitStore';
import type { WeekStartDay } from '../services/dateUtils';
import ScreenHeader from '../components/ScreenHeader';

const OPTIONS: WeekStartDay[] = ['monday', 'sunday'];

export default function WeekStartScreen({ navigation }: any) {
  const { t } = useTranslation();
  const weekStartsOn = useHabitStore(s => s.weekStartsOn);
  const setWeekStartsOn = useHabitStore(s => s.setWeekStartsOn);
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.iosBg }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <ScreenHeader
          navigation={navigation}
          title={t('weekStart.title')}
        />

        <Animated.View
          sharedTransitionTag={SETTINGS_SHARED_TAGS.weekStart}
          sharedTransitionStyle={settingsCardTransition}
          style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}
        >
          {OPTIONS.map((day, index) => {
            const active = weekStartsOn === day;
            const isLast = index === OPTIONS.length - 1;
            return (
              <Pressable
                key={day}
                onPress={() => setWeekStartsOn(day)}
                style={[
                  styles.row,
                  { borderBottomColor: theme.colors.iosSeparator },
                  isLast && styles.lastRow,
                ]}
              >
                <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                  {t(`weekStart.${day}`)}
                </Text>
                {active && <CheckIcon size={20} color={theme.colors.iosBlue} />}
              </Pressable>
            );
          })}
        </Animated.View>

        <Text
          style={[
            styles.description,
            { color: theme.colors.iosSecondaryLabel },
          ]}
        >
          {t('weekStart.description')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionBody: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
});
