import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from 'react-native-notify-kit';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../src/App';
import {
  resumeWatchIfNeeded,
  startWatch,
  stopWatch,
} from '../src/services/watchScheduler';
import { WEB_PLATFORM_DESKTOP } from '../src/constants';

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

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(),
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
  },
  AndroidImportance: { HIGH: 5 },
  AuthorizationStatus: { AUTHORIZED: 1 },
}));

const mockWebViewInstances: Array<{ reload: jest.Mock }> = [];
const mockWebViewProps: Array<Record<string, unknown>> = [];

jest.mock('react-native-webview', () => {
  const { forwardRef, useMemo, useImperativeHandle } = require('react');
  return {
    __esModule: true,
    default: forwardRef(function MockWebView(
      props: Record<string, unknown>,
      ref: React.Ref<{ reload: () => void }>,
    ) {
      const impl = useMemo(() => ({ reload: jest.fn() }), []);
      mockWebViewInstances.push(impl);
      mockWebViewProps.push(props);
      useImperativeHandle(ref, () => impl);
      return null;
    }),
  };
});

jest.mock('../src/services/watchScheduler', () => ({
  __esModule: true,
  startWatch: jest.fn(),
  stopWatch: jest.fn(),
  resumeWatchIfNeeded: jest.fn(),
}));

const mockedStartWatch = startWatch as jest.MockedFunction<typeof startWatch>;
const mockedStopWatch = stopWatch as jest.MockedFunction<typeof stopWatch>;
const mockedResume = resumeWatchIfNeeded as jest.MockedFunction<
  typeof resumeWatchIfNeeded
>;
const mockedRequestPermission = notifee.requestPermission as jest.Mock;

type Screen = Awaited<ReturnType<typeof render>>;

type FetchResponse = { text: () => Promise<string> };
const fetchMock = jest.fn<Promise<FetchResponse>, [string]>();

type TestNode = {
  type: unknown;
  props: Record<string, unknown>;
  children: Array<TestNode | string>;
  parent: TestNode | null;
};

const asNode = (instance: unknown): TestNode => instance as TestNode;

const findAllByDisplayName = (screen: Screen, displayName: RegExp) => {
  const found: TestNode[] = [];
  const walk = (node: TestNode | string): void => {
    if (typeof node !== 'string') {
      if (displayName.test(String(node.type))) {
        found.push(node);
      }
      node.children.forEach(walk);
    }
  };
  walk(asNode(screen.root));
  return found;
};

const isButtonDisabled = (screen: Screen, title: string): boolean => {
  let node: TestNode | null = asNode(screen.getByText(title));
  while (node && node.props.disabled === undefined) {
    node = node.parent;
  }
  return Boolean(node?.props.disabled);
};

const enterUrlAndSearch = async (
  screen: Screen,
  url = 'https://example.com/product',
  searchText = 'In Stock',
): Promise<void> => {
  await fireEvent.changeText(screen.getByLabelText('URL input'), url);
  await fireEvent.changeText(
    screen.getByLabelText('Search text input'),
    searchText,
  );
};

