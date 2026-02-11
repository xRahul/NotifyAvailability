import React from 'react';
import App from '../src/App';
import renderer, {act} from 'react-test-renderer';
import {WebView} from 'react-native-webview';

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

// Mock react-native-webview to capture props
jest.mock('react-native-webview', () => {
  // eslint-disable-next-line no-unused-vars
  const RNReact = require('react');
  const {View} = require('react-native');
  // Return a component that renders View so it's not null,
  // and attach a spy to capture props.
  const MockWebView = jest.fn(props => <View {...props} testID="webview" />);
  return {
    WebView: MockWebView,
  };
});

jest.mock('../src/services/BackgroundService', () => ({
  checkUrlForText: jest.fn(() => Promise.resolve()),
  background_task: jest.fn(),
}));

// Fully mock react-native to avoid renderer issues
jest.mock('react-native', () => {
  const RNReact = require('react');
  const View = props => RNReact.createElement('View', props, props.children);
  const Text = props => RNReact.createElement('Text', props, props.children);
  const ScrollView = props =>
    RNReact.createElement('ScrollView', props, props.children);
  const TextInput = RNReact.forwardRef((props, ref) =>
    RNReact.createElement('TextInput', {...props, ref}),
  );
  const Switch = props => RNReact.createElement('Switch', props);
  const Button = props => RNReact.createElement('Button', props);
  const ActivityIndicator = props =>
    RNReact.createElement('ActivityIndicator', props);

  const Picker = props =>
    RNReact.createElement('Picker', props, props.children);
  Picker.Item = props => RNReact.createElement('Picker.Item', props);

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

describe('WebView Performance', () => {
  it('preserves source object reference across renders (optimized)', async () => {
    let component;

    // Mount App
    await act(async () => {
      component = renderer.create(<App />);
    });

    const root = component.root;

    // 1. Enter URL
    // Find the TextInput for URL input (UrlInput component)
    const textInput = root
      .findAllByType('TextInput')
      .find(node => node.props.placeholder === 'Enter URL https://...');

    if (!textInput) {
      throw new Error('Could not find URL TextInput');
    }

    await act(async () => {
      textInput.props.onChangeText('https://example.com');
    });

    // 2. Start Checking
    const startButton = root.find(
      node => node.props.title === 'Start Checking',
    );
    await act(async () => {
      startButton.props.onPress();
    });

    // Verify WebView is rendered
    // WebView is a mock function, so we can check its calls.
    expect(WebView).toHaveBeenCalled();

    // Get the last call to WebView
    const initialCallCount = WebView.mock.calls.length;
    const initialSource = WebView.mock.calls[initialCallCount - 1][0].source;

    // 3. Toggle "Case Sensitive Search" to trigger re-render
    // Find SettingsSwitch for "Case Sensitive Search"
    // SettingsSwitch renders a View with Text and View/Switch.
    // We can find Switch components.
    // There are 2 switches. The first one is Case Sensitive Search.
    // But let's be robust.
    // SettingsSwitch passes label. But we can't find by prop on a functional component easily if it's not a native component.
    // SettingsSwitch is imported.
    // But we can find the Switch component.

    const switches = root.findAllByType('Switch');
    // Assuming the first switch is Case Sensitive Search based on order in App.js
    const caseSensitiveSwitch = switches[0];

    await act(async () => {
      caseSensitiveSwitch.props.onValueChange(false);
    });

    // Verify WebView was re-rendered
    const finalCallCount = WebView.mock.calls.length;
    expect(finalCallCount).toBeGreaterThan(initialCallCount);

    const finalSource = WebView.mock.calls[finalCallCount - 1][0].source;

    // Assert that source objects are structurally equal
    expect(initialSource).toEqual(finalSource);

    // Assert that source objects ARE referentially equal (optimized behavior)
    expect(initialSource).toBe(finalSource);
  });
});
