import BackgroundFetch, {
  type HeadlessEvent,
} from 'react-native-background-fetch';

import { loadWatchConfig } from '../storage/configStorage';
import { WatchConfig } from '../types';

import { runCheck } from './checkService';

const MINIMUM_FETCH_INTERVAL_MINUTES = 15;

type Tick = () => Promise<void>;

async function runGuardedTask(
  taskId: string,
  performCheck: (cfg: WatchConfig) => Promise<unknown>,
): Promise<void> {
  try {
    const cfg = await loadWatchConfig();
    if (cfg.taskSet !== 'yes' || cfg.url === '' || cfg.searchText === '') {
      return;
    }
    await performCheck(cfg);
  } catch (error) {
    console.error('[watchScheduler]', error);
  } finally {
    BackgroundFetch.finish(taskId);
  }
}

export async function startWatch(onTick: Tick): Promise<void> {
  await BackgroundFetch.configure(
    {
      minimumFetchInterval: MINIMUM_FETCH_INTERVAL_MINUTES,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    },
    async taskId => {
      await runGuardedTask(taskId, async () => onTick());
    },
    taskId => {
      console.error('[watchScheduler] timeout', taskId);
      BackgroundFetch.finish(taskId);
    },
  );
  await BackgroundFetch.start();
}

export async function stopWatch(): Promise<void> {
  await BackgroundFetch.stop();
}

export async function resumeWatchIfNeeded(onTick: Tick): Promise<void> {
  const cfg = await loadWatchConfig();
  if (cfg.taskSet === 'yes') {
    await startWatch(onTick);
  } else {
    await stopWatch();
  }
}

export async function runScheduledCheck(event: HeadlessEvent): Promise<void> {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId);
    return;
  }
  await runGuardedTask(event.taskId, runCheck);
}
