import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ExclamationTriangleIcon from 'react-native-heroicons/outline/ExclamationTriangleIcon';
import SparklesIcon from 'react-native-heroicons/outline/SparklesIcon';
import { useTheme } from '../theme/ThemeProvider';
import { useHabitStore } from '../store/habitStore';
import { Raised } from './neumorphic/NeumorphicView';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';

export default function ProGate({ children }: { children?: React.ReactNode }) {
  const { theme } = useTheme();
  const navigation = useNavigation() as any;
  const isPro = useHabitStore(s => s.isPro);
  const proExpired = useHabitStore(s => s.proExpired);

  if (isPro) return <>{children}</>;

  const expired = proExpired;
  const Icon = expired ? ExclamationTriangleIcon : SparklesIcon;

  return (
    <View style={styles.container}>
      <Raised radius={theme.radii.card} distance={10} style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon size={32} color={theme.colors.accent} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {expired ? 'Your plan has expired' : 'Pro feature'}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          {expired
            ? 'Renew your Pro subscription to keep using this feature.'
            : 'This is a Pro feature. Upgrade to unlock it.'}
        </Text>
        <NeumorphicButton
          radius={16}
          distance={6}
          backgroundColor={theme.colors.accent}
          style={styles.button}
          onPress={() =>
            navigation.navigate(
              'Paywall',
              expired ? { mode: 'expired' } : undefined,
            )
          }
        >
          <Text style={styles.buttonText}>
            {expired ? 'Renew Pro' : 'Upgrade to Pro'}
          </Text>
        </NeumorphicButton>
      </Raised>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  iconWrap: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
