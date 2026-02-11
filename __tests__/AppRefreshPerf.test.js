import React from 'react';
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

const mockReload = jest.fn();
const mockMount = jest.fn();
const mockUnmount = jest.fn();

jest.mock('react-native-webview', () => {
  // eslint-disable-next-line no-shadow
  const React = require('react');
  const WebView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      reload: mockReload,
    }));
    React.useEffect(() => {
      mockMount();
      return () => mockUnmount();
    }, []);
    return React.createElement('View', {...props, testID: 'webview'});
  });
  return {WebView};
});

jest.mock('../src/services/BackgroundService', () => ({
  checkUrlForText: jest.fn(),
  background_task: jest.fn(),
}));

// Fully mock react-native
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

// Mock AsyncStorage to return initial state
const initialState = [
  ['url', 'http://google.com'],
  ['taskSet', 'yes'],
  ['webPlatformType', 'mobile'],
];
const mockMultiGet = jest.fn(() => Promise.resolve(initialState));

jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: mockMultiGet,
  removeItem: jest.fn(() => Promise.resolve()),
}));

const App = require('../src/App').default;

describe('WebView Refresh Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshWebView uses reload() (Optimized)', async () => {
    const component = renderer.create(<App />);

    // Wait for useEffect to load state
    await renderer.act(async () => {
      await Promise.resolve(); // Flush promises
    });

    // Check if WebView is mounted
    expect(mockMount).toHaveBeenCalledTimes(1);

    // Find PlatformPicker to trigger change
    const root = component.root;
    // Helper to find picker
    const picker = root.findByType('Picker');

    // Trigger value change
    await renderer.act(async () => {
      picker.props.onValueChange('desktop');
      await Promise.resolve(); // Ensure all promises are flushed
    });

    // Fast-forward time for setTimeout (if any remaining logic uses it, though we removed it)
    await renderer.act(async () => {
      jest.runAllTimers();
    });

    // Expect WebView to stay mounted
    // Unmount should NOT increase
    expect(mockUnmount).toHaveBeenCalledTimes(0);
    expect(mockMount).toHaveBeenCalledTimes(1);

    // reload should be called
    expect(mockReload).toHaveBeenCalledTimes(1);
  });
});
