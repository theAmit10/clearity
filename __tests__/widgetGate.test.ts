import {
  WidgetModule,
  buildWidgetPayloadForState,
} from '../src/native/WidgetModule';
import {
  WIDGET_PAYWALL_URL,
  isWidgetPaywallUrl,
  markWidgetPaywallTap,
  drainWidgetPaywallTap,
} from '../src/services/widgetDeepLink';

const habits = [
  {
    id: 'h1',
    name: 'Run',
    color: '#FF0000',
    icon: 'fire',
    frequency: 'daily' as const,
    completions: { '2026-10-08': 1 },
  },
];

describe('widget Pro gate', () => {
  it('builds a full unlocked payload for Pro', () => {
    const payload = buildWidgetPayloadForState(habits, {
      isPro: true,
      proExpired: false,
    });
    expect(payload.locked).toBe(false);
    expect(payload.habits).toHaveLength(1);
  });

  it('builds an empty locked payload for free users', () => {
    const payload = buildWidgetPayloadForState(habits, {
      isPro: false,
      proExpired: false,
    });
    expect(payload).toMatchObject({
      habits: [],
      locked: true,
      lockMode: 'free',
    });
    expect(payload.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('marks expiry so native shows Renew copy', () => {
    const payload = buildWidgetPayloadForState(habits, {
      isPro: false,
      proExpired: true,
    });
    expect(payload).toMatchObject({ habits: [], locked: true, lockMode: 'expired' });
  });

  it('legacy buildPayload stays unlocked-shape compatible', () => {
    const payload = WidgetModule.buildPayload(habits);
    expect(payload.habits).toHaveLength(1);
    expect(payload.locked).toBeUndefined();
  });
});

describe('widget paywall deep link', () => {
  it('recognizes the widget paywall URL', () => {
    expect(isWidgetPaywallUrl(WIDGET_PAYWALL_URL)).toBe(true);
    expect(isWidgetPaywallUrl('habita://paywall?source=widget')).toBe(true);
  });

  it('rejects other URLs', () => {
    expect(isWidgetPaywallUrl(null)).toBe(false);
    expect(isWidgetPaywallUrl(undefined)).toBe(false);
    expect(isWidgetPaywallUrl('')).toBe(false);
    expect(isWidgetPaywallUrl('habita://paywall?source=offer_push')).toBe(false);
    expect(isWidgetPaywallUrl('habita://home')).toBe(false);
    expect(isWidgetPaywallUrl('https://example.com')).toBe(false);
  });

  it('parks and drains cold-start taps', () => {
    expect(drainWidgetPaywallTap()).toBe(false);
    markWidgetPaywallTap();
    expect(drainWidgetPaywallTap()).toBe(true);
    expect(drainWidgetPaywallTap()).toBe(false);
  });
});
