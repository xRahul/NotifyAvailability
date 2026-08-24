# NotifyAvailability Revitalization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Same features, rebuilt on React Native latest (≈0.85.x, New Architecture) + TypeScript, dead libraries replaced, bugs fixed, modern CI/CD, rewritten docs.

**Architecture:** Bare-RN upgrade via fresh template regeneration (0.61→0.85 is beyond upgrade-helper range). JS side decomposed into typed layers: `storage` (persistence), `services` (scheduler / checker / notifier), `components` (dumb memoized views), `App.tsx` (composition). Background work moves from an unreliable in-JS timer to WorkManager-backed periodic fetch (≥15 min, survives Doze/app-kill — strictly better, same user-visible cadence).

**Tech Stack:** RN ~0.85.x · TypeScript strict · Node 22 LTS · JDK 17 · Yarn 1 · `@react-native-async-storage/async-storage` · `react-native-webview` latest · `@react-native-picker/picker` latest · `react-native-background-fetch` (replaces archived-in-effect `react-native-background-timer`) · `react-native-notify-kit` (replaces archived Jan-2025 `react-native-push-notification`; Notifee-compatible API) · Jest + `@testing-library/react-native`.

## Global Constraints

- **Feature parity contract (immutable):**
  1. Input URL + search text; persisted across restarts
  2. Start/Stop periodic check, ~15-min cadence; auto-resume on relaunch if previously started
  3. Local notification when text **found** (default) or when **absent** (toggle)
  4. Case-sensitive toggle
  5. Webpage type Mobile/Desktop/Tablet; Desktop sends desktop User-Agent on fetch + WebView (Tablet/Mobile behave identically — preserved quirk, documented)
  6. "Last Checked: <relative>|Never" display
  7. In-app WebView preview of URL while checking is active
  8. Loading indicator during initial check
- **Persisted storage keys unchanged** (`url`, `searchText`, `taskSet`, `webPlatformType`, `lastChecked`, `caseSensitiveSearch`, `searchAbsence`; `'yes'/'no'` values) — zero-migration compat for existing installs.
- Package `com.notifyavailability`, app name `NotifyAvailability`, versionCode ≥10.
- Pin exact versions at execution time from npm registry; record in final report. No new deps beyond those listed. No UI library.
- Every task exits green: `lint && typecheck && test`.

## Known Bugs Fixed Along the Way

| # | Bug | Fix |
|---|-----|-----|
| B1 | `checkUrlForText` secretly stops the background timer when url/text empty | Checker becomes pure → returns outcome; scheduling lives only in scheduler |
| B2 | `lastChecked` written from two places (race/inconsistency) | Single writer: check service |
| B3 | `refreshWebView` clears URL + `setTimeout(50)` hack | `WebView.ref.reload()` |
| B4 | Empty-config background run hits checker, kills timer | Guarded at scheduler entry |
| B5 | No Android 13+ `POST_NOTIFICATIONS` runtime permission → notifications silently dead on modern Android | `notifee.requestPermission()` before start |
| B6 | Hardcoded WebView height 1500px | Flex layout |
| B7 | Accepts garbage URLs → fetch errors loop | Validate http(s) URL before enabling Start |

---

### Phase A — Foundation

### Task 0: Baseline capture

Branch `revitalize`. Attempt `yarn install` + `jest` on untouched tree; record pass/fail (old toolchain may not survive Node 22 — either way is fine, suite is replaced in Task 2). This plan file IS the baseline record of the feature contract above.

### Task 1: Prune dead infrastructure

Delete `.travis.yml`, `.buckconfig`, `.flowconfig`, `.watchmanconfig`, `android/sonar-project.properties`. Keep `renovate.json`.
- Verify: no references remain to deleted files (`grep -ri travis\|buck\|sonar .github/ package.json` → none).
- Commit `chore: remove dead 2019-era infra`.

### Task 2: Fresh RN-latest TypeScript scaffold

