import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CheckIcon from 'react-native-heroicons/outline/CheckIcon';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation, useI18nStore, LANGUAGES } from '../i18n';
import ScreenHeader from '../components/ScreenHeader';

export default function LanguageScreen({ navigation }: any) {
  const { t } = useTranslation();
  const language = useI18nStore(s => s.language);
  const setLanguage = useI18nStore(s => s.setLanguage);
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.iosBg }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <ScreenHeader
          navigation={navigation}
          title={t('languageSettings.title')}
        />

        <View
          style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}
        >
          {LANGUAGES.map((code, index) => {
            const active = language === code;
            const isLast = index === LANGUAGES.length - 1;
            return (
              <Pressable
                key={code}
                onPress={() => setLanguage(code)}
                style={[
                  styles.row,
                  { borderBottomColor: theme.colors.iosSeparator },
                  isLast && styles.lastRow,
                ]}
              >
                <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                  {t(`languages.${code}`)}
                </Text>
                {active && <CheckIcon size={20} color={theme.colors.iosBlue} />}
              </Pressable>
            );
          })}
        </View>
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
});
