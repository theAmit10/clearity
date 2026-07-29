import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitStore } from '../store/habitStore';
import { useTheme } from '../theme/ThemeProvider';

export default function GeneralScreen() {
  const { theme } = useTheme();
  const showCategories = useHabitStore(s => s.showCategories);
  const setShowCategories = useHabitStore(s => s.setShowCategories);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>General</Text>

        <View style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                Show category filters
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                Display category filter bar on the home screen
              </Text>
            </View>
            <Switch
              value={showCategories}
              onValueChange={setShowCategories}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
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
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
