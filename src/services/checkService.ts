import { USER_AGENT_DESKTOP, WEB_PLATFORM_DESKTOP } from '../constants';

import { CheckOutcome, WatchConfig } from '../types';
import { escapeRegExp } from '../utils';

import {
  ensureNotificationSetup,
  showAvailabilityNotification,
} from './notificationService';
import { saveWatchConfig } from '../storage/configStorage';

export async function runCheck(cfg: WatchConfig): Promise<CheckOutcome> {
  if (!cfg.url || !cfg.searchText) {
    return { textFound: false, notified: false };
  }

  let html: string;
  try {
    const headers =
      cfg.webPlatformType === WEB_PLATFORM_DESKTOP
        ? { 'User-Agent': USER_AGENT_DESKTOP }
        : undefined;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(cfg.url, {
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        return { textFound: false, notified: false };
      }
      html = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return { textFound: false, notified: false };
  }

  const textFound =
    cfg.caseSensitiveSearch === 'yes'
      ? html.includes(cfg.searchText)
      : new RegExp(escapeRegExp(cfg.searchText), 'i').test(html);

  await saveWatchConfig({ lastChecked: Date.now().toString() });

  const shouldNotify =
    (cfg.searchAbsence === 'no' && textFound) ||
    (cfg.searchAbsence === 'yes' && !textFound);
  if (!shouldNotify) {
    return { textFound, notified: false };
  }

  if (!(await ensureNotificationSetup())) {
    return { textFound, notified: false };
  }

  await showAvailabilityNotification(cfg.searchText, cfg.url, textFound);
  return { textFound, notified: true };
}
