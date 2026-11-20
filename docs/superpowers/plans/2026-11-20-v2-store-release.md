# NotifyAvailability 2.0.0 — Store Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a signed, explainable, minimal 2.0.0 build whose notification behaviour is truthful, whose attack surface is smallest, and which satisfies the F-Droid and IzzyOnDroid inclusion rules without a reviewer round-trip.

**Architecture:** Behaviour changes stay inside the existing three-service seam (`checkService` decides, `notificationService` displays, `watchScheduler` ticks). Notification state is persisted as four flat AsyncStorage keys next to the existing config, so there is no storage migration. Release identity moves to `android/version.properties` as the single source of truth; workflows read it and assert the tag matches. Deletions (watch repository, iOS, light theme, benchmark script) remove code rather than add it.

**Tech Stack:** React Native 0.87.0, TypeScript, Hermes, react-native-notify-kit 10.10.1, react-native-background-fetch 4.5.0, AsyncStorage 3.1.1, Gradle 8.14.5, AGP 8.12.3, Kotlin 2.2.20, compileSdk/targetSdk 36, minSdk 24, Node 22 (CI), JDK 17 (CI).

**Spec:** This plan implements the audit in the 2026-11-20 session plus the five locked decisions below. `improvements.md` (gitignored wishlist) is **not** a spec for this plan.

## Decisions locked (2026-11-20)

| # | Decision |
|---|---|
| D1 | Delete the half-built multi-target watch repository (`watchRepository.ts`, `WatchTarget`, its test). |
| D2 | Delete the iOS scaffold (`ios/`, `Podfile`, iOS npm script). Android only. |
| D3 | Notifications: notify on transition into the alert state, then re-notify at most once per hour while the state holds. |
| D4 | URLs: `https://` only. Plain `http://` is rejected with an explanation, not silently attempted. |
| D5 | Version: `2.0.0`, `versionCode` 20 (per-ABI override yields 201/203). |

## Global Constraints

- Package name stays `com.notifyavailability`. Never changes; Izzy treats a change as a migration burden.
- No new runtime dependencies. Two upgrades only: `react-native-notify-kit` 10.10.1, `react-native-background-fetch` 4.5.0.
- Do not touch the Gradle 8.14.5 / AGP 8.12.3 / Kotlin 2.2.20 pin. AsyncStorage 3.1.1 KSP breaks on Kotlin 2.4 (see commit `eb76a85`).
- `yarn test --ci`, `yarn lint`, `yarn typecheck`, `yarn format:check` must pass before any commit that claims green.
- Notification copy is user-facing text: normal English, no abbreviations.
- Every gate in the Verification Matrix runs before claiming a task done.
- Deletions outrank additions. If a task tempts you to add an abstraction nobody asked for, do not.

## Review Focus

Inputs and conditions that will bite a real user, most likely first. Each has a test pinned in the task that owns the code.

1. Page starts matching twice in a row → user gets one notification, not two, then one per hour maximum (Task 3).
2. Site returns 403/503 or the phone is offline → no "gone" notification, and the app shows the failure instead of a stale "5 minutes ago" (Task 3, Task 5).
3. Keyword typed but not blurred, then Start pressed → the keyword that runs is the keyword on screen (Task 4).
4. URL entered as `http://` or with trailing spaces → rejected with a clear message, never a silent dead monitor (Task 4).
5. Alert state clears then returns → a new notification fires, because the state re-armed (Task 3).
6. `lastNotifiedAt` is `''` on a fresh install → `Number('') = 0`, cooldown counts as elapsed, transition path still governs (Task 3).
7. A page links off-site inside the preview WebView → navigation is blocked, the monitor URL is unchanged (Task 6).
8. Store metadata file missing or short description over 80 characters → store-check job fails before a human submits (Task 14).

---

## File Structure

**Create**

| File | Responsibility |
|---|---|
| `android/version.properties` | Single source of `versionCode` / `versionName`. |
| `android/app/src/main/res/xml/network_security_config.xml` | Cleartext off, system trust anchors only. |
| `android/app/src/main/res/drawable/ic_stat_availability.xml` | Monochrome status-bar icon (24dp vector). |
| `fastlane/metadata/android/en-US/title.txt` | Store title. |
| `fastlane/metadata/android/en-US/short_description.txt` | Store short description (≤ 80 chars). |
| `fastlane/metadata/android/en-US/full_description.txt` | Store full description. |
| `fastlane/metadata/android/en-US/changelogs/20.txt` | Per-version changelog. |
| `fastlane/metadata/android/en-US/images/icon.png` | 512×512 store icon. |
| `fastlane/metadata/android/en-US/images/featureGraphic.png` | 1024×500 feature graphic. |
| `fastlane/metadata/android/en-US/images/phoneScreenshots/1.png` | 1080×1920 screenshot. |
| `metadata/com.notifyavailability.yml` | F-Droid build recipe. |
| `docs/store-release.md` | Release + submission runbook. |
| `SECURITY.md` | Supported versions, private report channel, scope. |
| `CHANGELOG.md` | User-facing history, mirrors changelogs. |
| `.github/workflows/store-check.yml` | Validates fastlane + recipe on release. |

**Modify**

`src/types.ts`, `src/storage/configStorage.ts`, `src/services/checkService.ts`, `src/services/notificationService.ts`, `src/services/watchScheduler.ts`, `src/App.tsx`, `src/Styles.ts`, `src/components/{SettingsSwitch,UrlInput}.tsx`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `package.json`, `README.md`, `.github/workflows/{ci,android-release,android-debug}.yml`, `.github/renovate.json5`, `__tests__/{checkService,configStorage,app}.test.ts(x)`.

**Delete**

`src/storage/watchRepository.ts`, `__tests__/watchRepository.test.ts`, `ios/` (whole tree), `scripts/benchmark_moment.js`, light palette + `getTheme` (`src/Styles.ts:27-52`), the `ios` npm script, `dataDetectorTypes` prop (`src/App.tsx:281`).

---

### Task 1: Delete dead scaffolding

**Files:**
- Delete: `src/storage/watchRepository.ts`, `__tests__/watchRepository.test.ts`, `scripts/benchmark_moment.js`, `ios/`
- Modify: `src/types.ts:30-41`, `package.json`, `src/Styles.ts:27-52`

