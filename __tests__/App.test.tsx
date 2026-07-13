/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-draggable-flatlist', () => {
  const View = require('react-native').View;
  return { default: View, ScaleDecorator: ({ children }: any) => children };
});
jest.mock('react-native-shadow-2', () => ({ Shadow: ({ children }: any) => children }));
jest.mock('react-native-heroicons', () => ({}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'View',
  Swipeable: 'View',
  DrawerLayout: 'View',
  State: {},
  ScrollView: 'View',
  Slider: 'View',
  Switch: 'View',
  TextInput: 'View',
  ToolbarAndroid: 'View',
  ViewPagerAndroid: 'View',
  DrawerLayoutAndroid: 'View',
  WebView: 'View',
  NativeViewGestureHandler: 'View',
  TapGestureHandler: 'View',
  FlingGestureHandler: 'View',
  ForceTouchGestureHandler: 'View',
  LongPressGestureHandler: 'View',
  PanGestureHandler: 'View',
  PinchGestureHandler: 'View',
  RotationGestureHandler: 'View',
  createHandler: jest.fn(),
  createNativeWrapper: jest.fn(),
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

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
