import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, Cog6ToothIcon } from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from 'react-native-heroicons/solid';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const TAB_META: Record<
  string,
  { outline: IconComponent; solid: IconComponent; label: string }
> = {
  Home: { outline: HomeIcon, solid: HomeIconSolid, label: 'Home' },
  Settings: {
    outline: Cog6ToothIcon,
    solid: Cog6ToothIconSolid,
    label: 'Settings',
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

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Raised radius={28} distance={8} style={styles.bar}>
        <View style={styles.row}>
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
                style={styles.tabHit}
                hitSlop={6}
              >
                {isFocused ? (
                  <Inset
                    radius={18}
                    style={[
                      styles.tabPill,
                      {
                        backgroundColor: `${neumorphic.colors.accentFallback}22`,
                      },
                    ]}
                  >
                    <Icon size={22} color={neumorphic.colors.accentFallback} />
                    <Text
                      style={[
                        styles.label,
                        { color: neumorphic.colors.accentFallback },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </Inset>
                ) : (
                  <View style={styles.tabPill}>
                    <Icon size={22} color={neumorphic.colors.textMuted} />
                    <Text style={styles.labelInactive}>{meta.label}</Text>
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

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: neumorphic.colors.background,
  },
  bar: {
    padding: 8,
  },
  row: {
    flexDirection: 'row',
  },
  tabHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
  labelInactive: {
    fontSize: 12,
    fontWeight: '700',
    color: neumorphic.colors.textMuted,
  },
});
