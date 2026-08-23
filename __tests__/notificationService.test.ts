import notifee, {
  AndroidImportance,
  AuthorizationStatus,
} from 'react-native-notify-kit';

import {
  ensureNotificationSetup,
  showAvailabilityNotification,
} from '../src/services/notificationService';

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(),
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
  },
  AndroidImportance: { HIGH: 4 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

const mocked = notifee as jest.Mocked<typeof notifee>;

const withAuthorization = (status: AuthorizationStatus) =>
  ({ authorizationStatus: status }) as Awaited<
    ReturnType<typeof notifee.requestPermission>
  >;

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureNotificationSetup', () => {
    it('requests permission and creates the availability channel', async () => {
      mocked.requestPermission.mockResolvedValue(
        withAuthorization(AuthorizationStatus.AUTHORIZED),
      );
      mocked.createChannel.mockResolvedValue('availability');

      await expect(ensureNotificationSetup()).resolves.toBe(true);

      expect(mocked.requestPermission).toHaveBeenCalledTimes(1);
      expect(mocked.createChannel).toHaveBeenCalledTimes(1);
      expect(mocked.createChannel).toHaveBeenCalledWith({
        id: 'availability',
        name: 'Availability Alerts',
        importance: AndroidImportance.HIGH,
      });
    });

    it('returns false when permission is denied', async () => {
      mocked.requestPermission.mockResolvedValue(
        withAuthorization(AuthorizationStatus.DENIED),
      );

      await expect(ensureNotificationSetup()).resolves.toBe(false);
    });

    it('returns true for provisional authorization', async () => {
      mocked.requestPermission.mockResolvedValue(
        withAuthorization(AuthorizationStatus.PROVISIONAL),
      );

      await expect(ensureNotificationSetup()).resolves.toBe(true);
    });
  });

  describe('showAvailabilityNotification', () => {
    it('displays found notification on availability channel', async () => {
      mocked.displayNotification.mockResolvedValue('1');

      await showAvailabilityNotification(
        'In Stock',
        'https://example.com',
        true,
      );

      expect(mocked.displayNotification).toHaveBeenCalledTimes(1);
      expect(mocked.displayNotification).toHaveBeenCalledWith({
        body: 'In Stock was found on https://example.com',
        android: { channelId: 'availability' },
      });
    });

    it('displays not-found notification body', async () => {
      mocked.displayNotification.mockResolvedValue('1');

      await showAvailabilityNotification(
        'In Stock',
        'https://example.com/page',
        false,
      );

      expect(mocked.displayNotification).toHaveBeenCalledWith({
        body: 'In Stock was not found on https://example.com/page',
        android: { channelId: 'availability' },
      });
    });
  });
});
