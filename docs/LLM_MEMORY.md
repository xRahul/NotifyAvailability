# LLM Memory

## Project Overview
*   **Name:** notify-availability
*   **Type:** React Native (Android)
*   **RN Version:** 0.61.2
*   **Build System:** Gradle (Android)
*   **Gradle Plugin:** 3.5.4
*   **Gradle Wrapper:** 5.6.4

## Key Locations
*   **Root:** Project root (contains `package.json`, `.github/`).
*   **Android Root:** `android/` (contains `build.gradle`, `gradlew`).
*   **Source Code:** `src/`.
*   **Tests:** `__tests__/` (Jest).

## Key Commands
*   **Install Dependencies:** `yarn install`
*   **Lint:** `npm run lint` (ESLint)
*   **Test:** `npm test` (Jest)
*   **Build Debug APK:** `cd android && ./gradlew assembleDebug`
*   **Build Release APK:** `cd android && ./gradlew assembleRelease`

## Architectural Decisions
*   **CI/CD:** GitHub Actions.
*   **Java Version:** Java 11 is used for the build environment to ensure compatibility with Gradle 5.5 and React Native 0.61, while remaining reasonably modern.
*   **Signing:** Keystore is stored as a Base64 secret and decoded at runtime.
*   **Versioning:** Automated semantic versioning (Patch increment) based on git tags.
*   **Gradle Caching:** Using `gradle/actions/setup-gradle` for performance.
