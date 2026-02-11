import React from 'react';
import PushNotification from 'react-native-push-notification';

// Mock dependencies
jest.mock('react-native-background-timer', () => ({
  stopBackgroundTimer: jest.fn(),
  runBackgroundTimer: jest.fn(),
}));

jest.mock('react-native-push-notification', () => ({
  configure: jest.fn(),
  localNotification: jest.fn(),
}));

jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-webview', () => {
  return {
    WebView: () => null,
  };
});

jest.mock('../src/services/BackgroundService', () => ({
  checkUrlForText: jest.fn(),
  background_task: jest.fn(),
}));

// Fully mock react-native to avoid renderer issues
jest.mock('react-native', () => {
  // eslint-disable-next-line no-shadow
  const React = require('react');
  const View = props => React.createElement('View', props, props.children);
  const Text = props => React.createElement('Text', props, props.children);
  const ScrollView = props =>
    React.createElement('ScrollView', props, props.children);
  const TextInput = React.forwardRef((props, ref) =>
    React.createElement('TextInput', {...props, ref}),
  );
  const Switch = props => React.createElement('Switch', props);
  const Button = props => React.createElement('Button', props);
  const ActivityIndicator = props =>
    React.createElement('ActivityIndicator', props);

  const Picker = props => React.createElement('Picker', props, props.children);
  Picker.Item = props => React.createElement('Picker.Item', props);

  const PushNotificationIOS = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    requestPermissions: jest.fn(() => Promise.resolve({})),
    checkPermissions: jest.fn(),
    FetchResult: {
      NoData: 'NoData',
      NewData: 'NewData',
      Failed: 'Failed',
    },
  };

  return {
    Platform: {
      OS: 'ios',
      select: obj => obj.ios,
    },
    View,
    Text,
    ScrollView,
    TextInput,
    Switch,
    Button,
    ActivityIndicator,
    Picker,
    PushNotificationIOS,
    StyleSheet: {
      create: obj => obj,
      flatten: obj => obj,
    },
  };
});

describe('Notification Logging Performance', () => {
  let consoleLogSpy;
  let originalDev;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    originalDev = global.__DEV__;
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    global.__DEV__ = originalDev;
    jest.resetModules();
  });

  test('console.log is called when __DEV__ is true', () => {
    // Ensure __DEV__ is true
    global.__DEV__ = true;

    let onNotification;
    jest.isolateModules(() => {
        const PushNotification = require('react-native-push-notification');
        require('../src/App');
        const configureCall = PushNotification.configure.mock.calls[0];
        onNotification = configureCall[0].onNotification;
    });

    expect(onNotification).toBeDefined();

    // Call onNotification
    const notification = {
      finish: jest.fn(),
      data: { test: 'data' },
    };
    onNotification(notification);

    // Verify console.log was called
    expect(consoleLogSpy).toHaveBeenCalledWith('NOTIFICATION:', notification);
  });

  test('Optimized: console.log is NOT called when __DEV__ is false', () => {
    // Ensure __DEV__ is false
    global.__DEV__ = false;

    let onNotification;
    jest.isolateModules(() => {
        const PushNotification = require('react-native-push-notification');
        require('../src/App');
        const configureCall = PushNotification.configure.mock.calls[0];
        onNotification = configureCall[0].onNotification;
    });

    expect(onNotification).toBeDefined();

    // Call onNotification
    const notification = {
      finish: jest.fn(),
      data: { test: 'data' },
    };
    onNotification(notification);

    // Verify console.log was NOT called
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
