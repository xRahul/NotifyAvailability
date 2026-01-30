import React from 'react';
import App from '../src/App';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-community/async-storage';

// Mock dependencies (copied from App.test.js)
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

// Import UrlInput to use in findByType
import UrlInput from '../src/components/UrlInput';

it('persist function reference remains stable across renders', () => {
  const component = renderer.create(<App />);
  const root = component.root;

  // Find the UrlInput component
  const urlInputInitial = root.findByType(UrlInput);
  const persistInitial = urlInputInitial.props.persist;

  // Trigger a re-render by changing text in the UrlInput
  // This calls setUrl in App, which triggers re-render
  urlInputInitial.props.setUrl('https://example.com');

  // After re-render, find the component again
  // Note: TestRenderer updates the tree in place, but we need to fetch the node again or check props on the same node?
  // Usually the instance persists but props update.
  const urlInputUpdated = root.findByType(UrlInput);
  const persistUpdated = urlInputUpdated.props.persist;

  // Expect them to be the same reference
  expect(persistInitial).toBe(persistUpdated);
});
