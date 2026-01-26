# LLM Memory - Project Context

## Project Overview
*   **Name:** `notify-availability`
*   **Type:** React Native Application
*   **Platform:** Android (Primary focus for this CI/CD setup)

## Architecture & Technology Stack
*   **React Native Version:** 0.61.2
*   **Node.js Requirement:** v16 (Compatible with RN 0.61)
*   **Build System:** Gradle 5.5
*   **Android Gradle Plugin:** 3.4.2
*   **Java Requirement:** Java 11 (Temurin) is used in CI to support Gradle 5.5.

## Key Directories
*   `src/`: React Native source code (Components, Services).
*   `android/`: Android native project files.
*   `.github/workflows/`: CI/CD definitions.
*   `docs/`: Project documentation (PRD, TD, Memory).

## Key Commands
*   **Install Dependencies:** `yarn install --frozen-lockfile`
*   **Lint:** `yarn lint`
*   **Test:** `yarn test`
*   **Build Debug APK:** `cd android && ./gradlew assembleDebug`
*   **Build Release APK:** `cd android && ./gradlew assembleRelease` (Requires signing configuration)

## CI/CD Strategy
*   **Provider:** GitHub Actions.
*   **Workflows:**
    *   `ci.yml`: Standard checks (Lint, Test, Build Debug).
    *   `manual_debug.yml`: Ad-hoc debug builds.
    *   `release.yml`: Production builds with signing and auto-versioning.
*   **Secrets:** Keystore is stored as `KEY_STORE_BASE64` and decoded at runtime.

## Known Constraints
*   **Legacy Gradle:** The project uses Gradle 5.5, which is sensitive to newer Java versions. Java 11 is the chosen runtime for CI.
*   **Signing:** Release signing is handled via Gradle properties injected from GitHub Secrets.
