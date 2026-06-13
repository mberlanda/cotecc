# SDK 56 + Expo Router Modernization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CoteccApp from Expo SDK 49 to SDK 56 (React Native 0.85 / React 19), adopt Continuous Native Generation, migrate navigation from React Navigation v6 to Expo Router (web stays static-only), and centralize all developer commands in the README.

**Architecture:** One branch (`feat/sdk56-expo-router`), four logical commit groups: (1) dependencies & tooling, (2) CNG adoption, (3) Expo Router migration, (4) web/Docker/CI/docs. Screens use Expo Router hooks (`useRouter`, `useLocalSearchParams`); thin `app/*` route files re-export the screen components kept in `src/screens/`. Native `android/`/`ios/` dirs are deleted and regenerated on demand via `expo prebuild`.

**Tech Stack:** Expo SDK 56, React Native 0.85, React 19, Expo Router, jest-expo, @testing-library/react-native v13, ESLint flat config, Node 22.

**Working directory for all commands:** `CoteccApp/` unless stated otherwise.

**Reference:** Expo SDK 56 docs — https://docs.expo.dev/versions/v56.0.0

---

## File map

**Created**
- `CoteccApp/eslint.config.js` — flat ESLint config (replaces `.eslintrc.js`)
- `CoteccApp/app/_layout.tsx` — root Stack navigator + splash lifecycle
- `CoteccApp/app/index.tsx`, `home.tsx`, `how-to-play.tsx`, `game.tsx` — route files (re-export screens)
- `CoteccApp/src/screens/AuthScreen.test.tsx`, `HomeScreen.test.tsx`, `HowToPlayScreen.test.tsx` — new routing tests

**Modified**
- `CoteccApp/.nvmrc`, `CoteccApp/package.json`, `.github/workflows/app-build.yml`, `CoteccApp/Dockerfile` — Node 22 + entry + Docker COPY
- `CoteccApp/babel.config.js`, `CoteccApp/metro.config.js`, `CoteccApp/jest.config.js`, `CoteccApp/jest-setup.js`, `CoteccApp/tsconfig.json`
- `CoteccApp/app.json` — corrected Expo config (scheme, plugins, web output, drop unused perms)
- `CoteccApp/.gitignore` — add `android/`, `ios/`, `.expo/`
- `CoteccApp/src/screens/{AuthScreen,HomeScreen,HowToPlayScreen,GameScreen}.tsx` — hook-based navigation
- `CoteccApp/src/screens/GameScreen.test.tsx` — mock `expo-router`
- `CoteccApp/src/components/PickerModal.test.tsx` — migrate off `react-test-renderer`
- `CoteccApp/src/routes.ts` — drop `RootStackParamList`, keep param interfaces
- `CoteccApp/src/components/__snapshots__/*.snap` — regenerated
- `README.md` — centralized developer command reference
- `doc/DEVELOPMENT.md` — trimmed to OS prerequisites + pointer to README

**Deleted**
- `CoteccApp/src/App.tsx`, `CoteccApp/index.js`, `CoteccApp/index.web.js`
- `CoteccApp/__mocks__/react-native.js` (stale manual mock; jest-expo replaces it)
- `CoteccApp/android/`, `CoteccApp/ios/` (from git; regenerated via prebuild)

---

## COMMIT GROUP 1 — Dependencies & tooling

### Task 1: Bump Node to 22

**Files:** Modify `CoteccApp/.nvmrc`, `CoteccApp/package.json`, `.github/workflows/app-build.yml`, `CoteccApp/Dockerfile`

- [ ] **Step 1: Set Node version files**

`CoteccApp/.nvmrc`:
```
22
```

`CoteccApp/package.json` — change `engines`:
```json
  "engines": {
    "node": ">=22"
  },
```

`.github/workflows/app-build.yml` — in the `unit-tests` job change `node-version: '18.x'` to:
```yaml
        node-version: '22.x'
```

`CoteccApp/Dockerfile` — change `FROM node:18-alpine AS builder` to:
```dockerfile
FROM node:22-alpine AS builder
```

- [ ] **Step 2: Verify Node 22 is active**

