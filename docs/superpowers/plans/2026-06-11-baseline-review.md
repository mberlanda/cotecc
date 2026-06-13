# Cotecc Baseline Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a healthy baseline for the cotecc monorepo: all tests passing, security issues addressed, redundant code/deps removed, a deterministic point-avoiding AI player, and a local screenshot collection for the upcoming responsive redesign.

**Architecture:** The monorepo has three packages: `CoteccApp` (React Native 0.72 + Expo 49 — the real game), `cotecc-api` (Express skeleton with `/health`), and `cotecc-web` (untouched CRA skeleton, no game code). Work is split into 5 independent PRs: (1) API hardening, (2) CoteccApp dependency cleanup, (3) AI player strategy, (4) web target + screenshot tooling (stacked on PR2), (5) remove redundant cotecc-web + baseline report.

**Tech Stack:** TypeScript, Jest, Express 4, React Native / react-native-web, Expo CLI, Playwright (screenshot tooling only).

**Baseline state (measured 2026-06-11):**
- CoteccApp: 100 tests pass, 79.9% stmt coverage (screens 0%), lint clean, 77 npm vulns (3 critical — old Expo 49 / RN 0.72 transitive deps)
- cotecc-api: 7 tests pass, 100% coverage, 8 vulns (express 4.18 chain); Docker healthcheck probes `/` which 404s
- cotecc-web: 11 tests pass, but contains zero app code (CRA boilerplate), 64 vulns (CRA dev-deps)
- Unused CoteccApp deps: `@react-native-community/masked-view` (deprecated), `react-native-reanimated` (not imported, babel plugin not even configured), `expo-status-bar` (not imported)

---

## PR 1 — cotecc-api hardening (branch `baseline/api-hardening`)

### Task 1: Fix Docker healthcheck path

**Files:**
- Modify: `cotecc-api/Dockerfile` (HEALTHCHECK line)
- Modify: `docker-compose.yml` (healthcheck test line)

- [x] **Step 1:** In both files replace `http://localhost:3000/` with `http://localhost:3000/health` (the app only serves `/health`; probing `/` returns 404 → wget exits non-zero → container reported unhealthy).
- [x] **Step 2:** Commit: `fix: point Docker healthchecks at /health endpoint`

### Task 2: Replace body-parser with express.json and add helmet

**Files:**
- Modify: `cotecc-api/src/app.ts`
- Modify: `cotecc-api/package.json`
- Test: `cotecc-api/src/__tests__/app.test.ts`

- [x] **Step 1:** Write failing test in `app.test.ts`:

```ts
it('sets security headers via helmet', async () => {
  const res = await request(app).get('/health');
  expect(res.headers['x-content-type-options']).toEqual('nosniff');
  expect(res.headers['x-powered-by']).toBeUndefined();
});
```

- [x] **Step 2:** Run `npm test` — expect FAIL (x-powered-by is set, nosniff absent).
- [x] **Step 3:** `npm uninstall body-parser @types/body-parser && npm install helmet` then rewrite `app.ts`:

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
```

- [x] **Step 4:** Run `npm test` — expect all PASS.
- [x] **Step 5:** Commit: `feat: add helmet and drop redundant body-parser dependency`

### Task 3: npm audit fix + CI job for api

**Files:**
- Modify: `cotecc-api/package-lock.json`
- Modify: `.github/workflows/app-build.yml`

- [x] **Step 1:** `cd cotecc-api && npm audit fix` (no --force), then `npm test` — expect PASS, `npm audit` reports 0 (or document remainder).
- [x] **Step 2:** Add CI job to `app-build.yml`:

```yaml
  api-unit-tests:
    name: API Unit Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cotecc-api
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    - name: Use Node 18.x
      uses: actions/setup-node@v4
      with:
        node-version: '18.x'
        cache: 'npm'
        cache-dependency-path: cotecc-api/package-lock.json
    - name: Install dependencies
      run: npm ci
    - name: Test
      run: npm test
