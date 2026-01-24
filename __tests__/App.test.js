import React from 'react';
import App from '../src/App';
import renderer from 'react-test-renderer';

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
  const React = require('react');
  const View = (props) => React.createElement('View', props, props.children);
  const Text = (props) => React.createElement('Text', props, props.children);
  const ScrollView = (props) => React.createElement('ScrollView', props, props.children);
  const TextInput = (props) => React.createElement('TextInput', props);
  const Switch = (props) => React.createElement('Switch', props);
  const Button = (props) => React.createElement('Button', props);
  const ActivityIndicator = (props) => React.createElement('ActivityIndicator', props);

  const Picker = (props) => React.createElement('Picker', props, props.children);
  Picker.Item = (props) => React.createElement('Picker.Item', props);

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
        select: (obj) => obj.ios,
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
        create: (obj) => obj,
        flatten: (obj) => obj,
    },
  };
});

it('renders correctly', () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toMatchSnapshot();
});
