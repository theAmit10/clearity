import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from '../services/logger';

export type PaywallVariant = 'classic' | 'v2';

const STORAGE_KEY = '@habit_tracker/paywall_variant';

interface PaywallVariantState {
  variant: PaywallVariant;
  loaded: boolean;
  setVariant: (variant: PaywallVariant) => Promise<void>;
  loadVariant: () => Promise<void>;
}

export const usePaywallVariantStore = create<PaywallVariantState>((set) => ({
  variant: 'v2',
  loaded: false,
  setVariant: async (variant) => {
    set({ variant });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, variant);
    } catch (err) {
      logEvent('error', 'Failed to persist paywall variant', err);
    }
  },
  loadVariant: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'v2') {
        set({ variant: 'v2', loaded: true });
        return;
      }
      if (stored === 'classic') {
        // V2 is now the default for everyone — migrate legacy choice.
        set({ variant: 'v2', loaded: true });
        try {
          await AsyncStorage.setItem(STORAGE_KEY, 'v2');
        } catch (err) {
          logEvent('error', 'Failed to persist paywall variant', err);
        }
        return;
      }
    } catch (err) {
      logEvent('error', 'Failed to load paywall variant', err);
    }
    set({ variant: 'v2', loaded: true });
  },
}));

export function getStoredVariantSync(): PaywallVariant {
  return usePaywallVariantStore.getState().variant;
}
