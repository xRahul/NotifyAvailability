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