**Interfaces:**
- Produces: `src/types.ts` without `WatchTarget`; nothing consumes it.

- [ ] **Step 1: Remove `WatchTarget` from `src/types.ts`** (lines 30-41, whole interface).
- [ ] **Step 2: Delete the four paths above.**

```bash
git rm -r src/storage/watchRepository.ts __tests__/watchRepository.test.ts scripts/benchmark_moment.js ios
```

- [ ] **Step 3: Remove the `ios` script from `package.json`** and the `light` palette plus `getTheme` from `src/Styles.ts` (both unused: `grep -rn "COLORS\|getTheme" src __tests__` returns only `Styles.ts`).
- [ ] **Step 4: Verify**

Run: `yarn typecheck && yarn lint && yarn test --ci`
Expected: PASS, 9 suites (one fewer than today's 10).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: delete unbuilt multi-target repo, iOS scaffold, dead palette and benchmark script"
```

---

### Task 2: Config keys for check state

**Files:**
- Modify: `src/types.ts`, `src/storage/configStorage.ts`
- Test: `__tests__/configStorage.test.ts`

**Interfaces:**
- Produces:
  - `type WatchResult = 'found' | 'absent' | 'error'`
  - `WatchConfig` gains `lastResult: WatchResult | ''`, `lastError: string`, `alerting: YesNo`, `lastNotifiedAt: string`
  - `DEFAULT_CONFIG` values: `lastResult: ''`, `lastError: ''`, `alerting: 'no'`, `lastNotifiedAt: '0'`
  - `saveWatchConfig(patch: Partial<WatchConfig>): Promise<void>` unchanged in signature
  - `loadWatchConfig(): Promise<WatchConfig>` unchanged in signature, merges defaults for absent keys

- [ ] **Step 1: Write the failing test**

```ts
it('round-trips the new check-state keys', async () => {
  await saveWatchConfig({
    lastResult: 'error',
    lastError: 'HTTP 403',
    alerting: 'yes',
    lastNotifiedAt: '1760000000000',
  });
  const cfg = await loadWatchConfig();
  expect(cfg.lastResult).toBe('error');
  expect(cfg.lastError).toBe('HTTP 403');
  expect(cfg.alerting).toBe('yes');
  expect(cfg.lastNotifiedAt).toBe('1760000000000');
});

it('defaults check state on a fresh install', async () => {
  const cfg = await loadWatchConfig();
  expect(cfg.lastResult).toBe('');
  expect(cfg.lastError).toBe('');
  expect(cfg.alerting).toBe('no');
  expect(cfg.lastNotifiedAt).toBe('0');
});
```

- [ ] **Step 2: Run it**

Run: `yarn test __tests__/configStorage.test.ts`
Expected: FAIL — `lastResult` undefined.

- [ ] **Step 3: Extend the types and the key list**

Add the four keys to `CONFIG_KEYS` in `src/storage/configStorage.ts`. Replace the `as Record<string, string>` cast at line 21 with a typed assignment:

```ts
const updates: Partial<Record<keyof WatchConfig, string>> = {};
for (const key of CONFIG_KEYS) {
  const value = values[key];
  if (value !== null) {
    updates[key] = value;
  }
}
return { ...DEFAULT_CONFIG, ...updates } as WatchConfig;
```

The single `as WatchConfig` is where storage strings become typed config; keep `lastResult` string-typed in storage and validate at read time in `checkService` (Task 3) rather than widening the union here.

- [ ] **Step 4: Verify**

Run: `yarn test __tests__/configStorage.test.ts && yarn typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/storage/configStorage.ts __tests__/configStorage.test.ts
git commit -m "feat(storage): persist check result, error and notification state"
```

---

### Task 3: Transition-only notifications with one-hour re-notify

**Files:**
- Modify: `src/services/checkService.ts` (whole file), `src/types.ts`
- Test: `__tests__/checkService.test.ts`

**Interfaces:**
- Produces:
  - `type CheckOutcome = { result: WatchResult | ''; alerting: boolean; notified: boolean; error?: string }`
  - `runCheck(cfg: WatchConfig, now?: number): Promise<CheckOutcome>` — `now` defaults to `Date.now()`, injected by tests only
  - `const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000` exported for the test, not used elsewhere

- [ ] **Step 1: Write the failing tests** (replace the `notified: true` expectations in the existing suite)

```ts
it('notifies on the transition into the alert state', async () => {
  fetchMock.mockResolvedValue({ ok: true, text: async () => HTML });
  const first = await runCheck(makeCfg({ alerting: 'no', lastNotifiedAt: '0' }), 1_000);
  expect(first).toEqual({ result: 'found', alerting: true, notified: true });
  expect(mockedSave).toHaveBeenCalledWith(expect.objectContaining({ alerting: 'yes', lastNotifiedAt: '1000' }));
});

it('stays quiet while the alert state holds inside the cooldown', async () => {
  fetchMock.mockResolvedValue({ ok: true, text: async () => HTML });
  const again = await runCheck(
    makeCfg({ alerting: 'yes', lastNotifiedAt: String(1_000) }),
    1_000 + 60_000,
  );
  expect(again).toEqual({ result: 'found', alerting: true, notified: false });
  expect(mockedShow).not.toHaveBeenCalled();
});

it('re-notifies after the cooldown while the alert state holds', async () => {
  fetchMock.mockResolvedValue({ ok: true, text: async () => HTML });
  const later = await runCheck(
    makeCfg({ alerting: 'yes', lastNotifiedAt: String(1_000) }),
    1_000 + NOTIFY_COOLDOWN_MS,
  );
  expect(later.notified).toBe(true);
  expect(mockedSave).toHaveBeenCalledWith(expect.objectContaining({ lastNotifiedAt: String(1_000 + NOTIFY_COOLDOWN_MS) }));
});

it('re-arms after the condition clears, so the next match notifies again', async () => {
  fetchMock.mockResolvedValue({ ok: true, text: async () => '<html>nothing</html>' });
  const cleared = await runCheck(makeCfg({ alerting: 'yes', lastNotifiedAt: '1000' }), 5_000);
  expect(cleared).toEqual({ result: 'absent', alerting: false, notified: false });
  expect(mockedSave).toHaveBeenCalledWith({ alerting: 'no' });

  fetchMock.mockResolvedValue({ ok: true, text: async () => HTML });
  const back = await runCheck(makeCfg({ alerting: 'no', lastNotifiedAt: '1000' }), 6_000);
  expect(back.notified).toBe(true);
});

it('records the failure and never notifies on a network error', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  const outcome = await runCheck(makeCfg({ alerting: 'yes', lastNotifiedAt: '1000', searchAbsence: 'yes' }), 9_000);
  expect(outcome).toEqual({ result: 'error', alerting: true, notified: false, error: 'network error' });
  expect(mockedSave).toHaveBeenCalledWith({
    lastChecked: '9000',
    lastResult: 'error',
    lastError: 'network error',
  });
  expect(mockedShow).not.toHaveBeenCalled();
});