Run: `node --version` (if not v22, run `nvm use` first).
Expected: `v22.x`

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/.nvmrc CoteccApp/package.json .github/workflows/app-build.yml CoteccApp/Dockerfile
git commit -m "chore: bump Node to 22 LTS"
```

---

### Task 2: Upgrade Expo SDK 49 → 56

**Files:** Modify `CoteccApp/package.json`, `CoteccApp/package-lock.json`

Note: with CNG and no custom native code, the documented one-shot upgrade path applies — install the target `expo` then `expo install --fix`. Incremental SDK hops are unnecessary here.

- [ ] **Step 1: Install Expo 56 and align managed deps**

Run (in `CoteccApp/`):
```bash
npm install expo@^56
npx expo install --fix
```

- [ ] **Step 2: Remove the dead web-bundler dependency**

Run: `npm uninstall @expo/webpack-config`

- [ ] **Step 3: Run expo-doctor and resolve mismatches**

Run: `npx expo-doctor`
Expected: passes. For any reported version mismatch, resolve with `npx expo install <pkg>` (never hand-pin versions Expo manages). Repeat until clean.

- [ ] **Step 4: Commit**

```bash
git add CoteccApp/package.json CoteccApp/package-lock.json
git commit -m "chore: upgrade to Expo SDK 56 (RN 0.85 / React 19)"
```

---

### Task 3: Update Babel, Metro, and TypeScript config

**Files:** Modify `CoteccApp/babel.config.js`, `CoteccApp/metro.config.js`, `CoteccApp/tsconfig.json`

- [ ] **Step 1: Replace babel preset**

`CoteccApp/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

- [ ] **Step 2: Simplify metro config**

`CoteccApp/metro.config.js`:
```js
const {getDefaultConfig} = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;
```

- [ ] **Step 3: Point tsconfig at the Expo base**

`CoteccApp/tsconfig.json`:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

- [ ] **Step 4: Verify the config files load (no full export yet)**

Run:
```bash
node -e "require('./babel.config.js')({cache(){}});require('./metro.config.js');console.log('configs OK')"
npx expo config --type public > /dev/null && echo "expo config OK"
```
Expected: `configs OK` and `expo config OK`. (A full web export is deferred to Task 16, after routing is migrated.)

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/babel.config.js CoteccApp/metro.config.js CoteccApp/tsconfig.json
git commit -m "chore: use babel-preset-expo, Expo metro + tsconfig base"
```

---

### Task 4: Migrate the test runner to jest-expo (React 19 ready)

**Files:** Modify `CoteccApp/package.json`, `CoteccApp/jest.config.js`, `CoteccApp/jest-setup.js`, `CoteccApp/src/components/PickerModal.test.tsx`; Delete `CoteccApp/__mocks__/react-native.js`; regenerate `CoteccApp/src/components/__snapshots__/*.snap`

- [ ] **Step 1: Install jest-expo, bump RNTL, remove React-19-incompatible + dead test deps**

Run:
```bash
npx expo install jest-expo
npm install --save-dev @testing-library/react-native@^13
npm uninstall react-test-renderer @types/react-test-renderer @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```
(`react-test-renderer` is removed in React 19; `@testing-library/react`/`jest-dom`/`jest-environment-jsdom` are unused.)

- [ ] **Step 2: Delete the stale manual react-native mock**

Run: `git rm CoteccApp/__mocks__/react-native.js`
(It exists only for the old `react-native` jest preset; jest-expo provides RN setup and this mock conflicts with RN 0.85.)

- [ ] **Step 3: Rewrite jest.config.js for jest-expo**

`CoteccApp/jest.config.js` (rely on jest-expo's built-in `transformIgnorePatterns`; do not override it):
```js
/** @type {import('jest').Config} */
const config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/*.{jpg,jpeg,png,gif,svg}',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
};

module.exports = config;
```

- [ ] **Step 4: Keep the RNTL matcher import**

`CoteccApp/jest-setup.js` — confirm it contains exactly:
```js
import '@testing-library/react-native/extend-expect';
```

- [ ] **Step 5: Migrate PickerModal.test.tsx off react-test-renderer**

In `CoteccApp/src/components/PickerModal.test.tsx`:
- Delete line 1 (`/** @jest-environment jsdom */`) — the test uses RNTL, not the DOM.
- Delete `import renderer from 'react-test-renderer';`.
- Delete the `jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');` line (jest-expo handles this; re-add only if a NativeEventEmitter error appears).
- Replace the final `'renders without errors'` test body:
```tsx
  it('renders without errors', () => {
    const {toJSON} = render(
      <PickerModal
        id={'foo'}
        options={options}
        title={'foobarbaz'}
        selectedValue={2}
        onValueChange={() => {}}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
```

