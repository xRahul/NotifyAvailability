module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-native(-community)?|@testing-library|react-native-webview|react-native-notify-kit|react-native-background-fetch|@react-native-picker)',
  ],
};
