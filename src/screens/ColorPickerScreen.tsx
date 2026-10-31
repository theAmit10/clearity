import React, { useMemo } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { COLOR_GROUPS, type HabitColorOption } from '../constants/habitColors';
import { Raised } from '../components/neumorphic/NeumorphicView';
import { NeumorphicButton } from '../components/neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import type { TranslationKey } from '../i18n';

const COLUMNS = 5;

/**
 * Full habit color catalog grouped by color family.
 *
 * Presented exactly like IconPickerScreen — a native stack modal
 * (`presentation: 'modal'`, see RootNavigator) — so the slide-up and
 * swipe-down-to-dismiss are UIKit-native. The hosts (AddEditHabit) navigate
 * here with `selectedColor` and an `onSelect` callback; picking calls it
 * and pops back.
 */
export default function ColorPickerScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const selectedColor: string = route?.params?.selectedColor ?? '';
  const onSelect: (hex: string) => void = route?.params?.onSelect ?? (() => {});

  const close = () => navigation.goBack();
  const select = (hex: string) => {
    onSelect(hex);
    close();
  };

  const groupLabel = (key: string): string =>
    t(`colorGroups.${key}` as TranslationKey);

  const sections = useMemo(
    () =>
      COLOR_GROUPS.map(group => ({
        key: group.key,
        title: groupLabel(group.key),
        data: chunk(group.colors, COLUMNS) as ColorRow[],
      })),
    // groupLabel is derived from t, which is stable in the i18n store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const renderRow = ({ item }: { item: ColorRow }) => (
    <View style={styles.row}>
      {item.map(color => {
        const selected = color.hex === selectedColor;
        return (
          <View key={color.hex} style={styles.cell}>
            <Pressable onPress={() => select(color.hex)} hitSlop={4}>
              <Raised
                radius={20}
                distance={4}
                backgroundColor={color.hex}
                style={[
                  styles.colorOption,
                  selected && {
                    borderWidth: 3,
                    borderColor: theme.colors.textPrimary,
                  },
                ]}
              />
            </Pressable>
            <Text
              numberOfLines={1}
              style={[
                styles.colorName,
                { color: selected ? theme.colors.textPrimary : theme.colors.textMuted },
              ]}
            >
              {color.name}
            </Text>
          </View>
        );
      })}
      {/* Keep the last row's cells aligned to the grid. */}
      {item.length < COLUMNS &&
        Array.from({ length: COLUMNS - item.length }, (_, i) => (
          <View key={`pad-${i}`} style={styles.cell} />
        ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('addHabit.allColors')}
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

      <SectionList
        sections={sections}
        keyExtractor={row => row[0].hex}
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
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      />
    </View>
  );
}

type ColorRow = readonly HabitColorOption[];

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
  cell: {
    width: `${100 / COLUMNS}%`,
    alignItems: 'center',
    paddingVertical: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
  },
  colorName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});
