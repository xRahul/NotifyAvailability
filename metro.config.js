const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Prefer TypeScript sources so src/App.tsx wins over legacy src/App.js
    // until the old code is fully replaced.
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
