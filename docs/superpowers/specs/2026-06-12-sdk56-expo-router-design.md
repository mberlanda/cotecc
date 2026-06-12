# Modernize CoteccApp to Expo SDK 56 + Expo Router — Design

**Date:** 2026-06-12
**Sub-project:** BC (combined B + C of the A→B→C→D structural review)
**Branch:** `feat/sdk56-expo-router`

## Context

`CoteccApp` is ~7 Expo SDK majors behind (SDK 49 → latest stable **56**), on
React Native 0.72.6, React 18.2, ESLint 8, Node 18 (EOL). It is a fully local,
offline card game with AI opponents; no backend, no network calls.

Two earlier decisions shape this work:

- **Adopt CNG / prebuild.** The native `android/`+`ios/` dirs contain *no custom
  native code* — they are stock Expo bare-template output (verified: default
  `MainActivity.kt`/`MainApplication.kt` with empty manual-package list, default
  `EXAppDelegateWrapper`, autolinked deps only). They have, however, *drifted*
  from `app.json`: the iOS `PRODUCT_BUNDLE_IDENTIFIER` is still the default
  `org.reactjs.native.example.*` (≠ declared `com.localcardsgames.coteccapp`),
  there is a leftover URL scheme `com.localcards.coteccapp`, and unused
  permissions are declared (iOS `NSLocationWhenInUseUsageDescription`, Android
  `READ/WRITE_EXTERNAL_STORAGE`). Regenerating from a corrected `app.json` fixes
  all of this.
- **Merge B (upgrade) and C (router migration).** The app uses React Navigation
  v6, which C deletes in favor of Expo Router. Upgrading React Navigation to v7
  in B would be throwaway work, so the upgrade and the router migration are done
  together in one effort.

**Constraint:** the web target must remain **static-only** (no server / DB)
while the game is offline. Expo Router supports static web output; server mode
is only needed for API Routes, which are out of scope.

## Target versions

| Package | From | To |
| --- | --- | --- |
| Expo SDK | 49 | **56** (`latest`) |
| React Native | 0.72.6 | 0.86 (via `expo install`) |
| React / react-dom | 18.2 | 19.x |
| Node | 18 | **22 LTS** |
| ESLint | 8 | 10 (flat config) |

Exact transitive versions are resolved by `npx expo install --fix`, not pinned
by hand.

## Sequencing — one branch, four staged commits

Branch `feat/sdk56-expo-router` off `main`. Commits are individually reviewable;
intermediate commits may have known-broken navigation, but the app must build
and all tests must pass by the final commit.

1. **Tooling & dependency bump**
2. **CNG adoption** (corrected `app.json`, gitignore native dirs)
3. **Expo Router migration**
4. **Web / Docker / CI wiring**

### Commit 1 — Dependencies & tooling

- `.nvmrc` 18 → 22; `package.json` `engines.node` `>=18` → `>=22`.
- `expo` `^49` → `^56`; then `npx expo install --fix` to align RN, react,
  react-dom, react-native-web, react-native-screens,
  react-native-safe-area-context, react-native-gesture-handler,
  expo-splash-screen.
- **Remove `@expo/webpack-config`** (web already uses Metro; dead dependency).
- **Babel**: `babel.config.js` preset `module:@react-native/babel-preset` →
  `babel-preset-expo` (required by expo-router).
- **Metro**: simplify `metro.config.js` to Expo's `getDefaultConfig(__dirname)`
  only; drop the `@react-native/metro-config` merge.
- **Jest**: `jest.config.js` preset `react-native` → `jest-expo`; drop the
  `@react-navigation` entry from `transformIgnorePatterns`.
- **Testing libs**: remove `react-test-renderer` (removed in React 19); bump
  `@testing-library/react-native` to v13. Component snapshots under
  `src/components/__snapshots__/` are regenerated (`jest -u`).
- **ESLint** 8 → 10: replace `.eslintrc.js` with flat `eslint.config.js` based on
  `eslint-config-expo`, preserving the custom `import/order` and `sort-imports`
  rules and the existing ignore patterns.

### Commit 2 — CNG adoption

