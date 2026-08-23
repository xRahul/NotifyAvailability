import { USER_AGENT_DESKTOP } from '../src/constants';

import { runCheck } from '../src/services/checkService';
import {
  ensureNotificationSetup,
  showAvailabilityNotification,
} from '../src/services/notificationService';
import { saveWatchConfig } from '../src/storage/configStorage';
import { DEFAULT_CONFIG, WatchConfig } from '../src/types';

jest.mock('../src/services/notificationService', () => ({
  __esModule: true,
  AVAILABILITY_CHANNEL_ID: 'availability',
  ensureNotificationSetup: jest.fn(),
  showAvailabilityNotification: jest.fn(),
}));

jest.mock('../src/storage/configStorage', () => ({
  __esModule: true,
  saveWatchConfig: jest.fn(),
}));

const mockedSetup = ensureNotificationSetup as jest.MockedFunction<
  typeof ensureNotificationSetup
>;
const mockedShow = showAvailabilityNotification as jest.MockedFunction<
  typeof showAvailabilityNotification
>;
const mockedSave = saveWatchConfig as jest.MockedFunction<
  typeof saveWatchConfig
>;

const URL = 'https://example.com/product';
// Contains "In Stock" (mixed case) so lowercase search text exercises
// case-insensitive matching while staying an exact-match miss.
const HTML = '<html><body><p>Buy Widget — In Stock!</p></body></html>';

type TextResponse = { text: () => Promise<string> };

let fetchMock: jest.Mock<Promise<TextResponse>, [string, RequestInit?]>;

const makeCfg = (overrides: Partial<WatchConfig> = {}): WatchConfig => ({
  ...DEFAULT_CONFIG,
  url: URL,
  searchText: 'In Stock',
  taskSet: 'yes',
  webPlatformType: 'mobile',
  lastChecked: '0',
  caseSensitiveSearch: 'yes',
  searchAbsence: 'no',
  ...overrides,
});

