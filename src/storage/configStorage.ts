import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CONFIG, WatchConfig } from '../types';

const CONFIG_KEYS = [
  'url',
  'searchText',
  'taskSet',
  'webPlatformType',
  'lastChecked',
  'caseSensitiveSearch',
  'searchAbsence',
] as const;

export async function loadWatchConfig(): Promise<WatchConfig> {
  const values = await AsyncStorage.getMany([...CONFIG_KEYS]);
  const updates: Partial<WatchConfig> = {};
  for (const key of CONFIG_KEYS) {
    const value = values[key];
    if (value !== null) {
      (updates as Record<string, string>)[key] = value;
    }
  }
  return { ...DEFAULT_CONFIG, ...updates };
}

export async function saveWatchConfig(
  patch: Partial<WatchConfig>,
): Promise<void> {
  const entries: Record<string, string> = {};
  for (const key of CONFIG_KEYS) {
    if (patch[key] !== undefined) {
      entries[key] = String(patch[key]);
    }
  }
  await AsyncStorage.setMany(entries);
}
