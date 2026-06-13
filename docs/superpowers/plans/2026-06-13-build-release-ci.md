# Cross-platform Build & Release CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions pipeline that verification-builds web/Android/iOS on local runners and, on merge to `main`, cuts a semantic-version release with the installable Android APK attached — plus a deferred (designed-not-built) Phase 2 (EAS cloud builds + signing) and Phase 3 (store submission).

**Architecture:** One new workflow `.github/workflows/build-release.yml` with five jobs (`verify-android`, `verify-ios`, `verify-web`, `release-please`, `attach-artifacts`). Versioning is driven by `release-please` (conventional commits). The app uses Expo SDK 56 CNG, so native dirs are regenerated with `expo prebuild` inside CI. Existing `app-build.yml` is untouched.

**Tech Stack:** GitHub Actions, Node 22, JDK 17 (Temurin), Gradle, CocoaPods/xcodebuild, Expo SDK 56 / `expo prebuild`, `release-please`, (deferred) EAS CLI.

**Reference:** Expo SDK 56 docs — https://docs.expo.dev/versions/v56.0.0

**Environment for local pre-flight commands:** Node 22 (`export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"`); app commands run from `CoteccApp/` with `HUSKY=0`.

---

## File map

**Phase 1 — created (this iteration):**
- `release-please-config.json` (repo root) — release-please package config
- `.release-please-manifest.json` (repo root) — release-please version manifest
- `.github/workflows/build-release.yml` — the build & release workflow

**Phase 2 & 3 — DEFERRED (full contents provided below; do NOT create/commit this iteration):**
- `CoteccApp/eas.json` — EAS build + submit profiles
- `.github/workflows/eas-build.yml` — EAS cloud builds (comment + tag triggers)
- `.github/workflows/eas-submit.yml` — store submission

---

# PHASE 1 — EXECUTE NOW

### Task 1: release-please configuration

**Files:**
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

- [ ] **Step 1: Create `release-please-config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "packages": {
    ".": {
      "release-type": "simple",
      "package-name": "cotecc",
      "include-component-in-tag": false,
      "changelog-path": "CHANGELOG.md",
      "extra-files": [
        { "type": "json", "path": "CoteccApp/app.json", "jsonpath": "$.expo.version" },
        { "type": "json", "path": "CoteccApp/package.json", "jsonpath": "$.version" }
      ]
    }
  }
}
```

- [ ] **Step 2: Create `.release-please-manifest.json`**

Seed at the current `CoteccApp/app.json` `expo.version` (`1.0.0`). On the first
release, `release-please` aligns both extra-files to the next version (so
`CoteccApp/package.json` jumps from `0.0.1` to the release version — intended;
it unifies versioning).

```json
{
  ".": "1.0.0"
}
```

- [ ] **Step 3: Validate the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('release-please-config.json','utf8')); JSON.parse(require('fs').readFileSync('.release-please-manifest.json','utf8')); console.log('json ok')"`
Expected: `json ok`

- [ ] **Step 4: Commit**

```bash
git add release-please-config.json .release-please-manifest.json
git commit -m "ci: add release-please configuration"
```

---

### Task 2: Verification jobs (android / ios / web)

**Files:**
- Create: `.github/workflows/build-release.yml`

- [ ] **Step 1: Create the workflow with the three verify jobs + cross-cutting settings**

Create `.github/workflows/build-release.yml`:

