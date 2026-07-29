import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useTheme } from '../theme/ThemeProvider';
import { getOfferings, restorePurchases, isPro, getCustomerInfo } from '../services/revenueCat';
import { logEvent } from '../services/logger';

export default function PaywallScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const [offering, setOffering] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const offerings = await getOfferings();
      if (offerings?.current) {
        setOffering(offerings.current);
      }
      setReady(true);
    })();
  }, []);

  const handleDismiss = async () => {
    const customerInfo = await getCustomerInfo();
    if (isPro(customerInfo)) {
      logEvent('info', 'User became pro via paywall');
    }
    navigation.goBack();
  };

  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.textMuted} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <RevenueCatUI.Paywall
      style={{ backgroundColor: theme.colors.background }}
      options={{
        offering,
        displayCloseButton: true,
      }}
      onDismiss={handleDismiss}
      onRestoreCompleted={async ({ customerInfo }) => {
        if (isPro(customerInfo)) {
          navigation.goBack();
        }
      }}
      onPurchaseCompleted={async () => {
        navigation.goBack();
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
