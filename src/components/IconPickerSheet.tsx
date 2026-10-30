import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { Inset, Raised } from './neumorphic/NeumorphicView';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '../i18n';

const COLUMNS = 4;

interface Props {
  visible: boolean;
  /** Currently selected icon key, highlighted in the grid. */
  selectedKey: string;
  /** Accent tint (the habit color) used for the selected icon. */
  accentColor: string;
  onSelect: (key: HabitIconKey) => void;
  onClose: () => void;
}

type IconRow = readonly HabitIconOption[];

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

/**
 * Bottom sheet that exposes the full habit icon catalog grouped by category,
 * with live search across each icon's name, key and category.
 */
export function IconPickerSheet({
  visible,
  selectedKey,
  accentColor,
  onSelect,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Clear the filter when the sheet closes so it always reopens unfiltered.
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  // Explicit height instead of a percentage: the neumorphic surface has no
  // fixed-size ancestor, so percentages have nothing to resolve against.
  // iOS keeps the window size when the keyboard opens, so subtract its height;
  // Android (adjustResize) already shrinks the window.
  const availableHeight =
    Platform.OS === 'ios'
      ? windowHeight - keyboardHeight - insets.top - 24
      : windowHeight * 0.82;
  const sheetHeight = Math.max(280, Math.min(windowHeight * 0.82, availableHeight));

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
              onPress={() => onSelect(icon.key)}
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Raised
          radius={26}
          distance={10}
          style={[styles.sheet, { height: sheetHeight }]}
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
              onPress={onClose}
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
              <Text
                style={[styles.empty, { color: theme.colors.textMuted }]}
              >
                {t('addHabit.noIconsFound')}
              </Text>
            }
          />
        </Raised>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    overflow: 'hidden',
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
