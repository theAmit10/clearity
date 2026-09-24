import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
}));
jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: '',
  REVENUECAT_API_KEY: '',
}));
// Force the offer window on so this test never goes stale after Oct 22.
jest.mock('../src/services/offerConfig', () => {
  const actual = jest.requireActual('../src/services/offerConfig');
  return {
    ...actual,
    isLifetimeOfferActive: () => true,
    getLifetimeOfferDaysLeft: () => 5,
  };
});

import { OfferBanner } from '../src/components/OfferBanner';

function renderBanner(onPress: jest.Mock, onClose: jest.Mock) {
  let testRenderer: renderer.ReactTestRenderer;
  renderer.act(() => {
    testRenderer = renderer.create(
      <OfferBanner onPress={onPress} onClose={onClose} />,
    );
  });
  return testRenderer!;
}

describe('OfferBanner dismiss', () => {
  it('renders offer copy plus a dismiss button', () => {
    const tree = renderBanner(jest.fn(), jest.fn());
    const texts = tree.root
      .findAll(
        node =>
          typeof node.type === 'string' &&
          node.type.toLowerCase().includes('text'),
      )
      .flatMap(node => node.children)
      .filter((c): c is string => typeof c === 'string')
      .map(s => s.trim())
      .filter(Boolean)
      .join(' | ');
    expect(texts).toContain('50% OFF Forever Pass');
    expect(texts).toContain('✕');
    const dismiss = tree.root.find(
      node => node.props?.accessibilityLabel === 'Dismiss',
    );
    expect(dismiss).toBeTruthy();
  });

  it('✕ calls onClose without opening the paywall', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const tree = renderBanner(onPress, onClose);
    const dismiss = tree.root.find(
      node => node.props?.accessibilityLabel === 'Dismiss',
    );
    renderer.act(() => {
      dismiss.props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('tapping the body opens the paywall', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const tree = renderBanner(onPress, onClose);
    const body = tree.root.find(node =>
      String(node.props?.accessibilityLabel ?? '').includes('Forever Pass'),
    );
    renderer.act(() => {
      body.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
