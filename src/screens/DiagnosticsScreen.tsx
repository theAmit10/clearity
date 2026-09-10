import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import {
  usePaywallVariantStore,
  type PaywallVariant,
} from '../store/paywallVariantStore';

function OptionRow({
  selected,
  title,
  body,
  onSelect,
  accent,
  textPrimary,
  textMuted,
}: {
  selected: boolean;
  title: string;
  body: string;
  onSelect: () => void;
  accent: string;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.option,
        selected && [styles.optionSelected, { borderColor: accent }],
      ]}
    >
      <View style={[styles.radio, selected && { borderColor: accent }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: accent }]} />}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: textPrimary }]}>{title}</Text>
        <Text style={[styles.optionBody, { color: textMuted }]}>{body}</Text>
      </View>
    </Pressable>
  );
}

export default function DiagnosticsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const variant = usePaywallVariantStore(s => s.variant);
  const setVariant = usePaywallVariantStore(s => s.setVariant);

  const pick = (v: PaywallVariant) => {
    setVariant(v);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>
          {t('diagnostics.title')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.iosSecondaryLabel }]}>
          {t('diagnostics.subtitle')}
        </Text>

        <OptionRow
          selected={variant === 'classic'}
          title={t('diagnostics.classicTitle')}
          body={t('diagnostics.classicBody')}
          onSelect={() => pick('classic')}
          accent={theme.colors.accent}
          textPrimary={theme.colors.iosLabel}
          textMuted={theme.colors.iosSecondaryLabel}
        />
        <OptionRow
          selected={variant === 'v2'}
          title={t('diagnostics.newTitle')}
          body={t('diagnostics.newBody')}
          onSelect={() => pick('v2')}
          accent={theme.colors.accent}
          textPrimary={theme.colors.iosLabel}
          textMuted={theme.colors.iosSecondaryLabel}
        />

        <Text style={[styles.saved, { color: theme.colors.iosSecondaryLabel }]}>
          {t('diagnostics.saved')}: {variant}
        </Text>

        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('Paywall')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.iosBlue }]}>
            {t('diagnostics.previewClassic')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.navigate('PaywallV2')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.iosBlue }]}>
            {t('diagnostics.previewNew')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionBody: { fontSize: 13, marginTop: 2 },
  saved: { fontSize: 12, marginTop: 4 },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginTop: 4 },
  buttonText: { fontSize: 16, textAlign: 'center', fontWeight: '600' },
});
