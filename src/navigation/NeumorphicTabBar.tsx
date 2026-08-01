import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, Cog6ToothIcon } from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from 'react-native-heroicons/solid';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '../i18n';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const TAB_META: Record<
  string,
  { outline: IconComponent; solid: IconComponent; labelKey: TranslationKey }
> = {
  Home: { outline: HomeIcon, solid: HomeIconSolid, labelKey: 'tabs.home' },
  Settings: {
    outline: Cog6ToothIcon,
    solid: Cog6ToothIconSolid,
    labelKey: 'tabs.settings',
  },
};

/**
 * Floating pill-style tab bar in the same soft-UI language as the rest
 * of the app: a raised bar sitting above the background, with the
 * active tab rendered as a sunken (inset) pill so it reads as
 * "pressed/selected" rather than just a color change.
 */
export default function NeumorphicTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: theme.colors.background,
      }}
    >
      <Raised radius={28} distance={8} style={{ padding: 8 }}>
        <View style={{ flexDirection: 'row' }}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            const meta = TAB_META[route.name] ?? TAB_META.Home;
            const Icon = isFocused ? meta.solid : meta.outline;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                hitSlop={6}
              >
                {isFocused ? (
                  <Inset
                    radius={18}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      width: '100%',
                      backgroundColor: `${theme.colors.accent}22`,
                    }}
                  >
                    <Icon size={22} color={theme.colors.accent} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: theme.colors.accent,
                      }}
                    >
                      {t(meta.labelKey)}
                    </Text>
                  </Inset>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      width: '100%',
                    }}
                  >
                    <Icon size={22} color={theme.colors.textMuted} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: theme.colors.textMuted,
                      }}
                    >
                      {t(meta.labelKey)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Raised>
    </View>
  );
}
