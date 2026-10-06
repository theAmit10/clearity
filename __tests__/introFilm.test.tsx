import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

const handlers: Record<string, (...args: any[]) => void> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-video', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => {
      Object.assign(handlers, {
        onEnd: props.onEnd,
        onError: props.onError,
        onLoad: props.onLoad,
        onProgress: props.onProgress,
      });
      return <View testID={props.testID} />;
    },
  };
});

import IntroFilm from '../src/components/intro/IntroFilm';

test('renders the player with sound on and a skip button', () => {
  let root: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    root = ReactTestRenderer.create(<IntroFilm onDone={() => {}} />);
  });
  expect(root!.root.findByProps({ testID: 'introfilm-video' })).toBeTruthy();
  expect(root!.root.findByProps({ testID: 'introfilm-skip' })).toBeTruthy();
  expect(root!.root.findByProps({ testID: 'introfilm-progress' })).toBeTruthy();
});

test('video end hands off to onboarding', () => {
  const onDone = jest.fn();
  act(() => {
    ReactTestRenderer.create(<IntroFilm onDone={onDone} />);
  });
  act(() => {
    handlers.onEnd();
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('completed', 0);
});

test('skip finishes early', () => {
  const onDone = jest.fn();
  let root: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    root = ReactTestRenderer.create(<IntroFilm onDone={onDone} />);
  });
  act(() => {
    root!.root.findByProps({ testID: 'introfilm-skip' }).props.onPress();
  });
  expect(onDone).toHaveBeenCalledWith('skipped', 0);
});

test('playback error falls through to onboarding instead of hanging', () => {
  const onDone = jest.fn();
  act(() => {
    ReactTestRenderer.create(<IntroFilm onDone={onDone} />);
  });
  act(() => {
    handlers.onError({ error: 'boom' });
  });
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith('completed', 0);
});