```

- [x] **Step 3:** Commit: `chore: fix api audit findings and run api tests in CI`. Push branch, open PR.

## PR 2 — CoteccApp dependency cleanup (branch `baseline/app-deps`)

### Task 4: Remove unused dependencies

**Files:**
- Modify: `CoteccApp/package.json`, `CoteccApp/package-lock.json`

- [x] **Step 1:** `cd CoteccApp && npm uninstall @react-native-community/masked-view react-native-reanimated expo-status-bar` (none are imported anywhere; reanimated's babel plugin isn't configured so it could never work; masked-view package is deprecated). Keep `react-native-web` + `@expo/webpack-config` — they power the web target in PR 4. Keep `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context` (peer deps of react-navigation).
- [x] **Step 2:** `npx jest && npm run lint` — expect 100 tests PASS, lint clean. Check `npm ls` for new peer warnings.
- [x] **Step 3:** Commit: `chore: remove unused masked-view, reanimated and expo-status-bar deps`

### Task 5: Audit fix (non-breaking)

- [x] **Step 1:** `npm audit fix` (no --force), `npx jest && npm run lint` — expect PASS.
- [x] **Step 2:** Record remaining vuln count for the baseline report (remainder requires Expo SDK / RN major upgrade — out of scope, documented as recommendation).
- [x] **Step 3:** Commit: `chore: apply non-breaking npm audit fixes to CoteccApp`. Push, open PR.

## PR 3 — Deterministic point-avoiding AI player (branch `baseline/ai-player`, off main)

### Task 6: Rewrite aiPlayerLogic with TDD

**Files:**
- Modify: `CoteccApp/src/utils/aiPlayerLogic.ts`
- Modify: `CoteccApp/src/utils/aiPlayerLogic.test.ts`
- Modify: `CoteccApp/src/screens/GameScreen.tsx` (pass players-in-round count)

Strategy (cotecchio = avoid taking points):
1. Single card → forced play (existing RULE-1).
2. Following suit, one eligible → forced (existing RULE-2.A).
3. Following suit, holding cards *below* the current highest → play the **highest card that still loses** (generalizes RULE-2.B; safely sheds dangerous cards).
4. Following suit, all eligible cards beat the current highest: if **last to act** (moves == playersInRound-1) the trick is won regardless → dump the **strongest**; otherwise play the **weakest** and hope to be overtaken.
5. Leading on the first trick → keep RULE-3.A (highest of fewest suit) but only if it carries 0 points and isn't a guaranteed winner; otherwise lead the weakest non-boss card.
6. Leading mid-game → lead the **weakest card that can still be beaten** ("non-boss", computed from cards seen in pastTurns + currentTurn + own hand).
7. Void in led suit, first trick → keep RULE-3.B; mid-game → **discard the most dangerous card** (highest points, then rank; tie-break shortest suit).
All `Math.random` fallbacks removed; signature gains optional `playersInRound`.

- [x] **Step 1:** Replace the two `TODO: RANDOM...` tests and add new cases (full test list):
  - follow suit with mix above/below current highest → plays highest below
  - follow suit, all above, not last to act → plays weakest eligible
  - follow suit, all above, last to act (`playersInRound` given) → plays strongest eligible
  - mid-game lead → weakest non-boss card
  - mid-game lead, lowest card is boss (e.g. holds 10 bastoni after ace bastoni was played) → avoids boss, leads other suit
  - mid-game void → discards highest-point card
  - first-trick lead where fewest-suit-highest is a point card/ace → does not lead it
- [x] **Step 2:** `npx jest src/utils/aiPlayerLogic.test.ts` — expect new tests FAIL.
- [x] **Step 3:** Implement `aiPlayerLogic.ts` per strategy above (helpers: `playedCards`, `hasGreaterOutstanding`, `strongest`/`weakest` via `cardIsGreater`).
- [x] **Step 4:** `npx jest src/utils/aiPlayerLogic.test.ts` — expect PASS; then full `npx jest` — all suites PASS.
- [x] **Step 5:** Update `GameScreen.tsx` AI call to pass `localGameState.currentRound.players.length` as 4th arg; full `npx jest && npm run lint`.
- [x] **Step 6:** Commits: `feat: deterministic point-avoiding ai strategy` + `feat: ai considers play position via playersInRound`. Push, open PR.

## PR 4 — Web target + screenshot collection (branch `baseline/web-screenshots`, stacked on PR 2)

### Task 7: Make CoteccApp run in the browser

**Files:**
- Modify: `CoteccApp/package.json` (add `react-dom@18.2.0`, `web` script)
- Create: `CoteccApp/index.web.js`

- [x] **Step 1:** `npm install react-dom@18.2.0` and add script `"web": "expo start --web"`.
- [x] **Step 2:** Create `index.web.js`:

```js
import {AppRegistry} from 'react-native';

