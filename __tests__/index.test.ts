import BackgroundFetch from 'react-native-background-fetch';

import { runCheck } from '../src/services/checkService';
import { loadWatchConfig } from '../src/storage/configStorage';
import { DEFAULT_CONFIG, WatchConfig } from '../src/types';
import '../index';

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

const mockedRegisterHeadless =
  BackgroundFetch.registerHeadlessTask as jest.Mock;
const mockedFinish = BackgroundFetch.finish as jest.Mock;
const mockedRunCheck = runCheck as jest.MockedFunction<typeof runCheck>;
const mockedLoad = loadWatchConfig as jest.MockedFunction<
  typeof loadWatchConfig
>;

const makeCfg = (overrides: Partial<WatchConfig> = {}): WatchConfig => ({
  ...DEFAULT_CONFIG,
  taskSet: 'yes',
  url: 'https://example.com/product',
  searchText: 'In Stock',
  ...overrides,
});

type HeadlessTask = (event: {
  taskId: string;
  timeout: boolean;
}) => Promise<void>;

const [registeredTask] = mockedRegisterHeadless.mock.calls[0] as unknown as [
  HeadlessTask,
];

describe('index headless registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runRegisteredTask = async (event: {
    taskId: string;
    timeout: boolean;
  }): Promise<void> => registeredTask(event);

  it('registers a single BackgroundFetch headless task', () => {
    expect(typeof registeredTask).toBe('function');
  });

  it('runs the guarded check pipeline and finishes', async () => {
    const cfg = makeCfg();
    mockedLoad.mockResolvedValue(cfg);

    await runRegisteredTask({ taskId: 'headless-1', timeout: false });

    expect(mockedRunCheck).toHaveBeenCalledWith(cfg);
    expect(mockedFinish).toHaveBeenCalledWith('headless-1');
  });

  it('still finishes when runCheck rejects', async () => {
    mockedLoad.mockResolvedValue(makeCfg());
    mockedRunCheck.mockRejectedValueOnce(new Error('storage down'));

    await runRegisteredTask({ taskId: 'headless-2', timeout: false });

    expect(mockedFinish).toHaveBeenCalledWith('headless-2');
    expect(console.error).toHaveBeenCalledWith(
      '[watchScheduler]',
      expect.any(Error),
    );
  });
});