describe('App', () => {
  let consoleSpy: jest.SpyInstance;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    mockWebViewInstances.length = 0;
    mockWebViewProps.length = 0;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ text: async () => '<html>In Stock</html>' });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    mockedRequestPermission.mockResolvedValue({ authorizationStatus: 1 });
    mockedStartWatch.mockResolvedValue(undefined);
    mockedStopWatch.mockResolvedValue(undefined);
    mockedResume.mockResolvedValue(undefined);
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    consoleSpy.mockRestore();
  });

  it('shows Never for Last Checked and resumes watch on mount', async () => {
    const screen = await render(<App />);

    expect(screen.getByText('Last Checked: Never')).toBeTruthy();
    expect(mockedResume).toHaveBeenCalledTimes(1);
    expect(mockedResume).toHaveBeenCalledWith(expect.any(Function));
  });

  it('keeps UI usable when mount resume rejects', async () => {
    mockedResume.mockRejectedValueOnce(new Error('resume boom'));

    const screen = await render(<App />);

    expect(screen.getByText('Last Checked: Never')).toBeTruthy();
    expect(screen.getByText('Start Checking')).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('invalid URL shows inline error and never starts', async () => {
    const screen = await render(<App />);
    await enterUrlAndSearch(screen, 'ftp://not-a-web-url');
    await fireEvent.press(screen.getByText('Start Checking'));

    await waitFor(() =>
      expect(
        screen.getByText('URL must start with http:// or https://'),
      ).toBeTruthy(),
    );
    expect(mockedStartWatch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockStore.get('taskSet')).toBeUndefined();
  });

  it('start persists config, starts watch, runs immediate check', async () => {
    const screen = await render(<App />);
    await enterUrlAndSearch(screen);
    await fireEvent.press(screen.getByText('Start Checking'));

    await waitFor(() => expect(screen.getByText('Stop Checking')).toBeTruthy());

    expect(mockedStartWatch).toHaveBeenCalledTimes(1);
    expect(mockedStartWatch).toHaveBeenCalledWith(expect.any(Function));
    expect(notifee.createChannel).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/product');
    expect(mockStore.get('url')).toBe('https://example.com/product');
    expect(mockStore.get('taskSet')).toBe('yes');
    expect(mockStore.get('lastChecked')).toBeDefined();
  });

  it('disables Start while the initial check is in flight', async () => {
    mockedRequestPermission.mockImplementationOnce(
      () =>
        new Promise(resolve =>
          setTimeout(() => resolve({ authorizationStatus: 1 }), 100),
        ),
    );

    const screen = await render(<App />);
    await enterUrlAndSearch(screen);
    fireEvent.press(screen.getByText('Start Checking'));

    await waitFor(
      () => {
        expect(isButtonDisabled(screen, 'Start Checking')).toBe(true);
      },
      { timeout: 80 },
    );
    await waitFor(() => expect(screen.getByText('Stop Checking')).toBeTruthy());
  });

  it('denied notification permission aborts start without sticking loading', async () => {
    mockedRequestPermission.mockResolvedValueOnce({ authorizationStatus: 0 });

    const screen = await render(<App />);
    await enterUrlAndSearch(screen);
    await fireEvent.press(screen.getByText('Start Checking'));

    await waitFor(() => {
      expect(isButtonDisabled(screen, 'Start Checking')).toBe(false);
    });
    expect(screen.queryByText('Stop Checking')).toBeNull();
    expect(mockedStartWatch).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockStore.get('taskSet')).toBeUndefined();
  });

  it('immediate check failure does not leave loading stuck', async () => {
    const setManySpy = jest
      .spyOn(AsyncStorage, 'setMany')
      .mockRejectedValueOnce(new Error('disk full'));

    const screen = await render(<App />);
    await enterUrlAndSearch(screen);
    await fireEvent.press(screen.getByText('Start Checking'));

    await waitFor(() => {
      expect(findAllByDisplayName(screen, /ActivityIndicator/)).toHaveLength(0);
    });
    expect(screen.getByText('Stop Checking')).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();
    setManySpy.mockRestore();
  });

  it('stop flow stops watch and persists taskSet no', async () => {
    mockStore.set('url', 'https://example.com/product');
    mockStore.set('searchText', 'In Stock');
    mockStore.set('taskSet', 'yes');

    const screen = await render(<App />);
    await waitFor(() => expect(screen.getByText('Stop Checking')).toBeTruthy());

    await fireEvent.press(screen.getByText('Stop Checking'));

    await waitFor(() =>
      expect(screen.getByText('Start Checking')).toBeTruthy(),
    );
    expect(mockedStopWatch).toHaveBeenCalledTimes(1);
    expect(mockStore.get('taskSet')).toBe('no');
  });

  it('persists stop even when background stop rejects', async () => {
    mockStore.set('url', 'https://example.com/product');
    mockStore.set('searchText', 'In Stock');
    mockStore.set('taskSet', 'yes');
    mockedStopWatch.mockRejectedValueOnce(new Error('stop boom'));

    const screen = await render(<App />);
    await waitFor(() => expect(screen.getByText('Stop Checking')).toBeTruthy());

    await fireEvent.press(screen.getByText('Stop Checking'));

    await waitFor(() =>
      expect(screen.getByText('Start Checking')).toBeTruthy(),
    );
    expect(mockStore.get('taskSet')).toBe('no');
  });

  it('passes dataDetectorTypes as an array for native codegen compatibility', async () => {
    mockStore.set('url', 'https://example.com/product');
    mockStore.set('taskSet', 'yes');

    await render(<App />);
    await waitFor(() => expect(mockWebViewProps.length).toBeGreaterThan(0));

    expect(Array.isArray(mockWebViewProps[0].dataDetectorTypes)).toBe(true);
    expect(mockWebViewProps[0].dataDetectorTypes).toEqual(['all']);
  });

  it('desktop picker change reloads WebView and persists platform', async () => {
    mockStore.set('url', 'https://example.com/product');
    mockStore.set('taskSet', 'yes');

    const screen = await render(<App />);
    await waitFor(() => expect(mockWebViewInstances.length).toBeGreaterThan(0));

    await fireEvent(screen.getByLabelText('Platform picker'), 'onChange', {
      nativeEvent: { newValue: WEB_PLATFORM_DESKTOP, newIndex: 1 },
    });

    await waitFor(() =>
      expect(
        mockWebViewInstances.some(i => i.reload.mock.calls.length > 0),
      ).toBe(true),
    );
    expect(mockStore.get('webPlatformType')).toBe(WEB_PLATFORM_DESKTOP);
  });
});
