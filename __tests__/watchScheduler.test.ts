import BackgroundFetch from 'react-native-background-fetch';

import {
  resumeWatchIfNeeded,
  runScheduledCheck,
  startWatch,
  stopWatch,
} from '../src/services/watchScheduler';
import { runCheck } from '../src/services/checkService';
import { loadWatchConfig } from '../src/storage/configStorage';
import { DEFAULT_CONFIG, WatchConfig } from '../src/types';

jest.mock('react-native-background-fetch', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    finish: jest.fn(),
    registerHeadlessTask: jest.fn(),
  },
}));

jest.mock('../src/services/checkService', () => ({
  __esModule: true,
  runCheck: jest.fn(),
}));

jest.mock('../src/storage/configStorage', () => ({
  __esModule: true,
  loadWatchConfig: jest.fn(),
}));

const mockedConfigure = BackgroundFetch.configure as jest.MockedFunction<
  typeof BackgroundFetch.configure
>;
const mockedStart = BackgroundFetch.start as jest.Mock;
const mockedStop = BackgroundFetch.stop as jest.Mock;
const mockedFinish = BackgroundFetch.finish as jest.Mock;
const mockedRunCheck = runCheck as jest.MockedFunction<typeof runCheck>;
const mockedLoad = loadWatchConfig as jest.MockedFunction<
  typeof loadWatchConfig
>;

const getHandlers = (
  callIndex = 0,
): {
  onEvent: (taskId: string) => Promise<void>;
  onTimeout: (taskId: string) => void;
} => {
  const [, onEvent, onTimeout] = mockedConfigure.mock.calls[callIndex];
  return {
    onEvent: onEvent as unknown as (taskId: string) => Promise<void>,
    onTimeout: onTimeout as unknown as (taskId: string) => void,
  };
};

const makeCfg = (overrides: Partial<WatchConfig> = {}): WatchConfig => ({
  ...DEFAULT_CONFIG,
  taskSet: 'yes',
  url: 'https://example.com/product',
  searchText: 'In Stock',
  ...overrides,
});

describe('startWatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedConfigure.mockResolvedValue(2);
    mockedLoad.mockResolvedValue(makeCfg());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('configures with the watch schedule and starts the fetch', async () => {
    const onTick = jest.fn();

    await startWatch(onTick);

    expect(mockedConfigure).toHaveBeenCalledTimes(1);
    expect(mockedConfigure).toHaveBeenCalledWith(
      {
        minimumFetchInterval: 15,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
      },
      expect.any(Function),
      expect.any(Function),
    );
    expect(mockedStart).toHaveBeenCalledTimes(1);
  });

  it('runs onTick and finishes the task when config is active', async () => {
    const onTick = jest.fn().mockResolvedValue(undefined);
    await startWatch(onTick);
    const { onEvent } = getHandlers();

    await onEvent('task-1');

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(mockedRunCheck).not.toHaveBeenCalled();
    expect(mockedFinish).toHaveBeenCalledWith('task-1');
  });

  it.each([
    ['taskSet no', makeCfg({ taskSet: 'no' })],
    ['empty url', makeCfg({ url: '' })],
    ['empty searchText', makeCfg({ searchText: '' })],
  ])('short-circuits to finish without ticking on %s', async (_name, cfg) => {
    mockedLoad.mockResolvedValueOnce(cfg);
    const onTick = jest.fn();
    await startWatch(onTick);
    const { onEvent } = getHandlers();

    await onEvent('task-guard');

    expect(onTick).not.toHaveBeenCalled();
    expect(mockedRunCheck).not.toHaveBeenCalled();
    expect(mockedFinish).toHaveBeenCalledWith('task-guard');
  });

  it('still finishes when onTick rejects and logs with [watchScheduler]', async () => {
    const onTick = jest.fn().mockRejectedValue(new Error('storage down'));
    await startWatch(onTick);
    const { onEvent } = getHandlers();

    await onEvent('task-reject');

    expect(onTick).toHaveBeenCalledTimes(1);
    expect(mockedFinish).toHaveBeenCalledWith('task-reject');
    expect(console.error).toHaveBeenCalledWith(
      '[watchScheduler]',
      expect.any(Error),
    );
  });

  it('still finishes when loadWatchConfig rejects', async () => {
    mockedLoad.mockRejectedValue(new Error('async storage gone'));
    const onTick = jest.fn();
    await startWatch(onTick);
    const { onEvent } = getHandlers();

    await onEvent('task-load-fail');

    expect(onTick).not.toHaveBeenCalled();
    expect(mockedFinish).toHaveBeenCalledWith('task-load-fail');
    expect(console.error).toHaveBeenCalledWith(
      '[watchScheduler]',
      expect.any(Error),
    );
  });

  it('finishes immediately on timeout event', async () => {
    await startWatch(jest.fn());
    const { onTimeout } = getHandlers();

    onTimeout('task-timeout');

    expect(mockedFinish).toHaveBeenCalledWith('task-timeout');
  });
});

