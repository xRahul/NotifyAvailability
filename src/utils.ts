export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// Buckets: <60s -> seconds, <60m -> minutes, <24h -> hours, otherwise days.
export const formatRelativeTime = (ts: string): string => {
  const millis = Number(ts);
  if (!ts || ts === '0' || !Number.isFinite(millis)) {
    return 'Never';
  }
  const diffSeconds = Math.floor((Date.now() - millis) / 1000);
  if (diffSeconds < 60) {
    return rtf.format(-diffSeconds, 'second');
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  }
  const diffDays = Math.floor(diffHours / 24);
  return rtf.format(-diffDays, 'day');
};