```yaml
name: Build & Release

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: build-release-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify-android:
    name: Verify Android (APK)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: npm
          cache-dependency-path: CoteccApp/package-lock.json
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v4
      - name: Install JS deps
        working-directory: CoteccApp
        run: npm ci
        env:
          HUSKY: '0'
      - name: Prebuild android
        working-directory: CoteccApp
        run: npx expo prebuild --platform android --no-install
      - name: Assemble release APK (debug-signed, installable)
        working-directory: CoteccApp/android
        run: ./gradlew assembleRelease --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: cotecc-android-apk
          path: CoteccApp/android/app/build/outputs/apk/release/app-release.apk
          retention-days: 14

  verify-ios:
    name: Verify iOS (simulator)
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: npm
          cache-dependency-path: CoteccApp/package-lock.json
      - name: Install JS deps
        working-directory: CoteccApp
        run: npm ci
        env:
          HUSKY: '0'
      - name: Prebuild ios
        working-directory: CoteccApp
        run: npx expo prebuild --platform ios --no-install
      - name: Cache Pods
        uses: actions/cache@v4
        with:
          path: CoteccApp/ios/Pods
          key: pods-${{ hashFiles('CoteccApp/package-lock.json') }}
          restore-keys: pods-
      - name: Pod install
        working-directory: CoteccApp/ios
        run: pod install
      - name: Build for simulator (no signing)
        working-directory: CoteccApp/ios
        run: |
          WS=$(ls -d *.xcworkspace)
          SCHEME=$(basename "$WS" .xcworkspace)
          echo "Building workspace=$WS scheme=$SCHEME"
          xcodebuild -workspace "$WS" -scheme "$SCHEME" \
            -configuration Release -sdk iphonesimulator \
            -derivedDataPath build CODE_SIGNING_ALLOWED=NO build

  verify-web:
    name: Verify Web (export)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: npm
          cache-dependency-path: CoteccApp/package-lock.json
      - name: Install JS deps
        working-directory: CoteccApp
        run: npm ci
        env:
          HUSKY: '0'
      - name: Export web bundle
        working-directory: CoteccApp
        run: npx expo export --platform web --output-dir dist
      - uses: actions/upload-artifact@v4
        with:
          name: cotecc-web-bundle
          path: CoteccApp/dist
          retention-days: 14
```

- [ ] **Step 2: Local pre-flight — confirm the Android APK builds and the path is correct**

(Only if a local Android SDK + JDK 17 are available; otherwise rely on CI in Task 4.)

Run:
```bash
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"; export HUSKY=0
cd CoteccApp
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease --no-daemon
ls -la app/build/outputs/apk/release/app-release.apk
```
Expected: `app-release.apk` exists at that path.

- [ ] **Step 3: Lint the workflow YAML if `actionlint` is available**

Run: `command -v actionlint >/dev/null && actionlint .github/workflows/build-release.yml || echo "actionlint not installed — skipping (CI will validate)"`
Expected: no errors, or the skip message.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build-release.yml
git commit -m "ci: add verification builds for web, android, ios"
```

---

### Task 3: release-please + attach-artifacts jobs

**Files:**
- Modify: `.github/workflows/build-release.yml` (append two jobs)

- [ ] **Step 1: Append the `release-please` and `attach-artifacts` jobs**

Append to `.github/workflows/build-release.yml` (under `jobs:`, same indentation as the verify jobs):

```yaml
  release-please:
    name: Release Please
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    outputs:
      release_created: ${{ steps.rp.outputs.release_created }}
      tag_name: ${{ steps.rp.outputs.tag_name }}
    steps:
      - uses: googleapis/release-please-action@v4
        id: rp
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

  attach-artifacts:
    name: Attach release artifacts
    needs: [release-please, verify-android, verify-web]
    if: needs.release-please.outputs.release_created == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: cotecc-android-apk
          path: apk
      - uses: actions/download-artifact@v4
        with:
          name: cotecc-web-bundle
          path: web
      - name: Zip web bundle
        run: zip -r "cotecc-web-${{ needs.release-please.outputs.tag_name }}.zip" web
      - name: Upload artifacts to the GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          gh release upload "${{ needs.release-please.outputs.tag_name }}" \
            apk/app-release.apk \
            "cotecc-web-${{ needs.release-please.outputs.tag_name }}.zip" \
            --clobber
```

- [ ] **Step 2: Validate YAML parses**

Run: `python3 -c "import sys" 2>/dev/null; node -e "const y=require('fs').readFileSync('.github/workflows/build-release.yml','utf8'); if(!y.includes('attach-artifacts')||!y.includes('release-please')) {throw new Error('jobs missing')}; console.log('workflow contains all 5 jobs')"`
Expected: `workflow contains all 5 jobs`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-release.yml
git commit -m "ci: add release-please and release-artifact attachment"
```

---

### Task 4: End-to-end verification in CI

**Files:** none (verification only)

- [ ] **Step 1: Push the branch and open a PR**

```bash
git push -u origin feat/build-release-ci
gh pr create --base main --title "ci: cross-platform build & release pipeline (sub-project D, phase 1)" --body "Adds local-runner verification builds (web/android/ios) and a release-please-driven release with the Android APK attached on merge. Phases 2-3 (EAS + store) are designed in docs/superpowers but not implemented."
```

- [ ] **Step 2: Confirm the verify jobs run and pass on the PR**