it('records an HTTP status failure as an error, not an absence', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'nope' });
  const outcome = await runCheck(makeCfg({ searchAbsence: 'yes' }), 9_000);
  expect(outcome.result).toBe('error');
  expect(outcome.error).toBe('HTTP 403');
});
```

- [ ] **Step 2: Run to confirm they fail**

Run: `yarn test __tests__/checkService.test.ts`
Expected: FAIL — `result` is undefined / `notified` true on every tick.

- [ ] **Step 3: Implement `runCheck`**

Detection stays as is (`includes` for case-sensitive, `new RegExp(escapeRegExp(...), 'i')` otherwise). New body:

```ts
export const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

export async function runCheck(cfg: WatchConfig, now = Date.now()): Promise<CheckOutcome> {
  if (!cfg.url || !cfg.searchText) {
    return { result: '', alerting: cfg.alerting === 'yes', notified: false };
  }

  let html: string;
  try {
    const headers = cfg.webPlatformType === WEB_PLATFORM_DESKTOP ? { 'User-Agent': USER_AGENT_DESKTOP } : undefined;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(cfg.url, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new HttpError(response.status);
      }
      html = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const reason = error instanceof HttpError ? `HTTP ${error.status}` : 'network error';
    await saveWatchConfig({ lastChecked: now.toString(), lastResult: 'error', lastError: reason });
    return { result: 'error', alerting: cfg.alerting === 'yes', notified: false, error: reason };
  }

  const textFound = cfg.caseSensitiveSearch === 'yes'
    ? html.includes(cfg.searchText)
    : new RegExp(escapeRegExp(cfg.searchText), 'i').test(html);
  const result: WatchResult = textFound ? 'found' : 'absent';
  const alerting = (cfg.searchAbsence === 'no') === textFound;

  await saveWatchConfig({ lastChecked: now.toString(), lastResult: result, lastError: '' });

  if (!alerting) {
    if (cfg.alerting === 'yes') {
      await saveWatchConfig({ alerting: 'no' });
    }
    return { result, alerting: false, notified: false };
  }

  const isTransition = cfg.alerting !== 'yes';
  const cooldownOver = now - Number(cfg.lastNotifiedAt || '0') >= NOTIFY_COOLDOWN_MS;
  if (!isTransition && !cooldownOver) {
    return { result, alerting: true, notified: false };
  }

  if (!(await ensureNotificationSetup())) {
    return { result, alerting: true, notified: false };
  }

  await showAvailabilityNotification(cfg.searchText, cfg.url, textFound);
  await saveWatchConfig({ alerting: 'yes', lastNotifiedAt: now.toString() });
  return { result, alerting: true, notified: true };
}
```

Errors do not clear `alerting`: a still-alerting page that briefly fails must not re-fire on recovery (transition already consumed) and must not lose its state.

- [ ] **Step 4: Verify**

Run: `yarn test __tests__/checkService.test.ts`
Expected: PASS. Then `yarn typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/services/checkService.ts src/types.ts __tests__/checkService.test.ts
git commit -m "feat(check): notify on state transition, re-notify hourly, persist failures"
```

---

### Task 4: Validate input on Start and persist the whole config

**Files:**
- Modify: `src/App.tsx:31-32, 82-115`
- Test: `__tests__/app.test.tsx`

**Interfaces:**
- Produces: `persist<K extends keyof WatchConfig>(key: K, value: WatchConfig[K]): void`
- Produces: error strings `URL must start with https://` and `Search string cannot be empty`

- [ ] **Step 1: Write the failing tests**

```ts
it('rejects a plain http URL', async () => {
  const { getByLabelText, getByText } = render(<App />);
  fireEvent.changeText(getByLabelText('URL input'), 'http://example.com');
  fireEvent.press(getByText('Start Checking'));
  expect(await screen.findByText('URL must start with https://')).toBeTruthy();
});

it('rejects an empty search string', async () => {
  const { getByLabelText, getByText } = render(<App />);
  fireEvent.changeText(getByLabelText('URL input'), 'https://example.com');
  fireEvent.changeText(getByLabelText('Search text input'), '   ');
  fireEvent.press(getByText('Start Checking'));
  expect(await screen.findByText('Search string cannot be empty')).toBeTruthy();
});

it('saves the trimmed keyword when Start is pressed without blurring', async () => {
  const { getByLabelText, getByText } = render(<App />);
  fireEvent.changeText(getByLabelText('URL input'), '  https://example.com/page  ');
  fireEvent.changeText(getByLabelText('Search text input'), ' In Stock ');
  fireEvent.press(getByText('Start Checking'));
  expect(mockedSave).toHaveBeenCalledWith(
    expect.objectContaining({ url: 'https://example.com/page', searchText: 'In Stock', taskSet: 'yes' }),
  );
});
```

- [ ] **Step 2: Run them**

Run: `yarn test __tests__/app.test.tsx`
Expected: FAIL — `http://` is accepted today, no message is rendered, keyword is not saved on Start.

- [ ] **Step 3: Implement**

In `src/App.tsx`:

```ts
const URL_PATTERN = /^https:\/\//i;
const URL_ERROR = 'URL must start with https://';
const SEARCH_ERROR = 'Search string cannot be empty';
```

Keep one error slot by replacing the `urlError` state with `formError: string | null` and both setters. `handleStart`:

