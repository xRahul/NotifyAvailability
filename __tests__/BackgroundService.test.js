import {checkUrlForText, background_task} from '../src/services/BackgroundService';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-community/async-storage';

// Mock dependencies
jest.mock('react-native-push-notification', () => ({
  localNotification: jest.fn(),
}));

jest.mock('@react-native-community/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(),
}));

jest.mock('react-native-background-timer', () => ({
  stopBackgroundTimer: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
global.Headers = jest.fn().mockImplementation(() => ({
    set: jest.fn(),
}));

describe('BackgroundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
  });

  describe('checkUrlForText', () => {
    it('should notify when text is found', async () => {
      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve('<html><body>Hello World</body></html>'),
      });

      const data = {
        url: 'http://example.com',
        searchText: 'World',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'no',
        searchAbsence: 'no',
      };

      await checkUrlForText(data);

      expect(fetch).toHaveBeenCalledWith('http://example.com', expect.any(Object));
      expect(PushNotification.localNotification).toHaveBeenCalledWith({
        message: 'World was found on http://example.com',
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('lastChecked', expect.any(String));
    });

    it('should NOT notify when text is NOT found', async () => {
      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve('<html><body>Hello World</body></html>'),
      });

      const data = {
        url: 'http://example.com',
        searchText: 'Universe',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'no',
        searchAbsence: 'no',
      };

      await checkUrlForText(data);

      expect(PushNotification.localNotification).not.toHaveBeenCalled();
    });

    it('should notify when text is NOT found AND searchAbsence is yes', async () => {
      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve('<html><body>Hello World</body></html>'),
      });

      const data = {
        url: 'http://example.com',
        searchText: 'Universe',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'no',
        searchAbsence: 'yes',
      };

      await checkUrlForText(data);

      expect(PushNotification.localNotification).toHaveBeenCalledWith({
        message: 'Universe was not found on http://example.com',
      });
    });

    it('should NOT notify when text is found AND searchAbsence is yes', async () => {
      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve('<html><body>Hello World</body></html>'),
      });

      const data = {
        url: 'http://example.com',
        searchText: 'World',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'no',
        searchAbsence: 'yes',
      };

      await checkUrlForText(data);

      expect(PushNotification.localNotification).not.toHaveBeenCalled();
    });

    it('should handle case sensitive search correctly', async () => {
      fetch.mockResolvedValue({
        text: () => Promise.resolve('<html><body>Hello world</body></html>'),
      });

      // Case sensitive 'World' vs 'world' -> not found
      await checkUrlForText({
        url: 'http://example.com',
        searchText: 'World',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'yes',
        searchAbsence: 'no',
      });
      expect(PushNotification.localNotification).not.toHaveBeenCalled();

      // Case insensitive 'World' vs 'world' -> found
      await checkUrlForText({
        url: 'http://example.com',
        searchText: 'World',
        webPlatformType: 'mobile',
        caseSensitiveSearch: 'no',
        searchAbsence: 'no',
      });
      expect(PushNotification.localNotification).toHaveBeenCalled();
    });
  });

  describe('background_task', () => {
      it('should retrieve data and call checkUrlForText logic', async () => {
          AsyncStorage.multiGet.mockResolvedValue([
              ['url', 'http://test.com'],
              ['searchText', 'foo'],
              ['webPlatformType', 'mobile'],
              ['caseSensitiveSearch', 'no'],
              ['searchAbsence', 'no']
          ]);

          fetch.mockResolvedValueOnce({
            text: () => Promise.resolve('foo bar'),
          });

          await background_task();

          expect(AsyncStorage.multiGet).toHaveBeenCalled();
          expect(fetch).toHaveBeenCalledWith('http://test.com', expect.any(Object));
          expect(PushNotification.localNotification).toHaveBeenCalledWith({
              message: 'foo was found on http://test.com',
          });
      });
  });
});
