import {
  getLifetimeOfferEndMs,
  isLifetimeOfferActive,
  getLifetimeOfferDaysLeft,
  getLifetimeOfferProps,
  getLifetimeOfferEndLabel,
  LIFETIME_OFFER_ID,
  LIFETIME_OFFER_DISCOUNT_PCT,
} from '../src/services/offerConfig';

// All assertions use local date components (same construction as the
// implementation), so they hold in any device timezone.
describe('lifetime offer window (local end-of-day Oct 22, 2026)', () => {
  it('ends at local Oct 23 00:00', () => {
    expect(getLifetimeOfferEndMs()).toBe(new Date(2026, 9, 23).getTime());
  });

  it('is active through local Oct 22 23:59, inactive from local Oct 23', () => {
    expect(
      isLifetimeOfferActive(new Date(2026, 9, 22, 23, 59, 59).getTime()),
    ).toBe(true);
    expect(isLifetimeOfferActive(new Date(2026, 9, 23, 0, 0, 1).getTime())).toBe(
      false,
    );
    expect(isLifetimeOfferActive(new Date(2026, 9, 24).getTime())).toBe(false);
  });

  it('counts whole days left (ceil), 0 once expired', () => {
    expect(getLifetimeOfferDaysLeft(new Date(2026, 9, 22, 12).getTime())).toBe(
      1,
    );
    expect(getLifetimeOfferDaysLeft(new Date(2026, 9, 1).getTime())).toBe(22);
    expect(getLifetimeOfferDaysLeft(new Date(2026, 9, 23).getTime())).toBe(0);
  });

  it('labels the end as the 22nd in any timezone', () => {
    expect(getLifetimeOfferEndLabel()).toContain('22');
  });

  it('exposes stable funnel props', () => {
    const props = getLifetimeOfferProps(new Date(2026, 9, 22, 12).getTime());
    expect(props.offer_id).toBe(LIFETIME_OFFER_ID);
    expect(props.discount_pct).toBe(LIFETIME_OFFER_DISCOUNT_PCT);
    expect(props.days_left).toBe(1);
  });
});