- [ ] **Step 6: Run the suite and regenerate snapshots**

Run: `npm test -- -u`
Expected: all tests pass; snapshots under `src/components/__snapshots__/` regenerate for the React 19 / RNTL v13 renderer. Review each `.snap` diff — confirm only renderer-format changes, no missing elements.

- [ ] **Step 7: Run again without -u to confirm stability**

Run: `npm test`
Expected: PASS, 0 obsolete snapshots.

- [ ] **Step 8: Commit**

```bash
git add CoteccApp/package.json CoteccApp/package-lock.json CoteccApp/jest.config.js CoteccApp/jest-setup.js CoteccApp/src/components/PickerModal.test.tsx CoteccApp/src/components/__snapshots__
git commit -m "test: migrate to jest-expo and RNTL v13 for React 19"
```

---

### Task 5: Migrate ESLint to flat config

**Files:** Delete `CoteccApp/.eslintrc.js`; Create `CoteccApp/eslint.config.js`; Modify `CoteccApp/package.json`

- [ ] **Step 1: Install Expo-compatible ESLint + the import plugin**

Run (let Expo choose the ESLint version compatible with SDK 56):
```bash
npx expo install eslint eslint-config-expo
npm install --save-dev eslint-plugin-import
npm uninstall @react-native/eslint-config
```

- [ ] **Step 2: Create the flat config (register eslint-plugin-import explicitly)**

`CoteccApp/eslint.config.js`:
```js
const expoConfig = require('eslint-config-expo/flat');
const importPlugin = require('eslint-plugin-import');

module.exports = [
  ...expoConfig,
  {
    plugins: {import: importPlugin},
    rules: {
      'sort-imports': ['error', {ignoreCase: true, ignoreDeclarationSort: true}],
      'import/order': [
        'error',
        {
          groups: [
            ['external', 'builtin'],
            'internal',
            ['sibling', 'parent'],
            'index',
          ],
          pathGroups: [
            {pattern: '@(react|react-native)', group: 'external', position: 'before'},
            {pattern: '@src/**', group: 'internal'},
          ],
          pathGroupsExcludedImportTypes: ['internal', 'react'],
          'newlines-between': 'always',
          alphabetize: {order: 'asc', caseInsensitive: true},
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'vendor/**',
    ],
  },
];
```

- [ ] **Step 3: Delete the legacy config**

Run: `git rm CoteccApp/.eslintrc.js`

- [ ] **Step 4: Lint and auto-fix ordering**

Run: `npm run lint`
Expected: PASS. If `import/order` reports issues, run `npm run lint:fix` and review.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/eslint.config.js CoteccApp/package.json CoteccApp/package-lock.json
git commit -m "chore: migrate ESLint to flat config with eslint-config-expo"
```

---

## COMMIT GROUP 2 — Continuous Native Generation

### Task 6: Rewrite app.json and add expo-router

**Files:** Modify `CoteccApp/app.json`, `CoteccApp/package.json`

- [ ] **Step 1: Install expo-router and its peers**

Run: `npx expo install expo-router react-native-screens react-native-safe-area-context`
(`expo-linking`/`expo-constants` are pulled in transitively by expo-router.)

- [ ] **Step 2: Rewrite app.json**

`CoteccApp/app.json`:
```json
{
  "name": "CoteccApp",
  "displayName": "Cotecc",
  "expo": {
    "name": "Cotecc",
    "slug": "cotecc",
    "version": "1.0.0",
    "scheme": "coteccapp",
    "orientation": "portrait",
    "icon": "./src/assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "plugins": ["expo-router"],
    "splash": {
      "image": "./src/assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#23150F"
    },
    "android": {
      "package": "com.localcardsgames.coteccapp",
      "adaptiveIcon": {
        "foregroundImage": "./src/assets/adaptive-icon.png",
        "backgroundColor": "#23150F"
      }
    },
    "ios": {
      "bundleIdentifier": "com.localcardsgames.coteccapp",
      "supportsTablet": true
    },
    "web": {
      "bundler": "metro",
      "output": "single"
    },
    "extra": {
      "eas": {
        "projectId": "daaed10d-d90d-4d15-ac51-3df291ff8e48"
      }
    },
    "owner": "cotecc"
  }
}
```
(The `extra.eas`/`owner` block restores the EAS project config previously stashed on `eas-setup`, needed for sub-project D. The entry-point switch is deferred to Task 8.)

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/app.json CoteccApp/package.json CoteccApp/package-lock.json
git commit -m "feat: corrected Expo config — scheme, expo-router plugin, static web output"
```