Run: `gh pr checks --watch` (or `gh run list --branch feat/build-release-ci`)
Expected: `Verify Android (APK)`, `Verify iOS (simulator)`, `Verify Web (export)` all pass. `release-please`/`attach-artifacts` are skipped on the PR (push-to-main only).

- [ ] **Step 3: Confirm artifacts uploaded**

Run: `gh run view <run-id> --json jobs` then check the run's Artifacts in the Actions UI.
Expected: `cotecc-android-apk` and `cotecc-web-bundle` artifacts present.

- [ ] **Step 4: Merge the PR; confirm release-please opens a release PR**

After merge to `main`, the `release-please` job runs and opens a PR titled like
`chore(main): release 1.1.0`.
Run: `gh pr list --search "release"`
Expected: a release PR exists.

- [ ] **Step 5: Merge the release PR; confirm the release + APK**

Run: `gh release list` then `gh release view v<version>`
Expected: a release `v<version>` exists with `CHANGELOG`, and `app-release.apk` +
`cotecc-web-v<version>.zip` attached. `CoteccApp/app.json` `expo.version` and
`CoteccApp/package.json` `version` are bumped to `<version>` on `main`.

---

# PHASE 2 — DEFERRED (design only; do NOT create/commit this iteration)

EAS cloud builds with managed signing. Prerequisites: an Expo account with a
robot **`EXPO_TOKEN`** access token (repo secret), and — for iOS — an Apple
Developer Program membership ($99/yr) plus an App Store Connect API key.
Respects the 15-build cap by running only on explicit triggers.

### Deferred file: `CoteccApp/eas.json`

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": { "autoIncrement": true }
  }
}
```

### Deferred file: `.github/workflows/eas-build.yml`

```yaml
name: EAS Build

on:
  issue_comment:
    types: [created]
  push:
    tags: ['v*']

permissions:
  contents: read
  pull-requests: write

jobs:
  eas-build:
    if: >
      github.event_name == 'push' ||
      (github.event_name == 'issue_comment' &&
       github.event.issue.pull_request != null &&
       startsWith(github.event.comment.body, '/eas-build'))
    runs-on: ubuntu-latest
    steps:
      - name: Check commenter permission
        if: github.event_name == 'issue_comment'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.event.comment.user.login }}/permission" --jq .permission)
          { [ "$PERM" = "admin" ] || [ "$PERM" = "write" ]; } || { echo "Insufficient permission: $PERM"; exit 1; }
      - name: Resolve PR head ref
        id: ref
        if: github.event_name == 'issue_comment'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          REF=$(gh api "repos/${{ github.repository }}/pulls/${{ github.event.issue.number }}" --jq .head.ref)
          echo "ref=$REF" >> "$GITHUB_OUTPUT"
      - uses: actions/checkout@v4
        with:
          ref: ${{ steps.ref.outputs.ref || github.ref }}
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: npm
          cache-dependency-path: CoteccApp/package-lock.json
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install JS deps
        working-directory: CoteccApp
        run: npm ci
        env:
          HUSKY: '0'
      - name: EAS build
        working-directory: CoteccApp
        run: |
          if [ "${{ github.event_name }}" = "push" ]; then PROFILE=production; else PROFILE=preview; fi
          eas build --platform all --profile "$PROFILE" --non-interactive --no-wait
```

### Deferred steps (Phase 2 execution, when ready)
1. Create an Expo robot token (expo.dev → Account → Access Tokens); add repo secret `EXPO_TOKEN`.
2. For iOS: enroll in Apple Developer Program; create an App Store Connect API key; run `cd CoteccApp && eas credentials` once (or let the first non-interactive build with the API key configured generate the iOS distribution cert + provisioning profile). Android: `eas credentials` generates/stores the upload keystore on first build.
3. Create `CoteccApp/eas.json` (above) and `.github/workflows/eas-build.yml` (above); commit.
4. Trigger a `preview` build by commenting `/eas-build` on a PR (only write-access users pass the guard); confirm a build appears at expo.dev and the count stays within the free-tier 15.
5. Tag a release (`git tag v1.1.0 && git push --tags`) to trigger a `production` build.

---

# PHASE 3 — DEFERRED (design only; do NOT create/commit this iteration)

Store submission to TestFlight (iOS) and Google Play internal track (Android),
built on Phase 2. Prerequisites: everything in Phase 2, plus a **Google Play
service-account JSON** (`GOOGLE_SERVICE_ACCOUNT_KEY` secret) and the App Store
Connect API key (`ASC_API_KEY` secret); and pre-existing app records — an App
Store Connect app for `com.localcardsgames.coteccapp` and a Google Play app with
the same package (Play requires one manual upload to the internal track first).

### Deferred addition to `CoteccApp/eas.json` (`submit` block)

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascApiKeyPath": "./asc-api-key.p8",
        "ascApiKeyId": "REPLACE_WITH_ASC_KEY_ID",
        "ascApiKeyIssuerId": "REPLACE_WITH_ASC_ISSUER_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Deferred file: `.github/workflows/eas-submit.yml`

```yaml
name: EAS Submit

