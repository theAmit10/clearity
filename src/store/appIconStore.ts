import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { logEvent } from '../services/logger';

export type AppIconName = 'default' | 'dark';

/** Name of the alternate app icon set in Images.xcassets (iOS only). */
export const DARK_APP_ICON = 'AppIcon-Dark';

const STORAGE_KEY = '@app_icon';

function nativeModule(): any {
  if (Platform.OS !== 'ios') return null;
  return NativeModules.AppIconModule ?? null;
}

function toNativeName(icon: AppIconName): string | null {
  return icon === 'dark' ? DARK_APP_ICON : null;
}

/**
 * Home Screen icon choice, persisted in AsyncStorage as the source of truth
 * for the UI. iOS itself also remembers the active icon across launches; on
 * load we reconcile the two (no-op when they already agree, so the system's
 * "icon changed" alert never replays on launch).
 */
interface AppIconState {
  icon: AppIconName;
  loaded: boolean;
  loadIcon: () => Promise<void>;
  /** Apply + persist. Resolves false when the native switch failed. */
  setIcon: (icon: AppIconName) => Promise<boolean>;
}

export const useAppIconStore = create<AppIconState>((set, get) => ({
  icon: 'default',
  loaded: false,
  loadIcon: async () => {
    let icon: AppIconName = 'default';
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'dark') icon = 'dark';
    } catch (err) {
      logEvent('error', 'Failed to load app icon choice', err);
    }
    set({ icon, loaded: true });

    const native = nativeModule();
    if (!native) return;
    try {
      await native.setIcon(toNativeName(icon));
    } catch (err) {
      // Repairs rare drift (e.g. an interrupted icon change); never blocks
      // startup.
      logEvent('error', 'Failed to reconcile app icon with iOS', err);
    }
  },
  setIcon: async icon => {
    if (get().icon === icon) return true;

    const native = nativeModule();
    if (native) {
      try {
        await native.setIcon(toNativeName(icon));
      } catch (err) {
        logEvent('error', 'Failed to apply app icon', err);
        return false;
      }
    }

    set({ icon });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, icon);
    } catch (err) {
      logEvent('error', 'Failed to persist app icon choice', err);
    }
    return true;
  },
}));

/**
 * Fade out the native launch overlay (AppDelegate) — call once the themed
 * React root is on screen. No-op on Android / where the module is missing.
 */
export function hideLaunchOverlay(): void {
  try {
    nativeModule()?.hideLaunchOverlay?.();
  } catch (err) {
    logEvent('error', 'Failed to hide launch overlay', err);
  }
}