Generate `npx @react-native-community/cli@latest init TempApp --skip-install --pm yarn` in `/tmp/opencode`; port into repo root:
- `package.json` (name `notify-availability`, scripts: `start/android/ios/test/lint/typecheck`), deps: `react`, `react-native`, `@react-native-async-storage/async-storage`, `react-native-webview`, `@react-native-picker/picker`, `react-native-background-fetch`, `react-native-notify-kit`; dev: `typescript`, `jest`, `@react-native/babel-preset`, `@react-native/eslint-config`, `@react-native/metro-config`, `@react-native/typescript-config`, `prettier`, `@testing-library/react-native`, `babel-jest`. Pin exact versions resolved by npm at execution time.
- `tsconfig.json` (extends `@react-native/typescript-config`, strict), `babel.config.js`, `metro.config.js`, `jest.config.js` (preset `react-native`), eslint config, `.prettierrc.js`, `.gitignore`.
- Placeholder `index.ts` registering App stub + trivial test so gates run.
- Delete old root configs replaced by template ones and old `__tests__/` contents (baseline preserved on branch history).
- Verify: `yarn install && yarn typecheck && yarn lint && yarn jest` all green on hello-world.
- Commit.

### Task 3: Port native Android + fresh iOS stub

From template `android/`: restore `applicationId com.notifyavailability`, `versionCode 10`, `versionName 1.0.0`, `res/values/strings.xml` app_name `NotifyAvailability`, copy all `mipmap-*` icons from old repo dirs into new res, manifest permissions `INTERNET, WAKE_LOCK, VIBRATE, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS` (drop `SYSTEM_ALERT_WINDOW`), `allowBackup=false`. Kotlin `MainActivity.kt`/`MainApplication.kt` from template (autolinking). Replace `ios/` with template stub minus tvOS targets.
- Verify: `./gradlew assembleDebug` if local SDK present, else validate wrapper/settings files and defer build proof to CI (Task 12); always verify `npx react-native bundle --platform android --dev false --entry-file index.js` succeeds.
- Commit.

### Phase B — Application code (each task: failing tests first, then impl)

### Task 4: Domain primitives

- Create `src/types.ts`: `type YesNo = 'yes' | 'no'`; `type WebPlatformType = 'mobile' | 'desktop' | 'tablet'`; `interface WatchConfig { url: string; searchText: string; taskSet: YesNo; webPlatformType: WebPlatformType; lastChecked: string; caseSensitiveSearch: YesNo; searchAbsence: YesNo }`; `DEFAULT_CONFIG` constant matching legacy defaults (`url:''`, `searchText:''`, `taskSet:'no'`, `webPlatformType:'mobile'`, `lastChecked:'0'`, `caseSensitiveSearch:'yes'`, `searchAbsence:'no'`); `type CheckOutcome = { textFound: boolean; notified: boolean }`.
- Create `src/constants.ts`: existing UA/platform constants verbatim.
- Create `src/utils.ts`: `escapeRegExp` (verbatim) + `formatRelativeTime(ts: string): string` via `Intl.RelativeTimeFormat('en', {numeric:'auto'})` returning `'Never'` for `'0'`/invalid.
- Tests first (failing), then impl: regex escaping table, relative time boundaries.
- Verify gates green. Commit.

### Task 5: Storage layer

- Create `src/storage/configStorage.ts`: `loadWatchConfig(): Promise<WatchConfig>` (multiGet legacy keys, null-safe merge onto DEFAULT_CONFIG), `saveWatchConfig(patch: Partial<WatchConfig>): Promise<void>` (multiSet, string values exactly as today).
- Tests with mocked `@react-native-async-storage/async-storage`: defaults when empty, legacy values honored, round-trip patch.
- Verify gates green. Commit.

### Task 6: Notification service

- Create `src/services/notificationService.ts`: `ensureNotificationSetup(): Promise<boolean>` → `notifee.requestPermission()` + `notifee.createChannel({id:'availability', name:'Availability Alerts', importance: HIGH})`; `showAvailabilityNotification(searchText: string, url: string, found: boolean)` → `displayNotification` body exactly `${searchText} was ${found ? 'found' : 'not found'} on ${url}`, `android:{channelId:'availability'}`.
- Tests with mocked `react-native-notify-kit`.
- Verify gates green. Commit.

### Task 7: Check service (pure)

- Create `src/services/checkService.ts`: `runCheck(cfg: WatchConfig): Promise<CheckOutcome>`:
  - Guards empty url/searchText → `{textFound:false, notified:false}` without fetching (B1/B4).
  - Headers with desktop UA only when `webPlatformType==='desktop'`.
  - `fetch(url,{headers})` → `response.text()`.
  - Case-sensitive: `html.includes(searchText)`; insensitive: `new RegExp(escapeRegExp(searchText),'i').test(html)`.
  - Absence inversion decides notification via Task 6 service; body strings per contract.
  - Writes `lastChecked = Date.now().toString()` on success — single writer (B2).
  - Network error → caught, returns `{textFound:false, notified:false}`.
  - No scheduler imports (B1).
