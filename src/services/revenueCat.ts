import Purchases, {
  PurchasesOfferings,
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { REVENUECAT_API_KEY, REVENUECAT_ENTITLEMENT_ID } from '../constants/appInfo';
import { logEvent } from './logger';

let configured = false;
let customerInfoCallback: ((info: CustomerInfo) => void) | null = null;

export function setOnCustomerInfoUpdate(callback: (info: CustomerInfo) => void): void {
  customerInfoCallback = callback;
  Purchases.addCustomerInfoUpdateListener(info => {
    customerInfoCallback?.(info);
  });
}

export async function initRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    logEvent('warn', 'RevenueCat API key not configured');
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    configured = true;
    logEvent('info', 'RevenueCat initialized');
  } catch (err) {
    logEvent('error', 'Failed to init RevenueCat', err);
  }
}

export function isConfigured(): boolean {
  return configured;
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    logEvent('error', 'Failed to fetch offerings', err);
    return null;
  }
}

export async function purchasePackage(
  aPackage: PurchasesPackage,
): Promise<{ customerInfo: CustomerInfo } | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(aPackage);
    logEvent('info', 'Purchase successful', {
      product: aPackage.identifier,
      entitlement: REVENUECAT_ENTITLEMENT_ID,
    });
    return { customerInfo };
  } catch (err: any) {
    if (err?.userCancelled) {
      logEvent('info', 'Purchase cancelled by user');
      return null;
    }
    logEvent('error', 'Purchase failed', err);
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    logEvent('info', 'Restore completed', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
    });
    return customerInfo;
  } catch (err) {
    logEvent('error', 'Restore failed', err);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    logEvent('error', 'Failed to get customer info', err);
    return null;
  }
}

export function isPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive ?? false;
}

export function getProExpirationDate(customerInfo: CustomerInfo | null): string | null {
  if (!customerInfo) return null;
  return customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.expirationDate ?? null;
}

export async function showManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch (err) {
    logEvent('error', 'Failed to show manage subscriptions', err);
  }
}
