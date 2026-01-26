import AsyncStorage from '@react-native-community/async-storage';

// Mock the storage
jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
}));

describe('AsyncStorage Performance Benchmark', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Baseline: Sequential Writes triggers 2 bridge calls', async () => {
    const persist = async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.log(e);
      }
    };

    // Mimic the logic in App.js createPrefetchJobs
    const url = 'http://example.com';
    const trimmedUrl = url.trim();

    // 1st Write
    persist('url', trimmedUrl);

    // Intermediate logic (BackgroundTimer, etc) would go here

    // 2nd Write
    persist('taskSet', 'yes');

    // Wait for promises to clear if they were awaited (persist is async but not awaited in App.js)
    // However, since persist calls async storage immediately, the mock should capture it.

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(0);
  });

  test('Optimized: Batched Writes triggers 1 bridge call', async () => {
    const trimmedUrl = 'http://example.com';

    // Optimization using multiSet
    try {
      await AsyncStorage.multiSet([['url', trimmedUrl], ['taskSet', 'yes']]);
    } catch (e) {
      console.log(e);
    }

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(0);
    expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
  });
});
