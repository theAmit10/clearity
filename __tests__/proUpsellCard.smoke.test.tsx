import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn().mockResolvedValue(undefined),
  requestPermission: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  AndroidImportance: { HIGH: 'high' },
  EventType: { PRESS: 'press', ACTION_PRESS: 'action_press' },
  RepeatFrequency: { DAILY: 'daily' },
  TriggerType: { TIMESTAMP: 'timestamp' },
}));
jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
}));
jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: '',
  REVENUECAT_API_KEY: '',
}));

import { ProUpsellCard } from '../src/components/ProUpsellCard';
import { ThemeProvider } from '../src/theme/ThemeProvider';

describe('ProUpsellCard smoke', () => {
  it('renders brand and both headline lines', () => {
    let testRenderer: renderer.ReactTestRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(
        <ThemeProvider>
          <ProUpsellCard onPress={() => {}} />
        </ThemeProvider>,
      );
    });
    const texts = testRenderer!.root
      .findAll(
        node =>
          typeof node.type === 'string' &&
          node.type.toLowerCase().includes('text'),
      )
      .flatMap(node => node.children)
      .filter((c): c is string => typeof c === 'string')
      .map(s => s.trim())
      .filter(Boolean);
    const joined = texts.join(' | ');
    expect(joined).toContain('Habitic Unlimited');
    expect(joined).toContain('Consistency is a choice.');
    expect(joined).toContain('Make yours easier.');
  });

  it('falls back to a solid background before layout is measured', () => {
    let testRenderer: renderer.ReactTestRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(
        <ThemeProvider>
          <ProUpsellCard onPress={() => {}} />
        </ThemeProvider>,
      );
    });
    // onLayout never fires in the test renderer, so the SVG gradient
    // stays deferred and the card must still carry its solid fallback.
    const svgNodes = testRenderer!.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.type.toLowerCase().includes('svg'),
    );
    expect(svgNodes).toHaveLength(0);
    const button = testRenderer!.root.find(
      node => node.props?.accessibilityRole === 'button',
    );
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style)
      : button.props.style;
    expect(typeof flatStyle.backgroundColor).toBe('string');
  });

  it('keeps each headline line on a single auto-fitting row', () => {
    let testRenderer: renderer.ReactTestRenderer;
    renderer.act(() => {
      testRenderer = renderer.create(
        <ThemeProvider>
          <ProUpsellCard onPress={() => {}} />
        </ThemeProvider>,
      );
    });
    const textNodes = testRenderer!.root.findAll(
      node =>
        typeof node.type === 'string' &&
        node.type.toLowerCase().includes('text'),
    );
    const headlines = textNodes.filter(node =>
      node.children.some(
        c =>
          typeof c === 'string' &&
          (c.includes('Consistency is a choice.') ||
            c.includes('Make yours easier.')),
      ),
    );
    expect(headlines).toHaveLength(2);
    for (const node of headlines) {
      expect(node.props.numberOfLines).toBe(1);
      expect(node.props.adjustsFontSizeToFit).toBe(true);
    }
  });
});
