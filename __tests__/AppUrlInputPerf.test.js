import React from 'react';
import renderer, {act} from 'react-test-renderer';
import App from '../src/App';
// We need to import TextInput to access the spy
import {TextInput} from 'react-native';

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

// Fully mock react-native
jest.mock('react-native', () => {
  // eslint-disable-next-line no-shadow
  const React = require('react');
  const View = props => React.createElement('View', props, props.children);
  const Text = props => React.createElement('Text', props, props.children);
  const ScrollView = props =>
    React.createElement('ScrollView', props, props.children);

  // Create a spy
  const mockSpy = jest.fn();

  const TextInputComponent = React.forwardRef((props, ref) => {
    mockSpy(props);
    return React.createElement('TextInput', {...props, ref});
  });

  // Attach spy to the component so we can access it
  TextInputComponent.mockSpy = mockSpy;

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
    FetchResult: {NoData: 'NoData'},
  };
  return {
    Platform: {OS: 'ios', select: obj => obj.ios},
    View,
    Text,
    ScrollView,
    TextInput: TextInputComponent,
    Switch,
    Button,
    ActivityIndicator,
    Picker,
    PushNotificationIOS,
    StyleSheet: {create: obj => obj, flatten: obj => obj},
  };
});

describe('App Performance Benchmark', () => {
  beforeEach(() => {
    if (TextInput.mockSpy) {
      TextInput.mockSpy.mockClear();
    }
  });

  it('does NOT re-render UrlInput when SearchInput changes', async () => {
    let component;

    // Initial Render
    await act(async () => {
      component = renderer.create(<App />);
    });

    // Count UrlInput renders (identified by placeholder)
    const initialUrlInputRenders = TextInput.mockSpy.mock.calls.filter(
      call => call[0].placeholder === 'Enter URL https://...',
    ).length;

    console.log('Initial UrlInput Renders:', initialUrlInputRenders);
    expect(initialUrlInputRenders).toBe(1);

    // Reset spy to track subsequent renders ONLY
    TextInput.mockSpy.mockClear();

    const root = component.root;
    const textInputs = root.findAllByType('TextInput'); // This finds the 'TextInput' string element created by mock

    // We need to find the element that corresponds to SearchInput's text input.
    // The mocked TextInput returns React.createElement('TextInput', ...)
    // So finding by type 'TextInput' works.

    const searchInput = textInputs.find(
      node => node.props.placeholder === 'Enter Search String',
    );

    expect(searchInput).toBeTruthy();

    // Simulate typing in SearchInput
    await act(async () => {
      searchInput.props.onChangeText('test search');
    });

    // Count UrlInput renders after update
    const finalUrlInputRenders = TextInput.mockSpy.mock.calls.filter(
      call => call[0].placeholder === 'Enter URL https://...',
    ).length;

    console.log(
      'Final UrlInput Renders (during update):',
      finalUrlInputRenders,
    );

    // If optimized, it should be 0.
    expect(finalUrlInputRenders).toBe(0);
  });
});