---

### Task 7: Drop committed native dirs (adopt CNG)

**Files:** Modify `CoteccApp/.gitignore`; Delete `CoteccApp/android/`, `CoteccApp/ios/`

- [ ] **Step 1: Add native dirs to .gitignore**

Append to `CoteccApp/.gitignore`:
```
# Continuous Native Generation — regenerated via `expo prebuild`
/android
/ios
/.expo
```

- [ ] **Step 2: Untrack and delete native dirs**

Run:
```bash
git rm -r --cached CoteccApp/android CoteccApp/ios
rm -rf CoteccApp/android CoteccApp/ios
```

- [ ] **Step 3: Verify prebuild regenerates clean native projects**

Run: `npx expo prebuild --clean`
Then:
```bash
grep -r "PRODUCT_BUNDLE_IDENTIFIER" ios/*.xcodeproj/project.pbxproj | head -2
```
Expected: prebuild succeeds; bundle id is `com.localcardsgames.coteccapp` (not `org.reactjs.native.example.*`). Regenerated dirs remain untracked.

- [ ] **Step 4: Commit**

```bash
git add CoteccApp/.gitignore
git commit -m "chore: adopt CNG — gitignore android/ios, regenerate via prebuild"
```

---

## COMMIT GROUP 3 — Expo Router migration

### Task 8: Set the router entry, layout, and route files

**Files:** Modify `CoteccApp/package.json`; Create `CoteccApp/app/_layout.tsx`, `app/index.tsx`, `app/home.tsx`, `app/how-to-play.tsx`, `app/game.tsx`

- [ ] **Step 1: Switch the entry point to expo-router**

`CoteccApp/package.json` — add/replace the `main` field:
```json
  "main": "expo-router/entry",
```

- [ ] **Step 2: Create the root layout**

`CoteccApp/app/_layout.tsx`:
```tsx
import React, {useEffect, useState} from 'react';

import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import {theme} from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      if (!isAppReady) {
        try {
          await new Promise(r => setTimeout(r, 500));
          await SplashScreen.hideAsync();
          setIsAppReady(true);
        } catch (e) {
          console.warn(e);
        }
      }
    }
    prepare();
  }, [isAppReady]);

  return (
    <Stack
      screenOptions={{
        title: 'Cotecc',
        headerStyle: {backgroundColor: theme.colors.surface},
        headerTintColor: theme.colors.ink,
        headerTitleStyle: {fontWeight: '900'},
        contentStyle: {backgroundColor: theme.colors.background},
      }}
    />
  );
}
```

- [ ] **Step 3: Create the four route files**

`CoteccApp/app/index.tsx`:
```tsx
export {default} from '../src/screens/AuthScreen';
```
`CoteccApp/app/home.tsx`:
```tsx
export {default} from '../src/screens/HomeScreen';
```
`CoteccApp/app/how-to-play.tsx`:
```tsx
export {default} from '../src/screens/HowToPlayScreen';
```
`CoteccApp/app/game.tsx`:
```tsx
export {default} from '../src/screens/GameScreen';
```

- [ ] **Step 4: Commit** (screens still use old props; fixed in next tasks)

```bash
git add CoteccApp/package.json CoteccApp/app
git commit -m "feat: expo-router entry, root layout, and route files"
```

---

### Task 9: Migrate AuthScreen to router hooks

**Files:** Modify `CoteccApp/src/screens/AuthScreen.tsx`

- [ ] **Step 1: Replace navigation prop with useRouter**

