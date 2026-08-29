import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchTarget } from '../types';
import { loadWatchConfig } from './configStorage';

export const STORAGE_KEY_WATCH_TARGETS = '@notify_availability:watch_targets';

export async function getWatchTargets(): Promise<WatchTarget[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_WATCH_TARGETS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as WatchTarget[];
      }
    }
  } catch (error) {
    console.error('[watchRepository] getWatchTargets read failed', error);
  }

  return migrateLegacyConfigIfNeeded();
}

export async function saveWatchTargets(
  targets: WatchTarget[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_WATCH_TARGETS,
      JSON.stringify(targets),
    );
  } catch (error) {
    console.error('[watchRepository] saveWatchTargets write failed', error);
    throw error;
  }
}

export async function addWatchTarget(
  input: Omit<WatchTarget, 'id' | 'createdAt'>,
): Promise<WatchTarget> {
  const current = await getWatchTargets();
  const id = `watch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newTarget: WatchTarget = {
    ...input,
    id,
    createdAt: Date.now(),
  };

  const updated = [...current, newTarget];
  await saveWatchTargets(updated);
  return newTarget;
}

export async function updateWatchTarget(
  id: string,
  patch: Partial<WatchTarget>,
): Promise<WatchTarget | null> {
  const current = await getWatchTargets();
  const index = current.findIndex(t => t.id === id);
  if (index === -1) {
    return null;
  }

  const updatedTarget: WatchTarget = {
    ...current[index],
    ...patch,
    id, // protect ID from overwrite
  };

  const updatedList = [...current];
  updatedList[index] = updatedTarget;
  await saveWatchTargets(updatedList);
  return updatedTarget;
}

export async function deleteWatchTarget(id: string): Promise<boolean> {
  const current = await getWatchTargets();
  const filtered = current.filter(t => t.id !== id);
  if (filtered.length === current.length) {
    return false;
  }

  await saveWatchTargets(filtered);
  return true;
}

export async function toggleWatchTarget(
  id: string,
): Promise<WatchTarget | null> {
  const current = await getWatchTargets();
  const target = current.find(t => t.id === id);
  if (!target) {
    return null;
  }

  return updateWatchTarget(id, { enabled: !target.enabled });
}

export async function migrateLegacyConfigIfNeeded(): Promise<WatchTarget[]> {
  try {
    const legacy = await loadWatchConfig();
    if (!legacy.url && !legacy.searchText) {
      return [];
    }

    let defaultTitle = 'Target Watch';
    try {
      if (legacy.url.startsWith('http://') || legacy.url.startsWith('https://')) {
        const parsed = new URL(legacy.url);
        defaultTitle = parsed.hostname || defaultTitle;
      }
    } catch {
      // keep defaultTitle
    }

    const migrated: WatchTarget = {
      id: 'legacy_migrated_target',
      title: defaultTitle,
      url: legacy.url,
      searchText: legacy.searchText,
      caseSensitiveSearch: legacy.caseSensitiveSearch === 'yes',
      searchAbsence: legacy.searchAbsence === 'yes',
      webPlatformType: legacy.webPlatformType,
      enabled: legacy.taskSet === 'yes',
      lastChecked: legacy.lastChecked !== '0' ? legacy.lastChecked : undefined,
      createdAt: Date.now(),
    };

    await saveWatchTargets([migrated]);
    return [migrated];
  } catch (error) {
    console.error('[watchRepository] migration failed', error);
    return [];
  }
}