import {name as appName} from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
```

- [x] **Step 3:** Use the `run` skill: launch `npx expo start --web` (webpack via @expo/webpack-config; if webpack path fails, set `expo.web.bundler: "metro"` in app.json and retry). Verify the selection screen renders and a game can be started in the browser.
- [x] **Step 4:** `npx jest && npm run lint` still pass. Commit: `feat: add web entrypoint to run CoteccApp in the browser`

### Task 8: Playwright screenshot tooling + collection

**Files:**
- Create: `tools/screenshots/package.json`, `tools/screenshots/capture.js`
- Create: `doc/screenshots/*.png` (committed collection)
- Modify: `doc/DEVELOPMENT.md` (how to regenerate)

- [x] **Step 1:** Standalone tool package (keeps Playwright out of app bundles):

```json
{
  "name": "cotecc-screenshots",
  "private": true,
  "scripts": {"capture": "node capture.js"},
  "devDependencies": {"playwright": "^1.49.0"}
}
```

- [x] **Step 2:** `capture.js`: for viewports `mobile 390x844`, `tablet 768x1024`, `desktop 1440x900` — open `BASE_URL` (default `http://localhost:19006`), screenshot selection screen; fill name input, press "Start Game", wait for the table, screenshot game screen. Output `doc/screenshots/<screen>-<viewport>.png`.
- [x] **Step 3:** With the web app running, `npm run capture`; verify 6+ PNGs exist and look right (Read them).
- [x] **Step 4:** Document regeneration steps in `doc/DEVELOPMENT.md`. Commits: `feat: add playwright screenshot tool` + `docs: add baseline screenshot collection`. Push, open PR (note: stacked on PR 2).

## PR 5 — Remove redundant cotecc-web + baseline report (branch `baseline/remove-web-skeleton`)

### Task 9: Delete CRA skeleton

**Files:**
- Delete: `cotecc-web/` (entire package)
- Modify: `README.md` (remove/adjust references if any)

- [x] **Step 1:** Verify once more `cotecc-web/src` contains only CRA boilerplate (App.tsx with spinning logo, no game imports). It does.
- [x] **Step 2:** `git rm -r cotecc-web`; grep README/docs/docker-compose/CI for references and clean them up.
- [x] **Step 3:** Commit: `chore: remove unused cotecc-web CRA skeleton` (PR body explains the web target now lives in CoteccApp via react-native-web; 64 npm vulns disappear with it).

### Task 10: Baseline report

**Files:**
- Create: `doc/BASELINE-2026-06-11.md`

- [x] **Step 1:** Write report: test/coverage table per package, security posture (fixed vs remaining vulns + why), dependency cleanup summary, AI strategy description, screenshot inventory, recommendations (Expo SDK upgrade path, screen test coverage, CRA removal rationale).
- [x] **Step 2:** Commit: `docs: add baseline review report`. Push, open PR.

---

## Self-review notes

- Spec coverage: tests/working app → baseline run + healthcheck fix + CI (Tasks 1-3); security → Tasks 2,3,5 + report; dedup/deps → Tasks 2,4,9; AI → Task 6; screenshots → Tasks 7,8. ✓
- Existing aiPlayerLogic tests RULE-1/2.A/2.B/3.A/3.B remain green under the new strategy by design (verified rule-by-rule against fixtures).
- PR 4 stacks on PR 2 because both touch `CoteccApp/package.json`.
