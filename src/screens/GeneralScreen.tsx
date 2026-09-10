import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import {
  SETTINGS_SHARED_TAGS,
  settingsCardTransition,
} from '../components/SettingsRevealItem';
import ClipboardIcon from 'react-native-heroicons/outline/ClipboardDocumentIcon';
import CheckIcon from 'react-native-heroicons/outline/CheckIcon';
import { useHabitStore } from '../store/habitStore';
import { getAppUserId } from '../services/revenueCat';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';
import ScreenHeader from '../components/ScreenHeader';

export default function GeneralScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isPro = useHabitStore(s => s.isPro);
  const showCategories = useHabitStore(s => s.showCategories);
  const setShowCategories = useHabitStore(s => s.setShowCategories);
  const showStreaks = useHabitStore(s => s.showStreaks);
  const setShowStreaks = useHabitStore(s => s.setShowStreaks);
  const showCategoryBadges = useHabitStore(s => s.showCategoryBadges);
  const setShowCategoryBadges = useHabitStore(s => s.setShowCategoryBadges);
  const showFrequency = useHabitStore(s => s.showFrequency);
  const setShowFrequency = useHabitStore(s => s.setShowFrequency);
  const crashlyticsEnabled = useHabitStore(s => s.crashlyticsEnabled);
  const setCrashlyticsEnabled = useHabitStore(s => s.setCrashlyticsEnabled);

  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    getAppUserId().then(id => {
      if (active) setUserId(id);
    });
    return () => {
      active = false;
    };
  }, [isPro]);

  const handleCopy = () => {
    if (!userId) return;
    Clipboard.setString(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.iosBg }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <ScreenHeader navigation={navigation} title={t('general.title')} />

        {isPro && (
          <View style={[styles.sectionBody, styles.idSection, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                  {t('general.userId')}
                </Text>
                <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                  {t('general.userIdHint')}
                </Text>
              </View>
            </View>
            <View style={[styles.row, styles.lastRow]}>
              <Text
                style={[styles.idText, { color: theme.colors.iosLabel }]}
                numberOfLines={2}
              >
                {userId ?? '…'}
              </Text>
              <Pressable
                onPress={handleCopy}
                disabled={!userId}
                hitSlop={8}
                style={[styles.copyButton, { backgroundColor: theme.colors.insetFill }]}
              >
                {copied ? (
                  <CheckIcon size={16} color={theme.colors.iosGreen} />
                ) : (
                  <ClipboardIcon size={16} color={theme.colors.iosBlue} />
                )}
                <Text
                  style={[
                    styles.copyText,
                    { color: copied ? theme.colors.iosGreen : theme.colors.iosBlue },
                  ]}
                >
                  {copied ? t('common.copied') : t('common.copy')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <Animated.View
          sharedTransitionTag={SETTINGS_SHARED_TAGS.general}
          sharedTransitionStyle={settingsCardTransition}
          style={[styles.sectionBody, { backgroundColor: theme.colors.surface }]}
        >
          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                {t('general.showCategories')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                {t('general.showCategoriesHint')}
              </Text>
            </View>
            <Switch
              value={showCategories}
              onValueChange={setShowCategories}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                {t('general.showStreaks')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                {t('general.showStreaksHint')}
              </Text>
            </View>
            <Switch
              value={showStreaks}
              onValueChange={setShowStreaks}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                {t('general.showCategoryBadges')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                {t('general.showCategoryBadgesHint')}
              </Text>
            </View>
            <Switch
              value={showCategoryBadges}
              onValueChange={setShowCategoryBadges}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                {t('general.showFrequency')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                {t('general.showFrequencyHint')}
              </Text>
            </View>
            <Switch
              value={showFrequency}
              onValueChange={setShowFrequency}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.iosLabel }]}>
                {t('general.crashReporting')}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.iosSecondaryLabel }]}>
                {t('general.crashReportingHint')}
              </Text>
            </View>
            <Switch
              value={crashlyticsEnabled}
              onValueChange={setCrashlyticsEnabled}
              trackColor={{ false: theme.colors.iosSeparator, true: theme.colors.iosBlue }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Animated.View>
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
  idSection: {
    marginBottom: 20,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  idText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
