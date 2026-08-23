import { escapeRegExp, formatRelativeTime } from '../src/utils';

describe('escapeRegExp', () => {
  it.each([
    ['', ''],
    ['hello', 'hello'],
    ['a.b', 'a\\.b'],
    [
      'a*b+c?d^e$f{g}h(i)j[k]l\\m',
      'a\\*b\\+c\\?d\\^e\\$f\\{g\\}h\\(i\\)j\\[k\\]l\\\\m',
    ],
    ['|', '\\|'],
  ])('escapes %j -> %j', (input, expected) => {
    expect(escapeRegExp(input)).toBe(expected);
  });
});

// Buckets: <60s seconds, <60m minutes, <24h hours, otherwise days.
describe('formatRelativeTime', () => {
  const now = 1_700_000_000_000;
  const at = (msAgo: number) => String(now - msAgo);

  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['0', 'Never'],
    ['notanumber', 'Never'],
    [String(NaN), 'Never'],
    // seconds bucket
    [at(0), 'now'],
    [at(30 * 1000), '30 seconds ago'],
    // minutes bucket
    [at(60 * 1000), '1 minute ago'],
    [at(5 * 60 * 1000), '5 minutes ago'],
    // hours bucket
    [at(60 * 60 * 1000), '1 hour ago'],
    [at(3 * 60 * 60 * 1000), '3 hours ago'],
    // days bucket
    [at(24 * 60 * 60 * 1000), 'yesterday'],
    [at(5 * 24 * 60 * 60 * 1000), '5 days ago'],
  ])('%s -> %s', (ts, expected) => {
    expect(formatRelativeTime(ts)).toBe(expected);
  });

  // Regression: Hermes without Intl.RelativeTimeFormat must not crash module
  // init (device redbox "undefined cannot be used as a constructor") and the
  // fallback must produce identical strings.
  describe('without Intl.RelativeTimeFormat', () => {
    const globalRef = globalThis as { Intl?: unknown };

    afterEach(() => {
      jest.resetModules();
    });

    it.each([
      ['0', 'Never'],
      [at(0), 'now'],
      [at(30 * 1000), '30 seconds ago'],
      [at(5 * 60 * 1000), '5 minutes ago'],
      [at(3 * 60 * 60 * 1000), '3 hours ago'],
      [at(24 * 60 * 60 * 1000), 'yesterday'],
      [at(5 * 24 * 60 * 60 * 1000), '5 days ago'],
    ])('%s -> %s', (ts, expected) => {
      const originalIntl = globalRef.Intl;
      delete globalRef.Intl;
      try {
        jest.resetModules();
        const utils = require('../src/utils') as typeof import('../src/utils');
        expect(utils.formatRelativeTime(ts)).toBe(expected);
      } finally {
        globalRef.Intl = originalIntl;
      }
    });
  });
});