Remove `import {NavigationProp} from '@react-navigation/native';` and the `RootStackParamList` import. Add:
```tsx
import {useRouter} from 'expo-router';
```
Change the signature from `const AuthScreen = ({navigation}: {navigation: NavigationProp<...>}) => {` to:
```tsx
const AuthScreen = () => {
  const router = useRouter();
```
Replace the guest `navigation.navigate('HomeScreen', {...})`:
```tsx
    router.push({
      pathname: '/home',
      params: {name: displayName, sessionType: 'guest', language},
    });
```
Replace the account `navigation.navigate('HomeScreen', {...})`:
```tsx
    router.push({
      pathname: '/home',
      params: {name: displayName, sessionType: mode, language},
    });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no AuthScreen errors (other screens may still error until their tasks land).

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/src/screens/AuthScreen.tsx
git commit -m "refactor: AuthScreen uses expo-router useRouter"
```

---

### Task 10: Migrate HomeScreen to router hooks

**Files:** Modify `CoteccApp/src/screens/HomeScreen.tsx`

- [ ] **Step 1: Replace props with hooks**

Remove `import {NavigationProp, RouteProp} from '@react-navigation/native';` and `import {RootStackParamList} from '../routes';`. Add:
```tsx
import {useLocalSearchParams, useRouter} from 'expo-router';

import {SessionRouteParams} from '../routes';
```
Change the signature to:
```tsx
const HomeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<SessionRouteParams>();
```
Init language from params:
```tsx
  const [language, setLanguage] = useState<Language>(
    (params.language as Language) ?? 'en',
  );
```
Replace `startGame`:
```tsx
  const startGame = () => {
    router.push({
      pathname: '/game',
      params: {
        gameSpeed,
        playerCount,
        name: params.name,
        showDebug: String(showDebug),
        maxLifeCount,
        sessionType: params.sessionType,
        language,
      },
    });
  };
```
Replace `openHowToPlay`:
```tsx
  const openHowToPlay = () => {
    router.push({
      pathname: '/how-to-play',
      params: {name: params.name, sessionType: params.sessionType, language},
    });
  };
```
Replace the title `{route.params.name}` with `{params.name}`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no HomeScreen errors.

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/src/screens/HomeScreen.tsx
git commit -m "refactor: HomeScreen uses expo-router hooks"
```

---

### Task 11: Migrate HowToPlayScreen to router hooks

**Files:** Modify `CoteccApp/src/screens/HowToPlayScreen.tsx`

- [ ] **Step 1: Replace props with hooks**

Remove `import {NavigationProp, RouteProp} from '@react-navigation/native';` and `import {RootStackParamList} from '../routes';`. Add:
```tsx
import {useLocalSearchParams, useRouter} from 'expo-router';

import {SessionRouteParams} from '../routes';
```
Change the signature to:
```tsx
const HowToPlayScreen = () => {
  const router = useRouter();
  const {language, name, sessionType} =
    useLocalSearchParams<SessionRouteParams>();
```
Replace the back button:
```tsx
      <PrimaryButton
        title={t('home')}
        onPress={() =>
          router.push({
            pathname: '/home',
            params: {name, sessionType, language},
          })
        }
      />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no HowToPlayScreen errors.

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/src/screens/HowToPlayScreen.tsx
git commit -m "refactor: HowToPlayScreen uses expo-router hooks"
```

---

### Task 12: Migrate GameScreen to hooks + coercion; update its test

**Files:** Modify `CoteccApp/src/screens/GameScreen.tsx`, `CoteccApp/src/screens/GameScreen.test.tsx`

- [ ] **Step 1: Update the test first (mock expo-router with string params)**

In `CoteccApp/src/screens/GameScreen.test.tsx`: remove the `route` object and `route={route}` prop; add the mock and render with no props:
```tsx
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    gameSpeed: '0',
    playerCount: '2',
    name: 'Mauro',
    showDebug: 'false',
    maxLifeCount: '4',
    sessionType: 'guest',
    language: 'en',
  }),
}));
```
```tsx
    const {getByText} = render(<GameScreen />);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/screens/GameScreen.test.tsx`
Expected: FAIL (GameScreen still reads `route.params`).

- [ ] **Step 3: Migrate GameScreen with coercion**

In `CoteccApp/src/screens/GameScreen.tsx`: remove `import {RouteProp} from '@react-navigation/native';`, the `RootStackParamList` import, the `GameScreenProps` interface, and the `route` prop. Add `import {useLocalSearchParams} from 'expo-router';` and `import {Language} from '../i18n';` (if not present). Replace the signature + param read:
```tsx
const GameScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const gameSpeed = Number(params.gameSpeed);
  const playerCount = Number(params.playerCount);
  const name = String(params.name);
  const showDebug = params.showDebug === 'true';
  const maxLifeCount = Number(params.maxLifeCount);
  const language = params.language as Language;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/screens/GameScreen.test.tsx`
Expected: PASS ("Mauro - 18 pts", "Bruno - 6 pts").

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/screens/GameScreen.tsx CoteccApp/src/screens/GameScreen.test.tsx
git commit -m "refactor: GameScreen reads coerced params via useLocalSearchParams"
```

