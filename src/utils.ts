export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Hermes builds may lack Intl.RelativeTimeFormat; fall back to an
// English-only formatter with identical output.
const hasRtf =
  typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function';
const rtf = hasRtf
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  : null;

type RelativeUnit = 'second' | 'minute' | 'hour' | 'day';

const formatWithoutRtf = (value: number, unit: RelativeUnit): string => {
  if (value === 0) {
    return 'now';
  }
  if (unit === 'day' && value === 1) {
    return 'yesterday';
  }
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
};

const formatAgo = (value: number, unit: RelativeUnit): string =>
  rtf ? rtf.format(-value, unit) : formatWithoutRtf(value, unit);

// Buckets: <60s -> seconds, <60m -> minutes, <24h -> hours, otherwise days.
export const formatRelativeTime = (ts: string): string => {
  const millis = Number(ts);
  if (!ts || ts === '0' || !Number.isFinite(millis)) {
    return 'Never';
  }
  const diffSeconds = Math.floor((Date.now() - millis) / 1000);
  if (diffSeconds < 60) {
    return formatAgo(diffSeconds, 'second');
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return formatAgo(diffMinutes, 'minute');
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return formatAgo(diffHours, 'hour');
  }
  const diffDays = Math.floor(diffHours / 24);
  return formatAgo(diffDays, 'day');
};