```ts
const trimmedUrl = config.url.trim();
const trimmedSearch = config.searchText.trim();
if (!URL_PATTERN.test(trimmedUrl)) { setFormError(URL_ERROR); return; }
if (trimmedSearch === '') { setFormError(SEARCH_ERROR); return; }
setFormError(null);
const next: WatchConfig = { ...config, url: trimmedUrl, searchText: trimmedSearch, taskSet: 'yes' };
setConfig(next);
setLoading(true);
try {
  if (!(await ensureNotificationSetup())) { return; }
  await saveWatchConfig(next);
  await startWatch(tick);
  await performCheck(next);
} catch (error) {
  console.error('[App] start failed', error);
} finally {
  setLoading(false);
}
```

`performCheck` shrinks to:

```ts
async function performCheck(cfg: WatchConfig): Promise<void> {
  await runCheck(cfg);
  setConfig(await loadWatchConfig());
}
```

Typed persist:

```ts
const persist = <K extends keyof WatchConfig>(key: K, value: WatchConfig[K]): void => {
  saveWatchConfig({ [key]: value } as Partial<WatchConfig>).catch(error =>
    console.error(`[App] failed to persist ${key}`, error),
  );
};
```

One cast remains, at the boundary `Partial` cannot build from a computed key. Do not add a generic helper for it.

- [ ] **Step 4: Verify**

Run: `yarn test __tests__/app.test.tsx && yarn typecheck && yarn lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx __tests__/app.test.tsx
git commit -m "feat(ui): require https, validate keyword, save full config on start"
```

---

### Task 5: Surface check results and failures in the status card

**Files:**
- Modify: `src/App.tsx:213-239`, `src/Styles.ts`
- Test: `__tests__/app.test.tsx`

**Interfaces:**
- Consumes: `config.lastResult`, `config.lastError`, `config.alerting`
- Produces: status line `Last Result: Found | Not found | Check failed (HTTP 403) | Not checked yet`

- [ ] **Step 1: Write the failing test**

```ts
it('shows the stored failure reason instead of a false "checked" claim', async () => {
  mockedLoad.mockResolvedValue({
    ...DEFAULT_CONFIG,
    taskSet: 'yes',
    url: 'https://example.com',
    searchText: 'In Stock',
    lastResult: 'error',
    lastError: 'HTTP 403',
    lastChecked: String(Date.now()),
  });
  const { findByText } = render(<App />);
  expect(await findByText('Last Result: Check failed (HTTP 403)')).toBeTruthy();
});
```

- [ ] **Step 2: Run it**

Run: `yarn test __tests__/app.test.tsx -t "failure reason"`
Expected: FAIL — no such text.

- [ ] **Step 3: Implement** a `formatResult(cfg: WatchConfig): string` helper in `src/utils.ts` (pure, testable):

```ts
export const formatCheckResult = (result: WatchResult | '', error: string): string => {
  if (result === 'found') return 'Found';
  if (result === 'absent') return 'Not found';
  if (result === 'error') return `Check failed (${error || 'unknown error'})`;
  return 'Not checked yet';
};
```

Render it under the existing "Last Checked" line. Add one style, `resultText`, reusing `lastCheckedText` colours except the error case, which uses `errorText`. Do not add a new card.

- [ ] **Step 4: Verify** `yarn test __tests__/app.test.tsx` — PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(ui): show last check result and failure reason"`

---

### Task 6: Harden the preview WebView

**Files:**
- Modify: `src/App.tsx:277-288`
- Test: `__tests__/app.test.tsx`

**Interfaces:**
- Produces: `isSameOriginTarget(requestUrl: string, watchUrl: string): boolean` exported from `src/utils.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/utils.test.ts
it('allows the watch origin and blocks everything else', () => {
  expect(isSameOriginTarget('https://shop.example.com/a', 'https://shop.example.com/p')).toBe(true);
  expect(isSameOriginTarget('https://evil.example.net/a', 'https://shop.example.com/p')).toBe(false);
  expect(isSameOriginTarget('https://shop.example.com:8443/a', 'https://shop.example.com/p')).toBe(false);
  expect(isSameOriginTarget('javascript:alert(1)', 'https://shop.example.com/p')).toBe(false);
  expect(isSameOriginTarget('about:blank', 'https://shop.example.com/p')).toBe(true);
});
```

- [ ] **Step 2: Run**

Run: `yarn test __tests__/utils.test.ts`
Expected: FAIL — not defined.

- [ ] **Step 3: Implement**

```ts
export const isSameOriginTarget = (requestUrl: string, watchUrl: string): boolean => {
  if (requestUrl === 'about:blank') return true;
  try {
    const target = new URL(requestUrl);
    const base = new URL(watchUrl);
    return target.protocol === 'https:' && target.origin === base.origin;
  } catch {
    return false;
  }
};
```

WebView props become:

```tsx
<WebView
  ref={webViewRef}
  style={styles.webview}
  source={{ uri: config.url }}
  originWhitelist={['https://*']}
  onShouldStartLoadWithRequest={({ url }) => isSameOriginTarget(url, config.url)}
  setSupportMultipleWindows={false}
  allowFileAccess={false}
  allowFileAccessFromFileURLs={false}
  allowUniversalAccessFromFileURLs={false}
  mixedContentMode="never"
  javaScriptEnabled
  userAgent={config.webPlatformType === WEB_PLATFORM_DESKTOP ? USER_AGENT_DESKTOP : undefined}
/>
```

`javaScriptEnabled` stays on: several storefronts render stock state client-side, and the preview is the user's own URL. Remove `dataDetectorTypes` (iOS-only, no effect on Android) and `scalesPageToFit` (not a WebView prop; harmless but misleading).

- [ ] **Step 4: Verify** `yarn test __tests__/utils.test.ts __tests__/app.test.tsx` — PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(webview): same-origin navigation, no popups, no file access, no mixed content"`

---

### Task 7: Notification presentation

**Files:**
- Modify: `src/services/notificationService.ts`, `src/utils.ts`
- Create: `android/app/src/main/res/drawable/ic_stat_availability.xml`
- Test: `__tests__/notificationService.test.ts`

