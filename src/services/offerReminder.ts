import notifee, { TriggerType } from '@notifee/react-native';
import { t } from '../i18n';
import { logEvent } from './logger';
import {
  isLifetimeOfferActive,
  getLifetimeOfferEndMs,
  getLifetimeOfferEndLabel,
  LIFETIME_OFFER_ID,
  LIFETIME_OFFER_DISCOUNT_PCT,
} from './offerConfig';
import { CHANNEL_ID } from './notification';
import { useHabitStore } from '../store/habitStore';

/**
 * Daily local reminder for the scheduled lifetime offer (through local
 * Oct 22, 2026).
 *
 * - 1/day at ~10am local via FINITE one-shot triggers, one per remaining
 *   day through Oct 22. Deliberately no DAILY repeat: a repeating trigger
 *   can only be cancelled when the app launches, so it could keep firing
 *   after the offer ends if the user stops opening the app. One-shots can
 *   never outlive the window.
 * - Copy carries only stable facts (discount %, end date) because scheduled
 *   content is frozen at schedule time — a live day-count would go stale.
 * - Never prompts for permission: if notifications are denied this silently
 *   no-ops. Never fires for Pro users or after expiry.
 */

/** Legacy id from the first build (single DAILY repeating trigger). */
export const OFFER_REMINDER_ID = 'offer-lifetime50';
const OFFER_REMINDER_PREFIX = 'offer-lifetime50-';
const DAILY_HOUR = 10;

function dayId(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${OFFER_REMINDER_PREFIX}${d.getFullYear()}-${mm}-${dd}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Cold-start tap flag: set when the app is opened from the offer
// notification before navigation is ready; drained by RootNavigator onReady.
let pendingTap = false;
export function markOfferPushTap(): void {
  pendingTap = true;
}
export function drainOfferPushTap(): boolean {
  const v = pendingTap;
  pendingTap = false;
  return v;
}

export function isOfferPushNotification(notificationId?: string): boolean {
  return (
    notificationId === OFFER_REMINDER_ID ||
    (notificationId?.startsWith(OFFER_REMINDER_PREFIX) ?? false)
  );
}

/** Cancel the legacy repeating id plus every per-day one-shot. */
async function cancelAllOfferNotifications(nowMs: number): Promise<void> {
  await notifee.cancelNotification(OFFER_REMINDER_ID);
  const now = new Date(nowMs);
  const cursor = startOfDay(now);
  const lastDay = startOfDay(new Date(getLifetimeOfferEndMs() - 1));
  while (cursor.getTime() <= lastDay.getTime()) {
    await notifee.cancelNotification(dayId(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
}

/** Schedule the daily reminder, or cancel it when ineligible. Idempotent. */
export async function syncOfferReminder(nowMs: number = Date.now()): Promise<void> {
  try {
    await cancelAllOfferNotifications(nowMs);
    const isPro = useHabitStore.getState().isPro;
    if (isPro || !isLifetimeOfferActive(nowMs)) {
      return;
    }
    const endMs = getLifetimeOfferEndMs();
    const title = t('offerPush.title', {
      pct: LIFETIME_OFFER_DISCOUNT_PCT,
      date: getLifetimeOfferEndLabel(),
    });
    const body = t('offerPush.body', {});
    const cursor = startOfDay(new Date(nowMs));
    const lastDay = startOfDay(new Date(endMs - 1));
    while (cursor.getTime() <= lastDay.getTime()) {
      const fire = new Date(cursor);
      fire.setHours(DAILY_HOUR, 0, 0, 0);
      if (fire.getTime() > nowMs && fire.getTime() < endMs) {
        await notifee.createTriggerNotification(
          {
            id: dayId(cursor),
            title,
            body,
            android: { channelId: CHANNEL_ID },
            data: { source: 'offer_push', offer_id: LIFETIME_OFFER_ID },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: fire.getTime(),
          },
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } catch (err) {
    // Reminder is non-critical (e.g. permission denied) — never crash launch.
    logEvent('error', 'offerReminder: sync failed', { error: String(err) });
  }
}

export async function cancelOfferReminder(): Promise<void> {
  try {
    await cancelAllOfferNotifications(Date.now());
  } catch {
    // non-critical
  }
}

/**
 * Cold-start check: was the app opened from the offer notification?
 * Guarded for test mocks / older notifee versions without this API.
 */
export async function wasOpenedFromOfferPush(): Promise<boolean> {
  try {
    const fn = (notifee as any)?.getInitialNotification;
    if (typeof fn !== 'function') return false;
    const initial = await fn.call(notifee);
    return isOfferPushNotification(initial?.notification?.id);
  } catch {
    return false;
  }
}