---

### Task 13: Remove React Navigation scaffolding

**Files:** Delete `CoteccApp/src/App.tsx`, `CoteccApp/index.js`, `CoteccApp/index.web.js`; Modify `CoteccApp/src/routes.ts`, `CoteccApp/package.json`

- [ ] **Step 1: Trim routes.ts to plain param types**

`CoteccApp/src/routes.ts`:
```ts
import {Language} from './i18n';

export interface GameScreenRouteParams {
  gameSpeed: number;
  playerCount: number;
  name: string;
  showDebug: boolean;
  maxLifeCount: number;
  sessionType: 'guest' | 'login' | 'register';
  language: Language;
}

export interface SessionRouteParams {
  name: string;
  sessionType: 'guest' | 'login' | 'register';
  language: Language;
}
```

- [ ] **Step 2: Delete legacy entry/navigator files and uninstall React Navigation**

Run:
```bash
git rm CoteccApp/src/App.tsx CoteccApp/index.js CoteccApp/index.web.js
npm uninstall @react-navigation/native @react-navigation/stack
```

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: clean (no `@react-navigation` or `RootStackParamList` references remain).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/routes.ts CoteccApp/package.json CoteccApp/package-lock.json
git commit -m "refactor: remove React Navigation, App.tsx and legacy entry points"
```

---

### Task 14: Add routing tests for the three untested screens

**Files:** Create `CoteccApp/src/screens/AuthScreen.test.tsx`, `HomeScreen.test.tsx`, `HowToPlayScreen.test.tsx`

Note: all `getByText` strings below are the English i18n values. Before finalizing, confirm each against `src/i18n.ts` (`playerName`, `playAsGuest`, `newGameComputer`, `home`) and adjust if different.

- [ ] **Step 1: AuthScreen test**

`CoteccApp/src/screens/AuthScreen.test.tsx`:
```tsx
import React from 'react';

import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import AuthScreen from './AuthScreen';

const push = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