**Interfaces:**
- Produces: `hostnameOf(url: string): string` in `src/utils.ts` (falls back to the raw string when unparsable)
- Produces: notification `id: 'availability'`, `android.smallIcon: 'ic_stat_availability'`, `android.pressAction: { id: 'default' }`
- Produces: body `${searchText} was ${found ? 'found' : 'not found'}` with `android.subText = hostnameOf(url)`

- [ ] **Step 1: Write the failing tests**

```ts
it('does not print the full URL in the notification body', () => {
  const args = mockedDisplay.mock.calls[0][0];
  expect(args.body).not.toContain('https://');
  expect(args.android.subText).toBe('shop.example.com');
  expect(args.android.smallIcon).toBe('ic_stat_availability');
});
```

- [ ] **Step 2: Run** `yarn test __tests__/notificationService.test.ts` — FAIL.
- [ ] **Step 3: Implement** the props above; the vector is a white `24dp` bell-with-check path, `android:fillColor="#FFFFFFFF"`, no padding beyond 2dp.

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF"
      android:pathData="M12,22a2,2 0,0 0,2,-2h-4a2,2 0,0 0,2,2zM18,16v-5a6,6 0,1 0,-12 0v5l-2,2v1h16v-1z" />
</vector>
```

- [ ] **Step 4: Verify** the test passes and `assembleRelease` still succeeds (vector resources are R8-safe).
- [ ] **Step 5: Commit** `git commit -am "feat(notification): monochrome status icon, tap action, hostname instead of full URL"`

---

### Task 8: Remove permissions the app never uses

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Gate: merged manifest assertion

**Interfaces:**
- Produces: release manifest declares only `INTERNET`, `WAKE_LOCK`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`.

- [ ] **Step 1: Add the removal directives** (add `xmlns:tools` to the root element):

```xml
    <!-- Notify-kit declares these for features this app does not use: trigger
         notifications, foreground services, DND access. Removing them keeps the
         installed permission set to what the app actually asks the user for. -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" tools:node="remove" />
```

Also add `android:networkSecurityConfig="@xml/network_security_config"` to `<application>`.

- [ ] **Step 2: Create `network_security_config.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

- [ ] **Step 3: Build and assert**

```bash
cd android && ./gradlew assembleRelease && cd ..
grep -o 'android:name="android.permission[^"]*"' \
  android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml | sort -u
```

Expected: five permissions listed above and no others.

- [ ] **Step 4: Runtime sanity** — install the debug build, press Start, confirm the notification appears (proves removing `FOREGROUND_SERVICE` did not break `displayNotification`).
- [ ] **Step 5: Commit** `git commit -am "feat(android): drop unused alarm, foreground-service and DND permissions; pin cleartext off"`

---

### Task 9: Version identity from one file

**Files:**
- Create: `android/version.properties`
- Modify: `android/app/build.gradle:87-93, 140-170`, `android/app/src/main/AndroidManifest.xml` (no change), `package.json` (`version`)

**Interfaces:**
- Produces: `versionCode=20`, `versionName=2.0.0` read at configuration time; `-PversionCode` / `-PversionName` override both.

- [ ] **Step 1: Create the file**

```properties
versionCode=20
versionName=2.0.0
```

- [ ] **Step 2: Read it in `defaultConfig`** (before the `android {}` block):

```gradle
def versionProps = new Properties()
file("../version.properties").withInputStream { versionProps.load(it) }
def appVersionCode = (project.findProperty("versionCode") ?: versionProps.getProperty("versionCode")).toInteger()
def appVersionName = project.findProperty("versionName") ?: versionProps.getProperty("versionName")
```

then `versionCode appVersionCode` / `versionName appVersionName`.

- [ ] **Step 3: Verify** `./gradlew -q :app:properties | grep -E "^version(Code|Name)"` shows `20` / `2.0.0`, and `-PversionName=2.0.1` overrides.
- [ ] **Step 4: Commit** `git commit -am "build: single source of version truth, 2.0.0 (code 20)"`

---

### Task 10: Fail closed on missing signing key

**Files:**
- Modify: `android/app/build.gradle:94-131`, `android/build.gradle` (jsc token), `android/gradle.properties`

**Interfaces:**
- Produces: release build without `ANDROID_KEYSTORE_FILE` produces an **unsigned** APK; it never silently signs with the debug key.

- [ ] **Step 1: Replace the fallback**

```gradle
release {
    if (System.getenv('ANDROID_KEYSTORE_FILE') != null) {
        signingConfig signingConfigs.release
    }
    // No else branch on purpose: a release APK must never carry the debug key.
    // Local unsigned builds are expected to fail apksigner verification.
    minifyEnabled enableProguardInReleaseBuilds
    shrinkResources enableProguardInReleaseBuilds
    proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
}
```

- [ ] **Step 2: Delete the `jscFlavor` token** (`android/app/build.gradle:79`) and the `else` branch in `dependencies`, leaving `implementation("com.facebook.react:hermes-android")` unconditional. Hermes has been on since the revival; a `+` version in the build script is a reproducibility defect F-Droid reviewers flag.
- [ ] **Step 3: Pin local ABI set** — in `android/gradle.properties` change `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` to `armeabi-v7a,arm64-v8a,x86_64` and keep all four APK splits (emulator needs x86_64 locally; CI publishes only two).
- [ ] **Step 4: Verify**

```bash
cd android && ./gradlew clean assembleRelease && cd ..
ls android/app/build/outputs/apk/release/
$ANDROID_HOME/build-tools/36.0.0/apksigner verify android/app/build/outputs/apk/release/app-arm64-v8a-release-unsigned.apk
```

Expected: five files, all `-unsigned.apk`; `apksigner` reports "DOES NOT VERIFY" (exit non-zero). That failure is the proof.

- [ ] **Step 5: Commit** `git commit -am "build: never sign release with the debug key; pin hermes, drop jsc token"`
- [ ] **Step 6: Note the consequence in `docs/store-release.md`**: local release builds are unsigned by design; use the debug build for device testing.

---

### Task 11: CI gate rewrite

**Files:**
- Modify: `.github/workflows/ci.yml` (full rewrite), `package.json` (scripts)

**Interfaces:**
- Produces npm scripts `format`, `format:check`; job `verify` (Node checks) and job `android` (release build, no keystore).

- [ ] **Step 1: Add scripts**

```json
"format": "prettier --write .",
"format:check": "prettier --check .",
"audit": "yarn audit --groups dependencies --level high"
```

Add `"license": "Apache-2.0"` and `"version": "2.0.0"` to `package.json`.

- [ ] **Step 2: Run the formatter once, as its own commit**, so the diffs after it are readable:

```bash
yarn format && git add -A && git commit -m "style: apply prettier across the repository"
```

Then confirm `yarn format:check` exits 0.

- [ ] **Step 3: Rewrite `ci.yml`**

```yaml
name: CI

