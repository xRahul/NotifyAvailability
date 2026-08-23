import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadWatchConfig, saveWatchConfig } from '../src/storage/configStorage';
import { DEFAULT_CONFIG } from '../src/types';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
  setItem: (key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  },
  getMany: (keys: string[]) =>
    Promise.resolve(
      keys.reduce<Record<string, string | null>>((acc, key) => {
        acc[key] = mockStore.get(key) ?? null;
        return acc;
      }, {}),
    ),
  setMany: (entries: Record<string, string>) => {
    for (const [key, value] of Object.entries(entries)) {
      mockStore.set(key, value);
    }
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(Array.from(mockStore.keys())),
  clear: () => {
    mockStore.clear();
    return Promise.resolve();
  },
}));

describe('configStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns DEFAULT_CONFIG when storage is empty', async () => {
    await expect(loadWatchConfig()).resolves.toEqual(DEFAULT_CONFIG);
  });

  it('honors legacy stored values and keeps defaults for missing keys', async () => {
    await AsyncStorage.setItem('url', 'https://example.com');
    await AsyncStorage.setItem('taskSet', 'yes');
    await AsyncStorage.setItem('lastChecked', '1700000000000');

    await expect(loadWatchConfig()).resolves.toEqual({
      ...DEFAULT_CONFIG,
      url: 'https://example.com',
      taskSet: 'yes',
      lastChecked: '1700000000000',
    });
  });

  it('saveWatchConfig writes only patch fields', async () => {
    await saveWatchConfig({ url: 'https://example.com', taskSet: 'yes' });

    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([
      'url',
      'taskSet',
    ]);
    await expect(AsyncStorage.getItem('url')).resolves.toBe(
      'https://example.com',
    );
    await expect(AsyncStorage.getItem('taskSet')).resolves.toBe('yes');
  });

  it('skips explicitly undefined patch fields', async () => {
    await saveWatchConfig({ url: undefined, searchText: 'In Stock' });

    await expect(AsyncStorage.getAllKeys()).resolves.toEqual(['searchText']);
    await expect(AsyncStorage.getItem('url')).resolves.toBeNull();
    await expect(AsyncStorage.getItem('searchText')).resolves.toBe('In Stock');
  });

  it('round-trips a saved patch onto defaults', async () => {
    await saveWatchConfig({
      url: 'https://example.com/page',
      searchText: 'In Stock',
      caseSensitiveSearch: 'no',
    });

    await expect(loadWatchConfig()).resolves.toEqual({
      ...DEFAULT_CONFIG,
      url: 'https://example.com/page',
      searchText: 'In Stock',
      caseSensitiveSearch: 'no',
    });
  });
});
