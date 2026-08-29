import {
  addWatchTarget,
  deleteWatchTarget,
  getWatchTargets,
  STORAGE_KEY_WATCH_TARGETS,
  toggleWatchTarget,
  updateWatchTarget,
} from '../src/storage/watchRepository';
import { WatchTarget } from '../src/types';

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
  removeItem: (key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  },
  clear: () => {
    mockStore.clear();
    return Promise.resolve();
  },
}));

describe('watchRepository', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  describe('getWatchTargets & legacy migration', () => {
    it('returns empty array when no data and no legacy config exist', async () => {
      const targets = await getWatchTargets();
      expect(targets).toEqual([]);
    });

    it('auto-migrates legacy config if legacy URL/search text exist', async () => {
      mockStore.set('url', 'https://example.com/product');
      mockStore.set('searchText', 'In Stock');
      mockStore.set('taskSet', 'yes');
      mockStore.set('webPlatformType', 'desktop');
      mockStore.set('caseSensitiveSearch', 'yes');
      mockStore.set('searchAbsence', 'no');
      mockStore.set('lastChecked', '1700000000000');

      const targets = await getWatchTargets();

      expect(targets).toHaveLength(1);
      expect(targets[0].url).toBe('https://example.com/product');
      expect(targets[0].searchText).toBe('In Stock');
      expect(targets[0].title).toBe('example.com');
      expect(targets[0].enabled).toBe(true);
      expect(targets[0].webPlatformType).toBe('desktop');
      expect(targets[0].caseSensitiveSearch).toBe(true);
      expect(targets[0].searchAbsence).toBe(false);
      expect(targets[0].lastChecked).toBe('1700000000000');

      // Verify saved in modern storage key
      const persisted = mockStore.get(STORAGE_KEY_WATCH_TARGETS);
      expect(persisted).toBeDefined();
    });

    it('returns modern targets directly without running migration if modern key exists', async () => {
      const existing: WatchTarget[] = [
        {
          id: 'test-1',
          title: 'Custom Watch',
          url: 'https://test.com',
          searchText: 'Available',
          caseSensitiveSearch: false,
          searchAbsence: false,
          webPlatformType: 'mobile',
          enabled: true,
          createdAt: 123456,
        },
      ];
      mockStore.set(STORAGE_KEY_WATCH_TARGETS, JSON.stringify(existing));

      const targets = await getWatchTargets();
      expect(targets).toEqual(existing);
    });
  });

  describe('addWatchTarget', () => {
    it('adds a new watch target with generated ID and timestamp', async () => {
      const created = await addWatchTarget({
        title: 'New Item',
        url: 'https://new.com/item',
        searchText: 'Now In Stock',
        caseSensitiveSearch: true,
        searchAbsence: false,
        webPlatformType: 'mobile',
        enabled: true,
      });

      expect(created.id).toMatch(/^watch_/);
      expect(created.title).toBe('New Item');
      expect(created.createdAt).toBeGreaterThan(0);

      const all = await getWatchTargets();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(created.id);
    });
  });

  describe('updateWatchTarget', () => {
    it('updates specified fields while protecting target ID', async () => {
      const created = await addWatchTarget({
        title: 'Original Title',
        url: 'https://original.com',
        searchText: 'Old Keyword',
        caseSensitiveSearch: true,
        searchAbsence: false,
        webPlatformType: 'mobile',
        enabled: false,
      });

      const updated = await updateWatchTarget(created.id, {
        title: 'Updated Title',
        searchText: 'New Keyword',
        enabled: true,
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.searchText).toBe('New Keyword');
      expect(updated?.enabled).toBe(true);
      expect(updated?.url).toBe('https://original.com');
      expect(updated?.id).toBe(created.id);
    });

    it('returns null when target id is not found', async () => {
      const updated = await updateWatchTarget('non-existent-id', {
        title: 'Whatever',
      });
      expect(updated).toBeNull();
    });
  });

  describe('deleteWatchTarget', () => {
    it('removes target by id and returns true', async () => {
      const t1 = await addWatchTarget({
        title: 'T1',
        url: 'https://1.com',
        searchText: '1',
        caseSensitiveSearch: true,
        searchAbsence: false,
        webPlatformType: 'mobile',
        enabled: true,
      });

      const t2 = await addWatchTarget({
        title: 'T2',
        url: 'https://2.com',
        searchText: '2',
        caseSensitiveSearch: true,
        searchAbsence: false,
        webPlatformType: 'mobile',
        enabled: true,
      });

      const deleted = await deleteWatchTarget(t1.id);
      expect(deleted).toBe(true);

      const remaining = await getWatchTargets();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(t2.id);
    });

    it('returns false when trying to delete non-existent target', async () => {
      const deleted = await deleteWatchTarget('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('toggleWatchTarget', () => {
    it('flips enabled boolean of target', async () => {
      const created = await addWatchTarget({
        title: 'Toggle Test',
        url: 'https://toggle.com',
        searchText: 'toggle',
        caseSensitiveSearch: true,
        searchAbsence: false,
        webPlatformType: 'mobile',
        enabled: false,
      });

      const toggledOn = await toggleWatchTarget(created.id);
      expect(toggledOn?.enabled).toBe(true);

      const toggledOff = await toggleWatchTarget(created.id);
      expect(toggledOff?.enabled).toBe(false);
    });

    it('returns null for non-existent target id', async () => {
      const result = await toggleWatchTarget('invalid-id');
      expect(result).toBeNull();
    });
  });
});