- Table-driven tests (mocked fetch/notifier/storage): found/not-found × absence × case-sensitivity, desktop UA header assertion, no-notification-on-network-error, lastChecked persisted.
- Verify gates green. Commit.

### Task 8: Scheduler

- Create `src/services/watchScheduler.ts` wrapping `react-native-background-fetch`:
  - `startWatch(onTick: () => Promise<void>): Promise<void>` → `BackgroundFetch.configure({minimumFetchInterval:15, stopOnTerminate:false, startOnBoot:true, enableHeadless:true}, async taskId => { const cfg = await loadWatchConfig(); if (cfg.taskSet !== 'yes' || cfg.url === '' || cfg.searchText === '') { BackgroundFetch.finish(taskId); return; } await onTick(); BackgroundFetch.finish(taskId); }, err => console.error('[watchScheduler]', err))` then `BackgroundFetch.start()`.
  - `stopWatch(): Promise<void>` → `BackgroundFetch.stop()`.
  - `resumeWatchIfNeeded(onTick)`: load config, start if `taskSet === 'yes'` else stop (idempotent).
- `index.ts`: register headless task variant running the same tick pipeline (load config → guard → `runCheck`) so checks survive process death.
- Tests: mocked module asserts configure/start/stop args + guarded-tick behavior (B4).
- Verify gates green. Commit.

### Task 9: Component ports

Convert to TSX preserving exact props/behavior:
- `src/components/UrlInput.tsx` (autoCorrect=false, keyboardType url, persist onEndEditing only, onSubmitEditing forwarded).
- `src/components/SearchInput.tsx` (forwardRef + memo).
- `src/components/SettingsSwitch.tsx` (memo + arePropsEqual comparator).
- `src/components/PlatformPicker.tsx` → import Picker from `@react-native-picker/picker`.
- Add `accessibilityLabel` to inputs/switches.
- RTL tests: persist fires on endEditing not onChangeText; switch toggles callback; picker emits selected values.
- Verify gates green. Commit.

### Task 10: App assembly

- Rewrite `src/App.tsx`:
  - `useState<WatchConfig>(DEFAULT_CONFIG)`; mount effect `resumeWatchIfNeeded(tick)` where tick loads stored config, `runCheck(cfg)`, then updates `lastChecked` in state.
  - `handleStart`: trim URL, validate http(s) (B7, inline error Text otherwise) → `ensureNotificationSetup()` gate → save config + `taskSet:'yes'` → `startWatch(tick)` → immediate `runCheck` → update lastChecked state.
  - `handleStop`: `stopWatch()` + persist `taskSet:'no'`.
  - `refreshWebView` via `webViewRef.current?.reload()` (B3).
  - Layout: SafeAreaView, flex-grown WebView (B6), Start disabled while loading (contract #8), "Last Checked" via `formatRelativeTime`.
- Integration tests (RTL): start flow persists+starts+checks; stop flow; resume-on-mount; invalid URL shows error.
- Verify gates green. Commit.

### Phase C — Quality gates

### Task 11: Security hardening pass

Audit + fix: cleartext traffic disabled (assert no `usesCleartextTraffic=true`), no secrets committed, ProGuard/R8 keep-rules for background-fetch/notify-kit if template lacks them, `allowBackup=false`, `yarn audit` triage recorded. Deliverable: findings list + applied fixes in report file. Commit fixes.

### Task 12: CI/CD modernization

Rewrite `.github/workflows/ci.yml` (push/PR → jobs: `lint`, `typecheck`, `test` [jest --ci]; Node 22, actions v4, yarn cache). `android-debug.yml`/`android-release.yml`: JDK 17 temurin, `setup-java@v4`, `upload-artifact@v4`, gradle cache; release also on tag `v*`.
- Verify: actionlint or yamllint clean.
- Commit.

### Task 13: Docs

README rewrite: kill Travis/SonarCloud badge wall (keep license/release badges as placeholders), Overview, Features (= contract), Tech Stack (updated), Requirements (Node 22, JDK 17, Android SDK), Setup/run/test/build commands, Architecture map of `src/`, Known quirks (Tablet≡Mobile UA; background cadence OS-controlled ≥15 min; notification permission prompt), Screenshots kept. Update `renovate.json` if stale. Commit.

### Task 14: Final QA gate

Run full matrix: `yarn lint && yarn typecheck && yarn test` + android bundle smoke (+ `assembleDebug` where SDK available). Walk the 8-point feature contract against tests/code, produce verdict table in report file. Fix-forward any red. Final commit.