describe('stopWatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops background fetch', async () => {
    await stopWatch();

    expect(mockedStop).toHaveBeenCalledTimes(1);
  });
});

describe('resumeWatchIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedConfigure.mockResolvedValue(2);
    mockedStart.mockResolvedValue(undefined);
    mockedStop.mockResolvedValue(undefined);
  });

  it('starts the watch when taskSet is yes', async () => {
    mockedLoad.mockResolvedValue(makeCfg({ taskSet: 'yes' }));

    await resumeWatchIfNeeded(async () => {});

    expect(mockedConfigure).toHaveBeenCalledTimes(1);
    expect(mockedStart).toHaveBeenCalledTimes(1);
    expect(mockedStop).not.toHaveBeenCalled();
  });

  it('stops the watch when taskSet is no', async () => {
    mockedLoad.mockResolvedValue(makeCfg({ taskSet: 'no' }));

    await resumeWatchIfNeeded(async () => {});

    expect(mockedStop).toHaveBeenCalledTimes(1);
    expect(mockedConfigure).not.toHaveBeenCalled();
    expect(mockedStart).not.toHaveBeenCalled();
  });

  it('is idempotent across repeated calls', async () => {
    mockedLoad.mockResolvedValue(makeCfg({ taskSet: 'no' }));

    await resumeWatchIfNeeded(async () => {});
    await resumeWatchIfNeeded(async () => {});

    expect(mockedStop).toHaveBeenCalledTimes(2);
  });
});

describe('runScheduledCheck (headless)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedLoad.mockResolvedValue(makeCfg());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads config, runs the check, finishes the task', async () => {
    const cfg = makeCfg();
    mockedLoad.mockResolvedValue(cfg);

    await runScheduledCheck({ taskId: 'headless-1', timeout: false });

    expect(mockedRunCheck).toHaveBeenCalledWith(cfg);
    expect(mockedFinish).toHaveBeenCalledWith('headless-1');
  });

  it('skips the check but still finishes when guard trips', async () => {
    mockedLoad.mockResolvedValue(makeCfg({ taskSet: 'no' }));

    await runScheduledCheck({ taskId: 'headless-2', timeout: false });

    expect(mockedRunCheck).not.toHaveBeenCalled();
    expect(mockedFinish).toHaveBeenCalledWith('headless-2');
  });

  it('still finishes when runCheck rejects after a successful fetch', async () => {
    mockedRunCheck.mockRejectedValueOnce(new Error('notification failed'));

    await runScheduledCheck({ taskId: 'headless-3', timeout: false });

    expect(mockedRunCheck).toHaveBeenCalledTimes(1);
    expect(mockedFinish).toHaveBeenCalledWith('headless-3');
    expect(console.error).toHaveBeenCalledWith(
      '[watchScheduler]',
      expect.any(Error),
    );
  });

  it('finishes immediately without checking on timeout event', async () => {
    await runScheduledCheck({ taskId: 'headless-4', timeout: true });

    expect(mockedLoad).not.toHaveBeenCalled();
    expect(mockedRunCheck).not.toHaveBeenCalled();
    expect(mockedFinish).toHaveBeenCalledWith('headless-4');
  });
});