- Rewrite `app.json` to a correct, minimal Expo config:
  - Add top-level `version`, `scheme: "coteccapp"`, `plugins: ["expo-router"]`.
  - `web: { "bundler": "metro", "output": "single" }` (SPA, fully static; nginx
    already serves SPA fallback so no nginx change).
  - Keep existing `icon`, `splash`, `android.package`,
    `android.adaptiveIcon`, `ios.bundleIdentifier`.
  - Do **not** declare the location or external-storage permissions (omission =
    they won't be generated). Android `INTERNET` is added by default.
- Delete `android/` and `ios/` from git; add both to `.gitignore`. Native
  projects are regenerated on demand via `expo prebuild` (used by EAS in D and
  for local device runs).

### Commit 3 — Expo Router migration

- New `app/` directory:
  - `app/_layout.tsx` — root `Stack` with the theme-based `screenOptions` and the
    splash-screen `preventAutoHideAsync`/`hideAsync` lifecycle lifted from
    `src/App.tsx`.
  - `app/index.tsx` → Auth (route `/`), `app/home.tsx`, `app/how-to-play.tsx`,
    `app/game.tsx`. Each re-exports the corresponding component in
    `src/screens/` (keeps test paths and snapshots stable).
- Screens migrate from `navigation`/`route` props to **`useRouter()`** +
  **`useLocalSearchParams()`**:
  - Navigation calls (`navigation.navigate('HomeScreen', params)` in
    `AuthScreen`, `HomeScreen`, `HowToPlayScreen`) become
    `router.push({ pathname, params })`.
  - **Param coercion** (key risk): `useLocalSearchParams` returns strings.
    `game.tsx`/`GameScreen` coerces `gameSpeed`, `playerCount`, `maxLifeCount`
    with `Number(...)` and `showDebug` with `=== 'true'`. The
    `GameScreenRouteParams` / `SessionRouteParams` interfaces in `src/routes.ts`
    are kept as coercion-target types; `RootStackParamList` is removed.
- Delete `src/App.tsx`, `index.js`, `index.web.js`. Set `package.json`
  `"main": "expo-router/entry"`.
- Remove `@react-navigation/native` and `@react-navigation/stack`.
- Update `src/screens/GameScreen.test.tsx` (the only nav-coupled test) to mock
  `expo-router` instead of `@react-navigation`.

### Commit 4 — Web / Docker / CI

- **`CoteccApp/Dockerfile`**: in the builder `COPY` step, drop `index.js`
  `index.web.js`, add `COPY app ./app`. `npx expo export --platform web` now
  emits the Expo Router SPA. Base image `node:18-alpine` → `node:22-alpine`.
  nginx.conf unchanged.
- **`.github/workflows/app-build.yml`**: bump `setup-node` `node-version` to 22
  in the `unit-tests` job.

## Verification

- `npm run lint` passes with the flat config.
- `npm test` passes (after snapshot regeneration and the `GameScreen.test.tsx`
  update).
- `npx expo export --platform web` produces a static web bundle.
- `npx expo prebuild` succeeds for both iOS and Android (validates CNG; confirms
  the corrected `app.json` regenerates clean native projects).
- `docker compose build cotecc-web` builds and the Playwright render smoke test
  (`tools/screenshots`) still passes — UI text ("Versus computer",
  "Current trick") is unchanged.
- Full native device/store builds are **deferred to sub-project D (EAS Build)**.

## Risks

- **React 19 + RN testing-library v13** change the renderer → component snapshot
  churn. Expected; resolved with `jest -u` and review of the diffs.
- **ESLint flat-config migration** with the custom `import/order` rules may need
  iteration to reproduce current behavior.
- **`expo install --fix` across 7 SDK majors** may surface incompatible
  transitive pins requiring manual resolution.
- **Param coercion** is the highest-value correctness risk: every `game.tsx`
  numeric/boolean param must be coerced, or GameScreen receives strings.

## Out of scope

- EAS Build CI and signed/store artifacts (sub-project D).
- Any backend / API Routes / server-mode web output.
- Gameplay, UI, or i18n changes beyond what the router migration requires.