describe('runCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    (globalThis as Record<string, unknown>).fetch = fetchMock;
    mockedSetup.mockResolvedValue(true);
  });

  describe('matching matrix (found × absence × case-sensitivity)', () => {
    it.each([
      [
        'found + absence:no + sensitive -> notifies',
        'In Stock',
        'yes',
        'no',
        { textFound: true, notified: true },
      ],
      [
        'found + absence:yes + sensitive -> silent',
        'In Stock',
        'yes',
        'yes',
        { textFound: true, notified: false },
      ],
      [
        'found + absence:no + insensitive -> notifies',
        'In Stock',
        'no',
        'no',
        { textFound: true, notified: true },
      ],
      [
        'found + absence:yes + insensitive -> silent',
        'In Stock',
        'no',
        'yes',
        { textFound: true, notified: false },
      ],
      [
        'not found + absence:no + sensitive -> silent',
        'in stock',
        'yes',
        'no',
        { textFound: false, notified: false },
      ],
      [
        'not found + absence:yes + sensitive -> notifies absence',
        'in stock',
        'yes',
        'yes',
        { textFound: false, notified: true },
      ],
      [
        'case-insensitive finds it + absence:no -> notifies',
        'in stock',
        'no',
        'no',
        { textFound: true, notified: true },
      ],
      [
        'not found + absence:yes + insensitive -> silent',
        'in stock',
        'no',
        'yes',
        { textFound: true, notified: false },
      ],
    ] as Array<
      [
        string,
        string,
        WatchConfig['caseSensitiveSearch'],
        WatchConfig['searchAbsence'],
        { textFound: boolean; notified: boolean },
      ]
    >)(
      '%s',
      async (
        _name,
        searchText,
        caseSensitiveSearch,
        searchAbsence,
        expected,
      ) => {
        fetchMock.mockResolvedValue({ text: async () => HTML });
        const outcome = await runCheck(
          makeCfg({ searchText, caseSensitiveSearch, searchAbsence }),
        );

        expect(outcome).toEqual(expected);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(mockedSave).toHaveBeenCalledTimes(1);

        if (expected.notified) {
          expect(mockedSetup).toHaveBeenCalledTimes(1);
          expect(mockedShow).toHaveBeenCalledTimes(1);
          expect(mockedShow).toHaveBeenCalledWith(
            searchText,
            URL,
            expected.textFound,
          );
        } else {
          expect(mockedSetup).not.toHaveBeenCalled();
          expect(mockedShow).not.toHaveBeenCalled();
        }
      },
    );
  });

  it('escapes regex special characters in case-insensitive search', async () => {
    // Unescaped, /n.st.ck/i would match "In Stock"; escaped it must not.
    fetchMock.mockResolvedValue({ text: async () => HTML });

    const outcome = await runCheck(
      makeCfg({
        searchText: 'n st ck',
        caseSensitiveSearch: 'no',
        searchAbsence: 'yes',
      }),
    );

    expect(outcome).toEqual({ textFound: false, notified: true });
    expect(mockedShow).toHaveBeenCalledWith('n st ck', URL, false);
  });

  describe('User-Agent header by platform', () => {
    it('sends desktop UA only when webPlatformType is desktop', async () => {
      fetchMock.mockResolvedValue({ text: async () => HTML });

      await runCheck(makeCfg({ webPlatformType: 'desktop' }));

      expect(fetchMock).toHaveBeenCalledWith(URL, {
        headers: { 'User-Agent': USER_AGENT_DESKTOP },
      });
    });

    it.each(['mobile', 'tablet'] as const)(
      'sends no custom headers for %s',
      async platform => {
        fetchMock.mockResolvedValue({ text: async () => HTML });

        await runCheck(makeCfg({ webPlatformType: platform }));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined();
      },
    );
  });

  describe('empty guard', () => {
    it('does nothing when url is empty', async () => {
      const outcome = await runCheck(makeCfg({ url: '' }));

      expect(outcome).toEqual({ textFound: false, notified: false });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockedSave).not.toHaveBeenCalled();
      expect(mockedSetup).not.toHaveBeenCalled();
      expect(mockedShow).not.toHaveBeenCalled();
    });

    it('does nothing when searchText is empty', async () => {
      const outcome = await runCheck(makeCfg({ searchText: '' }));

      expect(outcome).toEqual({ textFound: false, notified: false });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockedSave).not.toHaveBeenCalled();
      expect(mockedSetup).not.toHaveBeenCalled();
      expect(mockedShow).not.toHaveBeenCalled();
    });
  });

  describe('network error', () => {
    it('returns silent miss without persisting or notifying', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const outcome = await runCheck(makeCfg({ searchAbsence: 'yes' }));

      expect(outcome).toEqual({ textFound: false, notified: false });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(mockedSave).not.toHaveBeenCalled();
      expect(mockedSetup).not.toHaveBeenCalled();
      expect(mockedShow).not.toHaveBeenCalled();
    });
  });

  describe('lastChecked persistence', () => {
    it('persists Date.now on successful fetch regardless of match result', async () => {
      fetchMock.mockResolvedValue({
        text: async () => '<html>nothing here</html>',
      });
      const startedAt = Date.now();

      const outcome = await runCheck(makeCfg());

      const persistedAt = Number(
        (mockedSave.mock.calls[0][0] as { lastChecked: string }).lastChecked,
      );
      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(persistedAt).toBeGreaterThanOrEqual(startedAt);
      expect(persistedAt).toBeLessThanOrEqual(Date.now());
      expect(outcome).toEqual({ textFound: false, notified: false });
    });

    it('persists lastChecked even when permission denied blocks notification', async () => {
      fetchMock.mockResolvedValue({ text: async () => HTML });
      mockedSetup.mockResolvedValue(false);

      const outcome = await runCheck(makeCfg());

      expect(outcome).toEqual({ textFound: true, notified: false });
      expect(mockedSetup).toHaveBeenCalledTimes(1);
      expect(mockedShow).not.toHaveBeenCalled();
      expect(mockedSave).toHaveBeenCalledTimes(1);
    });
  });
});
