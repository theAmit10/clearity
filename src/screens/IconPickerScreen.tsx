import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlassIcon, XMarkIcon } from 'react-native-heroicons/outline';
import {
  HABIT_ICONS,
  ICON_CATEGORIES,
  type HabitIconKey,
  type HabitIconOption,
  type IconCategory,
} from '../constants/habitIcons';
import { Inset } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '../i18n';

const COLUMNS = 4;

/**
 * Full habit icon catalog grouped by category, with live search across each
 * icon's name, key and category.
 *
 * Presented as a native stack modal (`presentation: 'modal'`, see
 * RootNavigator) — the same presentation HabitDetail uses — so the slide-up,
 * swipe-down-to-dismiss, and rubber-banding are all UIKit-native. The hosts
 * (AddEditHabit, AddEditGoal, NewCategory) navigate here with `selectedKey`,
 * `accentColor`, and an `onSelect` callback; picking calls it and pops back.
 */
export default function IconPickerScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const selectedKey: string = route?.params?.selectedKey ?? '';
  const accentColor: string = route?.params?.accentColor ?? theme.colors.accent;
  const onSelect: (key: HabitIconKey) => void =
    route?.params?.onSelect ?? (() => {});

  const close = () => navigation.goBack();
  const select = (key: HabitIconKey) => {
    onSelect(key);
    close();
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    // Morph the content in sync with the keyboard instead of jumping.
    // iOS-only: Android's adjustResize already resizes the window.
    const animateWithKeyboard = (duration?: number) => {
      if (Platform.OS !== 'ios') return;
      LayoutAnimation.configureNext({
        duration: duration && duration > 0 ? duration : 250,
        update: { type: 'easeInEaseOut' },
      });
    };
    const showSub = Keyboard.addListener(showEvent, e => {
      animateWithKeyboard(
        (e.endCoordinates as { duration?: number }).duration,
      );
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, e => {
      animateWithKeyboard(
        (e.endCoordinates as { duration?: number }).duration,
      );
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const categoryLabel = (category: IconCategory): string =>
    t(`iconCategories.${category}` as TranslationKey);

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = HABIT_ICONS.filter(icon => {
      if (!needle) return true;
      return (
        icon.name.toLowerCase().includes(needle) ||
        icon.key.includes(needle) ||
        categoryLabel(icon.category).toLowerCase().includes(needle)
      );
    });

    return ICON_CATEGORIES.map(category => {
      const icons = matches.filter(icon => icon.category === category);
      return {
        key: category,
        title: categoryLabel(category),
        data: chunk(icons, COLUMNS) as IconRow[],
      };
    }).filter(section => section.data.length > 0);
    // categoryLabel is derived from t, which is stable in the i18n store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, t]);

  const renderRow = ({ item }: { item: IconRow }) => (
    <View style={styles.row}>
      {item.map(icon => {
        const selected = icon.key === selectedKey;
        return (
          <View key={icon.key} style={styles.cell}>
            <NeumorphicButton
              radius={14}
              distance={4}
              forcePressed={selected}
              style={[
                styles.iconOption,
                selected && { backgroundColor: `${accentColor}26` },
              ]}
              onPress={() => select(icon.key)}
            >
              <icon.Icon
                size={22}
                color={selected ? accentColor : theme.colors.textMuted}
              />
            </NeumorphicButton>
            <Text
              numberOfLines={1}
              style={[
                styles.iconName,
                { color: selected ? accentColor : theme.colors.textMuted },
              ]}
            >
              {icon.name}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    // Lift the content onto the keyboard on iOS so results stay visible
    // while typing.
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        // eslint-disable-next-line react-native/no-inline-styles
        { marginBottom: Platform.OS === 'ios' ? keyboardHeight : 0 },
      ]}
    >
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('addHabit.allIcons')}
        </Text>
        <NeumorphicButton
          radius={18}
          distance={3}
          style={styles.closeButton}
          onPress={close}
        >
          <XMarkIcon size={18} color={theme.colors.textMuted} />
        </NeumorphicButton>
      </View>

      <Inset radius={14} style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <MagnifyingGlassIcon size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('addHabit.searchIcons')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityRole="button"
            >
              <XMarkIcon size={16} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>
      </Inset>

      <SectionList
        sections={sections}
        keyExtractor={row => row[0].key}
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              {
                color: theme.colors.textMuted,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
            {t('addHabit.noIconsFound')}
          </Text>
        }
      />
    </View>
  );
}

type IconRow = readonly HabitIconOption[];

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 8,
  },
  handleWrap: { alignItems: 'center', paddingVertical: 6 },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 10,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: { marginHorizontal: 20, marginBottom: 6, paddingHorizontal: 12 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', padding: 0 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },
  row: { flexDirection: 'row' },
  cell: { width: `${100 / COLUMNS}%`, alignItems: 'center', paddingVertical: 6 },
  iconOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  empty: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 40,
  },
});
