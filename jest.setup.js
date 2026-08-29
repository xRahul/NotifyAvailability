/* eslint-env jest */

// Global jest mocks for third-party native modules that enforce TurboModule
// registration at import time and therefore cannot load in the test renderer.
// Per-suite factories in individual test files take precedence over these.

jest.mock('react-native-webview', () => {
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef(() => null),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement('SafeAreaView', props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    createChannel: jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { HIGH: 5 },
  AuthorizationStatus: { AUTHORIZED: 1 },
}));

