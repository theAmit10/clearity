import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableHighlight,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  SettingsRevealItem,
  SETTINGS_SHARED_TAGS,
  settingsCardTransition,
} from '../components/SettingsRevealItem';
import { ProUpsellCard } from '../components/ProUpsellCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestReview } from 'react-native-store-review';
import LockClosedIcon from 'react-native-heroicons/outline/LockClosedIcon';
import { useHabitStore } from '../store/habitStore';
import { exportHabits, pickAndParseImportFile } from '../services/importExport';
import { clearAll } from '../services/storage';
import {
  APP_NAME,
  APP_VERSION,
  DEVICE_INFO,
  X_HANDLE,
  FEEDBACK_EMAIL,
  IOS_APP_STORE_ID,
  ANDROID_PACKAGE_NAME,
  FREE_HABIT_LIMIT,
  FREE_THEMES,
} from '../constants/appInfo';
import { useTheme } from '../theme/ThemeProvider';
import { restorePurchases } from '../services/revenueCat';
import { openPaywall } from '../services/paywallRouter';
import { logEvent } from '../services/logger';
import { useTranslation, useI18nStore } from '../i18n';

export default function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const language = useI18nStore(s => s.language);
  const { theme, themeName, setTheme, availableThemes } = useTheme();
  const habits = useHabitStore(s => s.habits);
  const replaceAllHabits = useHabitStore(s => s.replaceAllHabits);
  const mergeHabits = useHabitStore(s => s.mergeHabits);
  const isPro = useHabitStore(s => s.isPro);
  const proExpired = useHabitStore(s => s.proExpired);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const scrollY = useSharedValue(0);
  const { height: viewportHeight } = useWindowDimensions();
  const onScroll = useAnimatedScrollHandler({
    onScroll: e => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportHabits(habits);
    } catch (e: any) {
      Alert.alert(t('settings.exportFailed'), e?.message ?? t('settings.unknownError'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const payload = await pickAndParseImportFile();
      Alert.alert(
        t('settings.importDataTitle'),
        t('settings.importDataBody', { count: payload.habits.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.mergeWithCurrent'),
            onPress: () => mergeHabits(payload.habits),
          },
          {
            text: t('settings.replaceEverything'),
            style: 'destructive',
            onPress: () => replaceAllHabits(payload.habits),
          },
        ],
      );
    } catch (e: any) {
      if (e?.message !== undefined && e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert(t('settings.importFailed'), e?.message ?? t('settings.couldNotReadFile'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFollowX = () => {
    Linking.openURL(`https://x.com/${X_HANDLE}`).catch(() => {
      Alert.alert(t('settings.couldNotOpenX'), t('settings.findUsOnX', { handle: X_HANDLE }));
    });
  };

  const handleSendFeedback = () => {
    const subject = encodeURIComponent('App Feedback');
    const footer = [
      '',
      '',
      '',
      '---',
      `App: ${APP_NAME} v${APP_VERSION}`,
      `Platform: ${DEVICE_INFO}`,
    ].join('\n');
    const body = encodeURIComponent(footer);
    Linking.openURL(
      `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`,
    ).catch(() => {
      Alert.alert(
        t('settings.couldNotOpenMail'),
        t('settings.noMailApp', { email: FEEDBACK_EMAIL }),
      );
    });
  };

  const refreshProStatus = useHabitStore(s => s.refreshProStatus);

  const paywallParams = proExpired ? { mode: 'expired' } : undefined;

  const proBadge = (
    <View style={styles.proBadge}>
      <LockClosedIcon size={12} color={theme.colors.iosGray} />
      <Text style={[styles.proBadgeText, { color: theme.colors.iosGray }]}>
        Pro
      </Text>
    </View>
  );

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const info = await restorePurchases();
      await refreshProStatus();
      const nowPro = useHabitStore.getState().isPro;
      if (!info) {
        Alert.alert(
          t('common.restoreFailed'),
          t('common.restoreFailedBody'),
        );
      } else if (nowPro) {
        Alert.alert(
          t('common.restoreComplete'),
          t('common.restoreCompleteBody'),
        );
      } else {
        Alert.alert(
          t('common.noPurchasesFound'),
          t('common.noPurchasesFoundBody'),
        );
      }
    } catch {
      Alert.alert(
        t('common.restoreFailed'),
        t('common.restoreFailedBody'),
      );
    } finally {
      setRestoring(false);
    }
  };

  const handleCustomerCenter = () => {
    navigation.navigate('ManageSubscription');
  };

  const handleRateApp = () => {
    try {
      requestReview();
    } catch {
      const url = Platform.select({
        ios: `itms-apps://itunes.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`,
        android: `market://details?id=${ANDROID_PACKAGE_NAME}`,
      });
      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            t('settings.couldNotOpenStore'),
            t('settings.searchManually'),
          );
        });
      }
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      t('settings.resetAppTitle'),
      t('settings.resetAppBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
          style: 'destructive',
          onPress: async () => {
            replaceAllHabits([]);
            try {
              await clearAll();
            } catch (e: any) {
              Alert.alert(
                t('settings.partialReset'),
                t('settings.partialResetBody', {
                  error: e?.message ?? t('settings.unknownError'),
                }),
              );
            }
          },
        },
      ],
    );
  };

  function Section({
    title,
    children,
    sharedTag,
  }: {
    title: string;
    children: React.ReactNode;
    sharedTag?: string;
  }) {
    return (
      <SettingsRevealItem scrollY={scrollY} viewportHeight={viewportHeight}>
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {title}
          </Text>
          {sharedTag ? (
            <Animated.View
              sharedTransitionTag={sharedTag}
              sharedTransitionStyle={settingsCardTransition}
              style={[
                styles.sectionBody,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {children}
            </Animated.View>
          ) : (
            <View
              style={[
                styles.sectionBody,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {children}
            </View>
          )}
        </View>
      </SettingsRevealItem>
    );
  }

  function Row({
    label,
    onPress,
    disabled,
    destructive,
    rightContent,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    destructive?: boolean;
    rightContent?: React.ReactNode;
  }) {
    return (
      <TouchableHighlight
        onPress={onPress}
        disabled={disabled}
        underlayColor={theme.colors.iosSeparator}
        activeOpacity={1}
        style={[styles.row, { borderBottomColor: theme.colors.iosSeparator }]}
      >
        <View style={styles.rowInner}>
          <Text
            style={[
              styles.rowLabel,
              { color: theme.colors.iosBlue },
              destructive && { color: theme.colors.iosRed },
              disabled && styles.rowLabelDisabled,
            ]}
          >
            {label}
          </Text>
          {rightContent}
        </View>
      </TouchableHighlight>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.iosBg }]}
    >
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text style={[styles.title, { color: theme.colors.iosLabel }]}>
          {t('settings.title')}
        </Text>

        {!isPro && (
          <SettingsRevealItem
            scrollY={scrollY}
            viewportHeight={viewportHeight}
          >
            <ProUpsellCard
              expired={proExpired}
              onPress={() => openPaywall(navigation, paywallParams)}
            />
          </SettingsRevealItem>
        )}

        <Section
          title={t('settings.generalSection')}
          sharedTag={SETTINGS_SHARED_TAGS.general}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.generalDescription')}
          </Text>
          <Row
            label={t('settings.generalSettings')}
            onPress={() => navigation.navigate('General')}
          />
        </Section>

        <Section
          title={t('settings.habitsSection')}
          sharedTag={SETTINGS_SHARED_TAGS.habits}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.habitsDescription')}
          </Text>
          <Row
            label={t('settings.reorderHabits')}
            onPress={() => navigation.navigate('ReorderHabits')}
          />
          <Row
            label={t('settings.exportData', { count: habits.length })}
            rightContent={isPro ? null : proBadge}
            onPress={() => {
              if (isPro) {
                handleExport();
              } else {
                openPaywall(navigation, paywallParams);
              }
            }}
            disabled={busy}
          />
          <Row
            label={t('settings.importData')}
            rightContent={isPro ? null : proBadge}
            onPress={() => {
              if (isPro) {
                handleImport();
              } else {
                openPaywall(navigation, paywallParams);
              }
            }}
            disabled={busy}
          />
        </Section>

        <Section
          title={t('settings.proSection')}
          sharedTag={SETTINGS_SHARED_TAGS.pro}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {isPro
              ? t('settings.proActive')
              : proExpired
              ? t('settings.proExpired')
              : t('settings.proUpgrade', { count: FREE_HABIT_LIMIT })}
          </Text>
          {isPro ? (
            <Row
              label={t('common.manageSubscription')}
              onPress={handleCustomerCenter}
              disabled={busy}
            />
          ) : (
            <Row
              label={proExpired ? t('common.renewPro') : t('common.upgradeToPro')}
              onPress={() => openPaywall(navigation, paywallParams)}
              disabled={busy}
            />
          )}
          <Row
            label={restoring ? t('settings.restoring') : t('common.restorePurchases')}
            onPress={handleRestore}
            disabled={busy || restoring}
            rightContent={
              restoring ? (
                <ActivityIndicator size="small" color={theme.colors.iosBlue} />
              ) : null
            }
          />
        </Section>

        <Section
          title={t('settings.widgetSection')}
          sharedTag={SETTINGS_SHARED_TAGS.widget}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.widgetDescription')}
          </Text>
          <Row
            label={t('settings.widgetSettings')}
            rightContent={isPro ? null : proBadge}
            onPress={() => {
              if (isPro) {
                navigation.navigate('WidgetSettings');
              } else {
                openPaywall(navigation, paywallParams);
              }
            }}
          />
        </Section>

        <Section
          title={t('settings.analyticsSection')}
          sharedTag={SETTINGS_SHARED_TAGS.analytics}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.analyticsDescription')}
          </Text>
          <Row
            label={t('settings.viewAnalytics')}
            rightContent={isPro ? null : proBadge}
            onPress={() => {
              if (isPro) {
                navigation.navigate('Analytics');
              } else {
                openPaywall(navigation, paywallParams);
              }
            }}
          />
        </Section>

        <Section
          title={t('settings.notificationsSection')}
          sharedTag={SETTINGS_SHARED_TAGS.notifications}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.notificationsDescription')}
          </Text>
          <Row
            label={t('settings.notificationSettings')}
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </Section>

        <Section
          title={t('languageSettings.section')}
          sharedTag={SETTINGS_SHARED_TAGS.language}
        >
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('languageSettings.description')}
          </Text>
          <Row
            label={t(`languages.${language}`)}
            onPress={() => navigation.navigate('Language')}
          />
        </Section>

        <Section title={t('settings.themeSection')}>
          {availableThemes.map(themeOption => {
            const active = themeName === themeOption.name;
            const isPremium = !FREE_THEMES.includes(themeOption.name);
            const locked = isPremium && !isPro;
            return (
              <Row
                key={themeOption.name}
                label={`${active ? '✓ ' : '   '}${t(`themes.${themeOption.name}`)}`}
                rightContent={locked ? proBadge : null}
                onPress={() => {
                  if (locked) {
                    openPaywall(navigation, paywallParams);
                  } else {
                    setTheme(themeOption.name);
                  }
                }}
              />
            );
          })}
        </Section>

        <Section title={t('settings.communitySection')}>
          <Row label={t('settings.buildTogether')} onPress={handleRateApp} />
          <Row label={t('settings.sendFeedback')} onPress={handleSendFeedback} />
          <Row label={t('settings.followOnX', { handle: X_HANDLE })} onPress={handleFollowX} />
        </Section>

        {/* <Section title="Diagnostics (stored locally only)">
          <Text style={styles.description}>
            The app never sends anything over the network. Errors and events are
            logged on-device so you can export and inspect them yourself.
          </Text>
          <Row label="Export diagnostic logs" onPress={handleExportLogs} />
          <Row
            label="Clear diagnostic logs"
            onPress={handleClearLogs}
            destructive
          />
        </Section> */}

        <Section title={t('settings.diagnosticsSection')}>
          <Text
            style={[
              styles.description,
              { color: theme.colors.iosSecondaryLabel },
            ]}
          >
            {t('settings.diagnosticsDescription')}
          </Text>
          <Row
            label={t('settings.diagnosticsRow')}
            onPress={() => navigation.navigate('Diagnostics')}
          />
        </Section>

        <Section title={t('settings.dangerZone')}>
          <Row
            label={t('settings.resetApp')}
            onPress={handleResetApp}
            destructive
          />
        </Section>
      </Animated.ScrollView>
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
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  description: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
    paddingLeft: 5,
    paddingTop: 5,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 16, flex: 1 },
  rowLabelDisabled: { opacity: 0.4 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
