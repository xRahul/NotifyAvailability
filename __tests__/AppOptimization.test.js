import React from 'react';
import renderer from 'react-test-renderer';
// We don't import TextInput from react-native here because we are mocking it.
// We will access it via the mock or just by string type if necessary.

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

// Import App after mocking react-native
const App = require('../src/App').default;

it('Case Sensitive Search handler reference check', () => {
  const component = renderer.create(<App />);
  const root = component.root;

  const findSettingsSwitch = () =>
    root.findAll(
      node =>
        node.type.name === 'SettingsSwitch' &&
        node.props.label === 'Case Sensitive Search:',
    )[0];

  let switchComp = findSettingsSwitch();
  const handler1 = switchComp.props.onValueChange;

  // Find the TextInput. Since we mocked it as 'TextInput', we can find it by type 'TextInput'
  // But wait, the mock returns a React component.
  // In the mock: const TextInput = React.forwardRef...
  // So we need to find that component.

  // We can find by prop if needed, or by type name if the mock sets displayName.
  // Or we can just inspect the tree.

  // Let's rely on finding by type name "TextInput" if react-test-renderer supports it for functional components.
  // Or better, we can find by props passed to it. UrlInput passes 'autoCapitalize="none"'.

  // The mock uses createElement('TextInput'...), so the type in the output tree will be 'TextInput'.
  // However, the component in the tree is the Mocked TextInput.

  // Let's filter by checking if it has onChangeText
  const textInputs = root.findAll(node => node.props.onChangeText);
  const urlInput = textInputs[0];

  renderer.act(() => {
    urlInput.props.onChangeText('new url');
  });

  // Re-find the switch component
  switchComp = findSettingsSwitch();
  const handler2 = switchComp.props.onValueChange;

  if (handler1 === handler2) {
    console.log('Handler is stable (OPTIMIZED)');
  } else {
    console.log('Handler is new instance (UNOPTIMIZED)');
  }

  expect(handler1).toBe(handler2);
});