on:
  push:
    tags: ['v*']
  issue_comment:
    types: [created]

permissions:
  contents: read

jobs:
  eas-submit:
    if: >
      github.event_name == 'push' ||
      (github.event_name == 'issue_comment' &&
       github.event.issue.pull_request != null &&
       startsWith(github.event.comment.body, '/publish'))
    runs-on: ubuntu-latest
    steps:
      - name: Check commenter permission
        if: github.event_name == 'issue_comment'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          PERM=$(gh api "repos/${{ github.repository }}/collaborators/${{ github.event.comment.user.login }}/permission" --jq .permission)
          { [ "$PERM" = "admin" ] || [ "$PERM" = "write" ]; } || { echo "Insufficient permission: $PERM"; exit 1; }
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: npm
          cache-dependency-path: CoteccApp/package-lock.json
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install JS deps
        working-directory: CoteccApp
        run: npm ci
        env:
          HUSKY: '0'
      - name: Write Play service-account key
        working-directory: CoteccApp
        run: printf '%s' '${{ secrets.GOOGLE_SERVICE_ACCOUNT_KEY }}' > play-service-account.json
      - name: Write App Store Connect API key
        working-directory: CoteccApp
        run: printf '%s' '${{ secrets.ASC_API_KEY }}' > asc-api-key.p8
      - name: Submit iOS to TestFlight
        working-directory: CoteccApp
        run: eas submit --platform ios --profile production --non-interactive --latest
      - name: Submit Android to Play internal
        working-directory: CoteccApp
        run: eas submit --platform android --profile production --non-interactive --latest
      - name: Clean up secret files
        if: always()
        working-directory: CoteccApp
        run: rm -f play-service-account.json asc-api-key.p8
```

### Deferred steps (Phase 3 execution, when ready)
1. Create the App Store Connect app record (bundle id `com.localcardsgames.coteccapp`) and the Google Play app; do one manual internal-track upload on Play.
2. Create a Google Play service account, grant it release access, download the JSON; add repo secret `GOOGLE_SERVICE_ACCOUNT_KEY`. Add `ASC_API_KEY` (the `.p8` contents) secret and fill the key/issuer ids in `eas.json`.
3. Add the `submit` block to `eas.json` and create `.github/workflows/eas-submit.yml`; commit.
4. Tag a release (or `/publish` comment) and confirm the builds land in TestFlight and the Play internal track.

---

## Self-review notes

- **Spec coverage:** Phase 1 verify-android/ios/web (Task 2), release-please + attach (Task 1 + Task 3), all cross-cutting settings — permissions/concurrency/caching (Task 2 workflow header). Phase 2 EAS build + comment/tag triggers + signing prereqs (deferred section). Phase 3 submit + secrets + store prereqs (deferred section). All spec sections map to a task.
- **Decoupling:** `release-please` has no `needs` and runs unconditionally on main; `attach-artifacts` `needs` the verify jobs + `release_created`, so a red build still cuts the release but defers the APK attach (re-run `attach-artifacts` to attach) — matches the spec.
- **Verified facts baked in:** `assembleRelease` output path `app/build/outputs/apk/release/app-release.apk`; iOS workspace/scheme discovered dynamically (`Cotecc.xcworkspace` confirmed); release-please `simple` type + `extra-files` for app.json/package.json; tag form `vX.Y.Z` (`include-component-in-tag: false`).
- **No placeholders in Phase 1.** Phase 3 `eas.json` intentionally contains `REPLACE_WITH_*` for the ASC key/issuer ids — these are per-account values supplied at Phase 3 execution, not code the executor can know now; they are clearly marked and listed in the deferred steps.