on: [push, pull_request]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>  # pin
      - uses: actions/setup-node@<sha>
        with: { node-version: '22', cache: 'yarn' }
      - run: yarn install --frozen-lockfile
      - run: yarn typecheck
      - run: yarn lint
      - run: yarn format:check
      - run: yarn test --ci
      - run: yarn audit --groups dependencies --level high || true   # advisory until Task 13 lands

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-java@<sha>
        with: { distribution: 'temurin', java-version: '17' }
      - uses: actions/setup-node@<sha>
        with: { node-version: '22', cache: 'yarn' }
      - uses: gradle/actions/setup-gradle@<sha>
        with: { cache-read-only: ${{ github.ref != 'refs/heads/master' }} }
      - run: yarn install --frozen-lockfile
      - run: chmod +x android/gradlew
      - run: cd android && ./gradlew assembleRelease --no-daemon
      - name: Assert no debug key in release output
        run: |
          APK=$(ls android/app/build/outputs/apk/release/*arm64*-unsigned.apk)
          test -n "$APK"
      - uses: actions/upload-artifact@<sha>
        with:
          name: release-unsigned
          path: android/app/build/outputs/apk/release/*.apk
          retention-days: 7
```

This job is what would have caught the `assembleRelease` breakage in August. It builds unsigned, so it needs no secrets and works on forks.

- [ ] **Step 4: Verify** the workflow runs green on a branch push before merging.
- [ ] **Step 5: Commit** `git commit -am "ci: format gate, dependency audit, and an unsigned release build on every push"`

---

### Task 12: Release workflow rewrite

**Files:**
- Modify: `.github/workflows/android-release.yml` (full rewrite), `android-debug.yml` (Gradle cache action)

**Interfaces:**
- Consumes: `android/version.properties`
- Produces: assets `notifyavailability-2.0.0-arm64-v8a.apk`, `notifyavailability-2.0.0-armeabi-v7a.apk`, `SHA256SUMS`

- [ ] **Step 1: Structure**

Two jobs, not one:

```yaml
on:
  push:
    tags: ['v*']
  workflow_dispatch:
```

`release` job: `if: startsWith(github.ref, 'refs/tags/v')` — requires keystore, asserts tag matches `versionName`, builds, signs, verifies, renames, hashes, publishes.

`latest` job: `if: github.ref == 'refs/heads/master'` — builds and publishes a **prerelease** tagged `latest`, signed if `secrets.ANDROID_KEYSTORE_BASE64` is present, skipped with a notice otherwise. Izzy's crawler ignores prereleases, so the rolling build cannot confuse the repo.

- [ ] **Step 2: Assert the tag**

```bash
VERSION=$(grep '^versionName=' android/version.properties | cut -d= -f2)
test "v${VERSION}" = "${GITHUB_REF_NAME}" || { echo "tag $GITHUB_REF_NAME does not match versionName $VERSION"; exit 1; }
```

- [ ] **Step 3: Hard-fail keystore setup**

```bash
set -euo pipefail
: "${ANDROID_KEYSTORE_BASE64:?keystore secret missing}"
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/release.keystore
keytool -list -keystore /tmp/release.keystore -storepass "$ANDROID_KEYSTORE_PASSWORD" > /dev/null
```

Export `ANDROID_KEYSTORE_FILE=/tmp/release.keystore`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` via the step env. Never write the keystore into the workspace, and add `- name: Shred keystore` with `if: always()` running `rm -f /tmp/release.keystore`.

- [ ] **Step 4: Verify the artifact before publishing**

```bash
APK=android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs "$APK" | tee /tmp/certs.txt
! grep -q "CN=Android Debug" /tmp/certs.txt
grep -q "c76bf54a39f116e0d8afd24e37df4e74b8bfc993e806b4b2c705dd8d41855023" /tmp/certs.txt
$ANDROID_HOME/build-tools/36.0.0/zipalign -c -P 16 4 "$APK"
```

The digest check is the update-path guard: `v1.0.0` and the rolling `latest` are signed with `SHA-256 c76bf54a…5023` (`CN=NotifyAvailability Release`). A different digest means the keystore was rotated, and every installed user must uninstall before updating. If rotation is ever intended, do it as a deliberate decision, not as a CI surprise.

- [ ] **Step 5: Publish**

```bash
mkdir -p artifacts
V=$VERSION
cp .../app-arm64-v8a-release.apk   "artifacts/notifyavailability-${V}-arm64-v8a.apk"
cp .../app-armeabi-v7a-release.apk "artifacts/notifyavailability-${V}-armeabi-v7a.apk"
cd artifacts && sha256sum *.apk > SHA256SUMS
```

Release body: `--notes-file CHANGELOG`-derived section or `generate_release_notes: true`; attach the two APKs plus `SHA256SUMS`. Do not attach x86/x86_64.

- [ ] **Step 6: Verify** on a throwaway tag `v2.0.0-rc1` — but the assertion compares against `versionName`, so instead dry-run with `workflow_dispatch` on a branch that has `versionName=2.0.0-rc1` temporarily. Confirm: assets named correctly, `SHA256SUMS` matches, `apksigner` output shows the release certificate, prerelease flag true.
- [ ] **Step 7: Commit** `git commit -am "ci(release): tag-driven version, fail-closed signing, verified artifacts, checksums"`

---

### Task 13: Supply chain and repo hygiene

**Files:**
- Modify: `.github/renovate.json5`, `.github/dependabot.yml` (delete if renovate covers it), `package.json`, `README.md`
- Create: `SECURITY.md`, `CHANGELOG.md`
- Delete: `package-lock.json` from the working tree (untracked, ignored; it makes `yarn install` warn)

**Interfaces:** none in code.

- [ ] **Step 1: Renovate rules** — add

```json5
{
  pinDigests: true,
  packageRules: [
    { matchManagers: ['gradle', 'gradle-wrapper'], matchPackageNames: ['com.android.tools.build:gradle', 'org.jetbrains.kotlin**', 'com.google.devtools.ksp**'], enabled: false },
    { matchUpdateTypes: ['major'], dependencyDashboardApproval: true },
    { matchPackageNames: ['react-native', '@react-native/**'], groupName: 'react-native' }
  ]
}
```

The disabled line is the AsyncStorage/KSP pin from `eb76a85`; without it every few days brings a PR that breaks the build.

- [ ] **Step 2: `SECURITY.md`** — supported version `2.x`, report via GitHub private advisory, scope: the app, its workflows, and the release signing process. One page, no template ceremony.
- [ ] **Step 3: Bump the two dependencies and re-run the full gate**

```bash
yarn add react-native-notify-kit@10.10.1 react-native-background-fetch@4.5.0
yarn typecheck && yarn lint && yarn test --ci
cd android && ./gradlew assembleRelease && cd ..
```

Expected: all green, APK sizes within ~1 MB of today (`17.0 MB` arm64). If notify-kit moved a manifest permission or broke the mocked API, fix the mock in `jest.setup.js` — do not skip the test.
- [ ] **Step 4: Delete `package-lock.json`** from the working tree. It is not tracked and `npm` is not the package manager here.
- [ ] **Step 5: Commit** `git commit -am "chore: pin renovate away from the gradle/kotlin pin, bump notify stack, add SECURITY and CHANGELOG"`
- [ ] **Step 6: Leave `improvements.md` gitignored.** It is a wishlist; adding it invites scope arguments.

---

### Task 14: Store metadata

**Files:** the ten `fastlane/metadata/android/en-US/**` files from the File Structure table.

**Interfaces:** `docs/store-release.md` documents the bump flow.

- [ ] **Step 1: `title.txt`** — `Notify Availability` (16 characters, under the 30 limit).
- [ ] **Step 2: `short_description.txt`** — `Watch a web page and get notified when text appears.` (52 characters, under 80). Verify: `tr -d '\n' < fastlane/metadata/android/en-US/short_description.txt | wc -m`.
- [ ] **Step 3: `full_description.txt`** — four short paragraphs: what it does, how a check works (background check every 15 minutes minimum, one alert on change, at most one reminder per hour), what it does not do (no account, no analytics, no network calls except the page you name), and the Android battery caveat (Doze may delay checks). No emoji, no marketing superlatives.
- [ ] **Step 4: `changelogs/20.txt`** — one line per user-visible change in 2.0.0: alerts only on change plus an hourly reminder; failed checks shown instead of a false "checked"; https-only targets.
- [ ] **Step 5: Images**

```bash
python3 - <<'PY'
from PIL import Image
src = Image.open('icon/192px.png').convert('RGBA')
out = 'fastlane/metadata/android/en-US/images'
src.resize((512, 512), Image.LANCZOS).save(f'{out}/icon.png')
fg = Image.new('RGBA', (1024, 500), '#0f172a')
icon = src.resize((420, 420), Image.LANCZOS)
fg.alpha_composite(icon, ((1024 - 420) // 2, (500 - 420) // 2))
fg.convert('RGB').save(f'{out}/featureGraphic.png')
shot = Image.open('screenshots/movie-use-case-notify-availability-full.png').convert('RGB')
shot.save(f'{out}/phoneScreenshots/1.png')
PY
```

Pillow is available in this environment (`PIL 12.3.0`); ImageMagick is not installed. Do not add an npm image dependency for three resizes.

The 512 icon is upscaled from the largest source in the repo (`192px.png`); there is no vector original. Acceptable for a listing, flagged in `docs/store-release.md` as "replace when a source asset exists".
- [ ] **Step 6: Verify dimensions**

```bash
python3 - <<'PY'
import struct,glob
for p in glob.glob('fastlane/metadata/android/en-US/images/**/*.png', recursive=True):
    d=open(p,'rb').read(33); w,h=struct.unpack('>II', d[16:24]); print(p,w,h)
PY
```

Expected: `icon.png 512 512`, `featureGraphic.png 1024 500`, screenshot `1080 1920`.
- [ ] **Step 7: Commit** `git add fastlane && git commit -m "docs(store): fastlane metadata, icon, feature graphic and screenshot"`

---

### Task 15: F-Droid recipe

**Files:** Create `metadata/com.notifyavailability.yml`.

- [ ] **Step 1: Write the recipe**

```yaml
Categories:
  - Internet
License: Apache-2.0
AuthorName: Rahul Jain
SourceCode: https://github.com/xRahul/NotifyAvailability
IssueTracker: https://github.com/xRahul/NotifyAvailability/issues
Changelog: https://github.com/xRahul/NotifyAvailability/blob/master/CHANGELOG.md

AutoName: Notify Availability

RepoType: git
Repo: https://github.com/xRahul/NotifyAvailability.git

Builds:
  - versionName: 2.0.0
    versionCode: 20
    commit: v2.0.0
    sudo:
      - apt-get update
      - apt-get install -y nodejs npm
    init:
      - npm install -g yarn@1.22.22
    prebuild:
      - sed -i -e 's/enableSeparateBuildPerCPUArchitecture = true/false/' app/build.gradle
      - yarn install --frozen-lockfile
    ndk: 27.1.12297006
    cmake: 3.22.1
    gradle:
      - yes

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
CurrentVersion: 2.0.0
CurrentVersionCode: 20
```

Node 22 is required by RN 0.87 `engines` (`^22.13 || ^24.3`); Debian's `nodejs` is 18. If the build container ships Node 18, replace the `sudo` block with the NodeSource 22 setup and re-verify — do not lower `engines`.

- [ ] **Step 2: Verify with the real container before submitting**

```bash
docker run --rm -v "$PWD:/repo" -w /repo registry.gitlab.com/fdroid/fdroidserver:buildserver \
  bash -c "fdroid build --verbose com.notifyavailability:20"
```

Run through the project's documented `makebuildserver` or the published buildserver image; the exact invocation is in `docs/store-release.md`. Expected: BUILD SUCCESS, APK produced. If KSP fails, the `prebuild` needs the same `node scripts/patch-rn-gradle.js` guarantee CI has — confirm which Kotlin/AGP versions the container's Gradle resolves before adding a patch.
- [ ] **Step 3: `fdroid lint`** the metadata file inside the same container; fix every error.
- [ ] **Step 4: Commit** `git add metadata && git commit -m "docs(fdroid): build recipe for com.notifyavailability 2.0.0"`
- [ ] **Step 5: Submission is a manual step**, documented in `docs/store-release.md`: fork `fdroiddata`, copy this file, MR against `master`, answer the reviewer with the CI build log and `apksigner` output.

---

### Task 16: Store-check workflow

**Files:** Create `.github/workflows/store-check.yml`.

- [ ] **Step 1: Write it** — `on: release: types: [published]`, `permissions: contents: read`, Node 22, three checks:
  1. fastlane files exist; `short_description.txt` ≤ 80 characters (`wc -m`); icon 512×512 and feature graphic 1024×500 (PNG header parse, no Python dependency beyond stdlib).
  2. recipe YAML parses, `CurrentVersion` equals the release tag without `v`, `License` is `Apache-2.0`, `Builds` non-empty.
  3. print a summary with the Izzy inclusion URL (`https://codeberg.org/IzzyOnDroid/repodata/issues/new`) and the fdroiddata MR URL.
- [ ] **Step 2: Verify** by publishing a draft release on a scratch tag and confirming the job's summary renders; then delete the scratch release.
- [ ] **Step 3: Commit** `git add .github/workflows/store-check.yml && git commit -m "ci(store): validate store metadata on release"`

---

### Task 17: Documentation truth pass

**Files:** Modify `README.md`; create `docs/store-release.md`.

- [ ] **Step 1: README** — Android only; requires Node 22 and JDK 17; `https://` targets only; how checks work (15-minute minimum, transition alert, hourly reminder); a "Privacy" section stating no analytics, no account, the only network traffic is the page you enter; install section with F-Droid, IzzyOnDroid and GitHub releases; Apache-2.0 for code, CC BY 4.0 for the icon with attribution from `icon/Icon License`; remove the iOS instructions.
- [ ] **Step 2: `docs/store-release.md`** — the bump flow: edit `android/version.properties`, add `changelogs/<code>.txt`, update `CHANGELOG.md`, run the local gate, commit, `git tag v2.0.0 && git push --tags`, confirm the release job, then the F-Droid container build, then the MR. Include the keystore secret names and the fact that the keystore is never committed.
- [ ] **Step 3: Verify** every command in both files runs as written — copy-paste them in a shell.
- [ ] **Step 4: Commit** `git commit -am "docs: android-only README, privacy statement, store release runbook"`

---

### Task 18: Release 2.0.0

**Files:** `android/version.properties` (already 20/2.0.0), `CHANGELOG.md`.

- [ ] **Step 1: Full local gate**

```bash
yarn typecheck && yarn lint && yarn format:check && yarn test --ci
cd android && ./gradlew clean assembleDebug assembleRelease && cd ..
grep -o 'android:name="android.permission[^"]*"' android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml | sort -u
grep -o 'usesCleartextTraffic="[a-z]*"' android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
```

Expected: green; five permissions; `usesCleartextTraffic="false"`.
- [ ] **Step 2: Device test** (debug build on a real phone, not an emulator): start a watch, confirm one notification on transition, none on the second tick, none on an offline tick, the failure reason appears in the card, and the preview blocks an off-site link.
- [ ] **Step 3: Tag and push** `git tag v2.0.0 && git push origin v2.0.0`; watch the release job; download both APKs and run `apksigner verify --print-certs` locally to confirm the release certificate, not the debug one.
- [ ] **Step 4: Open the Izzy inclusion issue** with the repo URL and the release URL.
- [ ] **Step 5: Open the fdroiddata MR** after the container build from Task 15 passes.

---

## Verification Matrix

| Gate | Command | Expected |
|---|---|---|
| Types | `yarn typecheck` | exit 0 |
| Lint | `yarn lint` | exit 0 |
| Format | `yarn format:check` | exit 0 |
| Tests | `yarn test --ci` | 9 suites, all pass |
| Deps | `yarn audit --groups dependencies --level high` | no high/critical in runtime deps |
| Release build | `cd android && ./gradlew assembleRelease` | 4 unsigned APKs |
| Permissions | grep merged release manifest | exactly 5 |
| Cleartext | grep merged release manifest | `false` |
| Signing (CI) | `apksigner verify --print-certs` | release DN, never `CN=Android Debug` |
| Alignment | `zipalign -c -P 16 4` | verified |
| Size | `ls -lh` arm64 APK | ≤ 30 MB (Izzy per-file rule) |
| Store files | `wc -m short_description.txt` | ≤ 80 |
| Recipe | `fdroid lint` + container build | no errors, APK produced |

## Risk register

| Risk | Mitigation |
|---|---|
| Removing `FOREGROUND_SERVICE` breaks a notify-kit path at runtime | Task 8 Step 4 installs and fires a notification on a device before commit |
| F-Droid container has Node 18 or resolves a different Kotlin | Task 15 Step 2 requires an actual container build; the recipe is adjusted there, not guessed |
| 512 icon upscaled from 192 looks soft | Accepted for the first listing; `docs/store-release.md` records it as replace-later |
| Hourly re-notify annoys a user watching a permanently available item | Documented in the store description; one-hour floor is a constant in one place (`NOTIFY_COOLDOWN_MS`) if it needs tuning |
| Tag/version drift | Release job fails when `v<tag>` ≠ `versionName` |
| R8 stripping the notify-kit channel or receiver classes | notify-kit ships `consumerProguardFiles`; the device test in Task 8 covers the real path |

## Explicitly not in this plan

Multi-target watchlist, notification actions/reply, check history, JSON backup, dark/light theming, localization, WorkManager rewrite of the scheduler, iOS support, a settings screen, any new dependency, any new abstraction over `fetch` or AsyncStorage. Each is a real future feature and each would double the surface a store reviewer has to audit.
