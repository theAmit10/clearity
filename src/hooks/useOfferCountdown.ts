import { useEffect, useState } from 'react';
import { getLifetimeOfferEndMs } from '../services/offerConfig';

export interface OfferCountdown {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  expired: boolean;
}

function computeCountdown(nowMs: number): OfferCountdown {
  const diff = getLifetimeOfferEndMs() - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
  }
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
    expired: false,
  };
}

/**
 * Live DD:HH:MM:SS countdown to the lifetime offer end. Ticks every second
 * while `active`; the interval is cleared on unmount or when deactivated.
 * Re-rendering every second also re-evaluates the date gate in
 * `usePaywallPricing`, so the offer treatment disappears live at expiry.
 */
export function useOfferCountdown(active: boolean): OfferCountdown {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return computeCountdown(nowMs);
}
