import React from 'react';
import App from '../src/App';
import renderer, {act} from 'react-test-renderer';

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

// Mock SettingsSwitch to track renders
// We need to do this slightly differently to spy on the component itself
// But since we want to test the *real* SettingsSwitch, we shouldn't mock it entirely.
// Instead, we can mock the 'Switch' component from react-native which SettingsSwitch renders.

const mockSwitchRender = jest.fn();

jest.mock('react-native', () => {
  const RNReact = require('react');
  const View = props => RNReact.createElement('View', props, props.children);
  const Text = props => RNReact.createElement('Text', props, props.children);
  const ScrollView = props =>
    RNReact.createElement('ScrollView', props, props.children);
  const TextInput = RNReact.forwardRef((props, ref) =>
    RNReact.createElement('TextInput', {
      ...props,
      ref,
      onChangeText: text => {
        if (props.onChangeText) {
          props.onChangeText(text);
        }
      },
    }),
  );

  // We spy on Switch render
  const Switch = props => {
    mockSwitchRender(props);
    return RNReact.createElement('Switch', props);
  };

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

it('prevents unnecessary re-renders of SettingsSwitch', async () => {
  mockSwitchRender.mockClear();

  let component;
  await act(async () => {
    component = renderer.create(<App />);
  });

  // Initial render: 2 SettingsSwitch components -> 2 Switch renders
  // Note: Initial render might happen more than once due to useEffect/AsyncStorage load
  // We should reset the counter after initial load is stable.

  // Wait for useEffect to finish (loadState)
  // The mock of AsyncStorage returns promises, we need to wait for them.
  // act handles this if we await properly.

  // Reset count to measure update impact
  mockSwitchRender.mockClear();

  // Find the UrlInput and change text
  // UrlInput renders a TextInput. We need to find it.
  const root = component.root;
  // UrlInput component renders a TextInput.
  // We can find TextInput by type or props.

  // We need to trigger a state change in App.js that is NOT related to SettingsSwitch.
  // changing 'url' state via UrlInput seems perfect.

  // But wait, UrlInput passes 'setUrl' which updates 'url' state in App.
  // Let's find the TextInput inside UrlInput.

  // The structure is App -> UrlInput -> View -> TextInput
  const textInputs = root.findAllByType('TextInput');
  // First one should be UrlInput's input (based on App.js order)
  const urlInput = textInputs[0];

  await act(async () => {
    // Trigger update
    urlInput.props.onChangeText('https://new-url.com');
  });

  const afterUpdateRenderCount = mockSwitchRender.mock.calls.length;

  // If optimized, SettingsSwitch should NOT re-render, so Switch should NOT re-render.
  // Count should be 0.
  expect(afterUpdateRenderCount).toBe(0);
});
