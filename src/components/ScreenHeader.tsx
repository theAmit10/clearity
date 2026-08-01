import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

interface Props {
  navigation: any;
  title: string;
  backLabel?: string;
}

export default function ScreenHeader({ navigation, title, backLabel }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const label = backLabel ?? t('common.settings');

  return (
    <>
      <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
        <Text style={[styles.backArrow, { color: theme.colors.iosBlue }]}>
          ←
        </Text>
        <Text style={[styles.backText, { color: theme.colors.iosBlue }]}>
          {label}
        </Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.colors.iosLabel }]}>
        {title}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: {
    fontSize: 22,
    marginRight: 4,
    ...Platform.select({
      android: {
        lineHeight: 22,
        textAlignVertical: 'center',
        includeFontPadding: false,
      },
    }),
  },
  backText: { fontSize: 17 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
});
