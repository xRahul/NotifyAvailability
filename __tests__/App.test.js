import 'react-native';
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

jest.mock('react-native/Libraries/Components/Switch/Switch', () => 'Switch');
jest.mock('react-native/Libraries/Components/Picker/Picker', () => 'Picker');

it('renders correctly', () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toMatchSnapshot();
});
