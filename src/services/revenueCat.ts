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
let usingMockOfferings = false;
let devProActive = false;

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
  
    // Purchases.configure({ apiKey: 'test_xNzepmMnpogpVQWuTMAAboKrezP' });
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

function createMockPackage(identifier: string, price: number, priceString: string, perWeek: string): PurchasesPackage {
  return {
    identifier,
    packageType: identifier,
    product: {
      identifier,
      description: `${identifier} plan`,
      title: `${identifier} plan`,
      price,
      priceString,
      currencyCode: 'USD',
      pricePerMonth: price / 12,
      pricePerWeek: perWeek ? parseFloat(perWeek.replace('$', '')) : null,
      pricePerMonthString: `$${(price / 12).toFixed(2)}`,
      pricePerWeekString: perWeek,
    },
  } as unknown as PurchasesPackage;
}

function createMockOfferings(): PurchasesOfferings {
  return {
    all: {},
    current: {
      identifier: 'default',
      serverDescription: 'Local development fallback',
      metadata: {},
      weekly: createMockPackage('weekly_hrc', 3.99, '$3.99', '$3.99'),
      annual: createMockPackage('yearly_hrc', 29.99, '$29.99', '$0.58'),
      lifetime: createMockPackage('lifetime_hrc', 59.99, '$59.99', ''),
      monthly: null,
      sixMonth: null,
      threeMonth: null,
      twoMonth: null,
    },
  } as unknown as PurchasesOfferings;
}

// export async function getOfferings(): Promise<PurchasesOfferings | null> {
//   try {
//     const offerings = await Purchases.getOfferings();
//     if (offerings?.current) {
//       logEvent('info', 'Offerings loaded from RevenueCat');
//       return offerings;
//     }
//     logEvent('warn', 'No offerings from RevenueCat — using local fallback');
//     usingMockOfferings = true;
//     return createMockOfferings();
//   } catch (err) {
//     logEvent('error', 'Failed to fetch offerings, using local fallback', err);
//     usingMockOfferings = true;
//     return createMockOfferings();
//   }
// }

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings?.current) {
      logEvent('info', 'Offerings loaded from RevenueCat');
      return offerings;
    }
    logEvent('warn', 'No offerings from RevenueCat — check ASC product status, RevenueCat Offering config, and API key');
    return null; // don't silently mock — surface the real state
  } catch (err) {
    logEvent('error', 'Failed to fetch offerings', err);
    return null; // don't silently mock — surface the real error
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
    if (usingMockOfferings) {
      logEvent('info', 'Dev mode: simulating successful purchase');
      devProActive = true;
      return { customerInfo: { entitlements: { active: { [REVENUECAT_ENTITLEMENT_ID]: { isActive: true } } } } } as any;
    }
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
    if (usingMockOfferings) {
      logEvent('info', 'Dev mode: simulating restore success');
      devProActive = true;
      return { entitlements: { active: { [REVENUECAT_ENTITLEMENT_ID]: { isActive: true } } } } as any;
    }
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (devProActive) {
    return { entitlements: { active: { [REVENUECAT_ENTITLEMENT_ID]: { isActive: true } } } } as any;
  }
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    logEvent('error', 'Failed to get customer info', err);
    return null;
  }
}

export async function getAppUserId(): Promise<string | null> {
  try {
    return await Purchases.getAppUserID();
  } catch (err) {
    logEvent('error', 'Failed to get app user id', err);
    return null;
  }
}

export function isPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]?.isActive ?? false;
}

function getProEntitlement(
  customerInfo: CustomerInfo | null,
): { isActive: boolean; expirationDate: string | null } | null {
  if (!customerInfo) return null;
  return customerInfo.entitlements.all[REVENUECAT_ENTITLEMENT_ID] ?? null;
}

export function hadProButExpired(customerInfo: CustomerInfo | null): boolean {
  const ent = getProEntitlement(customerInfo);
  return !!ent && !ent.isActive;
}

export function getProExpirationDate(customerInfo: CustomerInfo | null): string | null {
  return getProEntitlement(customerInfo)?.expirationDate ?? null;
}

export async function showManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch (err) {
    logEvent('error', 'Failed to show manage subscriptions', err);
  }
}

export function resetDevProStatus(): void {
  devProActive = false;
}