describe('AuthScreen', () => {
  beforeEach(() => push.mockClear());

  it('pushes to /home as guest with the entered name', () => {
    const {getByPlaceholderText, getAllByText} = render(<AuthScreen />);
    fireEvent.changeText(getByPlaceholderText('Player name'), 'Mauro');
    fireEvent.press(getAllByText('Play as guest').slice(-1)[0]);

    expect(push).toHaveBeenCalledWith({
      pathname: '/home',
      params: {name: 'Mauro', sessionType: 'guest', language: 'en'},
    });
  });

  it('does not navigate when the guest name is empty', () => {
    const {getAllByText} = render(<AuthScreen />);
    fireEvent.press(getAllByText('Play as guest').slice(-1)[0]);
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: HomeScreen test**

`CoteccApp/src/screens/HomeScreen.test.tsx`:
```tsx
import React from 'react';

import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import HomeScreen from './HomeScreen';

const push = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => ({
    name: 'Mauro',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('HomeScreen', () => {
  beforeEach(() => push.mockClear());

  it('shows the player name from params', () => {
    const {getByText} = render(<HomeScreen />);
    expect(getByText('Mauro')).toBeTruthy();
  });

  it('pushes to /game with default setup when starting a game', () => {
    const {getByText} = render(<HomeScreen />);
    fireEvent.press(getByText('New game vs computer'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/game',
      params: {
        gameSpeed: 500,
        playerCount: 4,
        name: 'Mauro',
        showDebug: 'false',
        maxLifeCount: 4,
        sessionType: 'guest',
        language: 'en',
      },
    });
  });
});
```

- [ ] **Step 3: HowToPlayScreen test**

`CoteccApp/src/screens/HowToPlayScreen.test.tsx`:
```tsx
import React from 'react';

import {describe, expect, it, jest} from '@jest/globals';
import {fireEvent, render} from '@testing-library/react-native';

import HowToPlayScreen from './HowToPlayScreen';

const push = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => ({
    name: 'Mauro',
    sessionType: 'guest',
    language: 'en',
  }),
}));

describe('HowToPlayScreen', () => {
  beforeEach(() => push.mockClear());

  it('pushes back to /home preserving session params', () => {
    const {getByText} = render(<HowToPlayScreen />);
    fireEvent.press(getByText('Home'));

    expect(push).toHaveBeenCalledWith({
      pathname: '/home',
      params: {name: 'Mauro', sessionType: 'guest', language: 'en'},
    });
  });
});
```

- [ ] **Step 4: Run the suite**

Run: `npm test`
Expected: PASS; the three screens now show statements > 0 in the coverage report.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/screens/AuthScreen.test.tsx CoteccApp/src/screens/HomeScreen.test.tsx CoteccApp/src/screens/HowToPlayScreen.test.tsx
git commit -m "test: cover Auth/Home/HowToPlay routing behavior"
```

---

## COMMIT GROUP 4 — Web / Docker / CI / docs

### Task 15: Update the web Dockerfile for Expo Router

**Files:** Modify `CoteccApp/Dockerfile`

- [ ] **Step 1: Copy the app/ router dir, drop index.js entries**

Replace:
```dockerfile
COPY app.json babel.config.js index.js index.web.js metro.config.js tsconfig.json ./
```
with:
```dockerfile
COPY app.json babel.config.js metro.config.js tsconfig.json ./
COPY app ./app
```
(Keep `COPY src ./src` and the existing `COPY package.json package-lock.json ./`. The entry comes from `package.json` `main` + node_modules.)

- [ ] **Step 2: Verify the static web export**

Run (in `CoteccApp/`): `npx expo export --platform web --output-dir dist`
Then: `test -f dist/index.html && echo "index.html present"`
Expected: success; `index.html present`.

- [ ] **Step 3: Commit**

```bash
git add CoteccApp/Dockerfile
git commit -m "build: copy app/ router dir into web image, drop index.js entries"
```

---

### Task 16: Full verification + coverage ratchet

**Files:** Modify `CoteccApp/jest.config.js`

- [ ] **Step 1: Lint, type-check, test**

Run (in `CoteccApp/`): `npm run lint && npx tsc --noEmit && npm test`
Expected: all PASS. Note the global coverage % from the `text` reporter summary.

- [ ] **Step 2: Add a coverage threshold at the achieved level**

Add to `CoteccApp/jest.config.js` `config` object a `coverageThreshold` set to a few points below the measured global numbers from Step 1 (so it guards against regressions without being brittle). Example shape — replace each number with `floor(measured) - 2`:
```js
  coverageThreshold: {
    global: {
      statements: <measured statements - 2>,
      branches: <measured branches - 2>,
      functions: <measured functions - 2>,
      lines: <measured lines - 2>,
    },
  },
```

- [ ] **Step 3: Re-run tests to confirm the threshold passes**

Run: `npm test`
Expected: PASS, no coverage-threshold failure.

- [ ] **Step 4: Web export**

Run: `npx expo export --platform web --output-dir dist`
Expected: success, `dist/index.html` present.

- [ ] **Step 5: Prebuild both platforms (CNG validation)**

Run: `npx expo prebuild --clean`
Expected: success for ios + android; bundle id `com.localcardsgames.coteccapp`.

- [ ] **Step 6: Docker web image + render smoke test**

Run (repo root):
```bash
docker compose build cotecc-web
docker compose up -d cotecc-web
curl --fail --retry 10 --retry-delay 2 --retry-connrefused http://localhost:8080/health
(cd tools/screenshots && npm ci && npx playwright install --with-deps chromium && npm run assert:web-render)
docker compose down --volumes
```
Expected: health ok; render smoke test passes (UI text "Versus computer"/"Current trick").

- [ ] **Step 7: Commit**

```bash
git add CoteccApp/jest.config.js
git commit -m "test: ratchet coverage threshold to measured baseline"
```

---

### Task 17: Centralize developer commands in the README

**Files:** Modify `README.md`, `doc/DEVELOPMENT.md`

- [ ] **Step 1: Add a Development section to the root README**

Append to `README.md` a `## Development` section that is the single source of truth for commands. It MUST include, with fenced code blocks:
- Prerequisites pointer: Node 22 (`.nvmrc`), and a link to `doc/DEVELOPMENT.md` for OS-level native toolchain setup.
- Install: `cd CoteccApp && npm install`
- Run web (dev): `npm run web -- --port 8090`
- Run iOS / Android (dev): `npm run ios`, `npm run android`
- Lint / test: `npm run lint`, `npm test`
- Static web export: `npx expo export --platform web --output-dir dist`
- Regenerate native projects (CNG): `npx expo prebuild --clean`
- Docker web image (repo root): `docker compose build cotecc-web && docker compose up -d cotecc-web` (served at http://localhost:8080)
- Screenshots: `cd tools/screenshots && npm install && npx playwright install chromium && npm run capture`
- EAS (sub-project D, reference): builds run via EAS for project `cotecc` / id `daaed10d-d90d-4d15-ac51-3df291ff8e48`.
- A "Tech stack & docs" line linking **Expo SDK 56 docs: https://docs.expo.dev/versions/v56.0.0**.

- [ ] **Step 2: Trim doc/DEVELOPMENT.md to prerequisites + pointer**

Keep the OS-level dependency/toolchain setup (brew, watchman, openjdk, Xcode, Android Studio) in `doc/DEVELOPMENT.md`, and replace the scattered run/build command sections with a single line: `> For build/run/test/export commands, see the **Development** section in the root [README](../README.md).`

- [ ] **Step 3: Commit**

```bash
git add README.md doc/DEVELOPMENT.md
git commit -m "docs: centralize developer commands in README; link Expo SDK 56 docs"
```

---

## Self-review notes

- **Spec coverage:** Node 22 (T1); Expo 56 one-shot + remove webpack-config (T2); babel/metro/tsconfig (T3); jest-expo + RNTL v13 + PickerModal react-test-renderer migration + dead-dep removal + snapshots (T4); ESLint flat with import plugin registered (T5); app.json rewrite + scheme/plugins/output + drop perms + expo-router install (T6); gitignore native + prebuild (T7); router entry + layout + routes (T8); screen hook migration + coercion (T9–T12); remove React Navigation/App.tsx/entries (T13); high-coverage screen tests (T14); Dockerfile (T15); full verification + coverage ratchet + prebuild + docker smoke (T16); centralized README + Expo v56 link (T17).
- **Corrections applied after adversarial review:** deleted stale `__mocks__/react-native.js`; migrated `PickerModal.test.tsx` off `react-test-renderer`; removed unused web-test deps (`@testing-library/react`, `jest-dom`, `jsdom`); dropped the hand-written `transformIgnorePatterns` in favor of jest-expo's; registered `eslint-plugin-import` in the flat config; let Expo pick the ESLint version; updated `tsconfig.json` to `expo/tsconfig.base`; moved the `main: expo-router/entry` switch from the CNG group to the router group; trimmed over-installed packages.
- **Known fix-forward points** (inherent to a 7-major upgrade, not placeholders): `expo install --fix`/`expo-doctor` transitive pins (T2); RNTL matcher import path (T4); snapshot diffs need eyeballing (T4); exact English i18n strings for new tests (T14 note); `useLocalSearchParams<T>` generic may need to drop to untyped + casts if TS complains (T10/T11).
- **Param-type note:** `router.push` params pass numbers as-is (serialized to URL strings) and GameScreen coerces them back; `showDebug` is stringified in HomeScreen and compared `=== 'true'` in GameScreen, and the HomeScreen test asserts the stringified form (T14).
