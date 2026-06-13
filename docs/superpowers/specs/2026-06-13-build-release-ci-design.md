# Cross-platform Build & Release CI — Design

**Date:** 2026-06-13
**Sub-project:** D (final piece of the A→BC→D structural review)
**Branch:** `feat/build-release-ci`

## Context

`CoteccApp` is on Expo SDK 56 with Continuous Native Generation (CNG): the
`android/` and `ios/` directories are gitignored and regenerated on demand via
`expo prebuild`. The existing `.github/workflows/app-build.yml` runs unit tests
(lint + jest) and a web Docker-image render smoke test. There is no native
(Android/iOS) build or release automation yet.

An EAS project already exists (`cotecc`, projectId
`daaed10d-d90d-4d15-ac51-3df291ff8e48`, declared in `CoteccApp/app.json`).

**Hard constraint:** the Expo subscription allows only **15 free EAS builds**.
Therefore EAS cloud builds must never run per-commit; iteration 1 uses
local-runner builds only, and later EAS phases run on explicit triggers.

## Goal

Add a build-and-release pipeline in three phases. **Only Phase 1 is
implemented now**; Phases 2 and 3 are specified in full executable detail but
not built.

- **Phase 1 (implement):** local GitHub-runner verification builds for web,
  Android, and iOS; on merge to `main`, cut a semantic-version GitHub release
  and attach the Android APK (and web bundle).
- **Phase 2 (design only):** EAS cloud builds with managed signing, triggered by
  a PR-comment workflow and by new version tags.
- **Phase 3 (design only):** store submission (TestFlight + Google Play internal).

## Decisions

- **Build engine, iteration 1:** local runners (no EAS, no `EXPO_TOKEN`) — to
  respect the 15-build cap. `eas build` runs on Expo's servers and requires an
  authenticated Expo account (the `EXPO_TOKEN`); local builds avoid that
  dependency entirely.
- **Platforms:** all three. Android and iOS are built/verified in this new
  workflow; web is already render-tested by `app-build.yml` and is additionally
  exported here to attach to the release.
- **iOS in Phase 1:** compile-verification only (simulator build, no signing).
  An installable `.ipa` requires signing, deferred to Phase 2 — so iOS produces
  no release artifact in Phase 1.
- **Android APK in Phase 1:** `assembleRelease`. The Expo-generated
  `android/app/build.gradle` release buildType reuses `signingConfigs.debug`
  (verified), so the release APK is **debug-signed (installable, no secrets) and
  bundles the JS (Hermes)** — unlike `assembleDebug`, which needs a Metro dev
  server and cannot run standalone. The artifact is labeled debug-signed; real
  store signing is Phase 2.
- **Versioning:** `release-please` (Google's action) drives semantic versioning
  from conventional commits (already used in this repo), maintains a release PR,
  and on merge creates the tag + GitHub release + changelog, and bumps
  `expo.version` in `app.json`.
- **Triggers, iteration 1:** pull_request + push-to-main + manual
  (`workflow_dispatch`). The release step runs on `main` only.

## Phase 1 — Architecture (implemented)

New workflow `.github/workflows/build-release.yml` with five jobs. Existing
`app-build.yml` is unchanged.

**Cross-cutting workflow settings:**
- **Permissions:** workflow default `permissions: contents: read`; the `release`
  job alone elevates to `contents: write` + `pull-requests: write`.
- **Concurrency:** `concurrency: { group: build-release-${{ github.ref }},
  cancel-in-progress: ${{ github.event_name == 'pull_request' }} }` — superseded
  PR runs are cancelled (saves macOS minutes); main/tag runs are never cancelled.
- **Caching:** npm via `actions/setup-node` cache; Gradle via
  `gradle/actions/setup-gradle` (or `actions/cache` on `~/.gradle/caches`);
  CocoaPods via `actions/cache` on `CoteccApp/ios/Pods` keyed by `Podfile.lock`.

### Job: `verify-android` (ubuntu-latest)
Triggers: pull_request, push to main, workflow_dispatch.
Steps:
1. checkout
2. setup Node 22 (cache npm, `cache-dependency-path: CoteccApp/package-lock.json`)
3. setup JDK 17 (Temurin)
4. `cd CoteccApp && npm ci`
5. `npx expo prebuild --platform android --no-install` (regenerates `android/`)
6. `cd android && ./gradlew assembleRelease --no-daemon` (release buildType is
   debug-signed per the generated build.gradle → installable, JS bundled)
7. upload `CoteccApp/android/app/build/outputs/apk/release/app-release.apk` as
   artifact `cotecc-android-apk` (retention 14 days).

### Job: `verify-ios` (macos-latest)
Triggers: pull_request, push to main, workflow_dispatch.
Steps:
1. checkout
2. setup Node 22
3. `cd CoteccApp && npm ci`
4. `npx expo prebuild --platform ios --no-install`
5. `cd ios && pod install`
6. discover the generated names (prebuild derives them from `expo.name`,
   currently "Cotecc" → `ios/Cotecc.xcworkspace`, scheme `Cotecc`; discovered
   dynamically so a future rename doesn't break CI):
   `WS=$(ls -d ios/*.xcworkspace); SCHEME=$(basename "$WS" .xcworkspace)`
   then `xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release -sdk iphonesimulator -derivedDataPath build CODE_SIGNING_ALLOWED=NO build`
7. no artifact (verification only).

### Job: `verify-web` (ubuntu-latest)
Triggers: pull_request, push to main, workflow_dispatch.
Steps:
1. checkout, Node 22, `npm ci`
2. `npx expo export --platform web --output-dir dist`
3. upload `CoteccApp/dist` as artifact `cotecc-web-bundle`.

### Job: `release-please` (ubuntu-latest, push-to-main only)
No `needs` — runs unconditionally on `main` so the release PR is maintained even
if a native build is red. Permissions: `contents: write`, `pull-requests:
write`. Step: `googleapis/release-please-action@v4` configured via
`release-please-config.json` + `.release-please-manifest.json`; outputs
`release_created` and `tag_name`.

### Job: `attach-artifacts` (ubuntu-latest, push-to-main only)
`needs: [release-please, verify-android, verify-web]`; runs only when
`needs.release-please.outputs.release_created == 'true'`. Permissions:
`contents: write`.
Steps:
1. `actions/download-artifact` for `cotecc-android-apk` and `cotecc-web-bundle`.
2. zip the web bundle: `zip -r "cotecc-web-${tag}.zip" dist`.
3. `gh release upload "$tag_name" app-release.apk "cotecc-web-${tag}.zip" --clobber`.

If a verify job was red, the release/tag/changelog are still created (decoupled);
the APK can be attached by re-running `attach-artifacts` once builds are green.

### release-please configuration
- `release-please-config.json` (repo root): single package keyed `"."` with
  **`release-type: simple`** (the repo root is not a node package, so no
  `package.json` is assumed at root), `package-name: cotecc`,
  `include-component-in-tag: false` (tag = `vX.Y.Z`, which Phase 2's `v*`
  trigger relies on), and `extra-files` to bump the version in
  `CoteccApp/app.json` (json path `$.expo.version`) and `CoteccApp/package.json`
  (json path `$.version`).
- `.release-please-manifest.json`: `{ ".": "1.0.0" }` (matches the current
  `CoteccApp/app.json` `expo.version`).
- Conventional commits map: `feat:` → minor, `fix:` → patch, `feat!:`/`BREAKING
  CHANGE` → major, others (`chore`/`docs`/`test`/`build`) → no release.

### Phase 1 verification
- Open a PR with a `fix:`/`feat:` commit → `verify-android`, `verify-ios`,
  `verify-web` run and pass; the APK and web bundle appear as workflow
  artifacts; release-please opens/updates a release PR.
- Merge the release PR → release-please creates `vX.Y.Z` + changelog, bumps
  `app.json` version, and the APK + web zip are attached to the release.
- The 3 verify jobs are green on a normal PR; no EAS minutes consumed.

## Phase 2 — EAS remote builds + signing (design only, not implemented)

### Files
- `CoteccApp/eas.json` — build profiles:
  - `development`: `developmentClient: true`, `distribution: internal`.
  - `preview`: `distribution: internal`, Android `buildType: apk`,
    iOS `simulator: false` (signed internal build).
  - `production`: store-ready, `autoIncrement: true`.
- `.github/workflows/eas-build.yml`.

### Secrets
- `EXPO_TOKEN` — Expo robot-account access token (expo.dev → Account →
  Access Tokens). Required for `eas build`/`eas submit` in non-interactive CI.

### Signing (EAS-managed credentials)
- iOS: requires an **Apple Developer Program** membership ($99/yr). Provide an
  **App Store Connect API key** (`.p8` + key id + issuer id) so EAS can create
  and store the iOS Distribution certificate and provisioning profile
  automatically (`eas credentials` or first non-interactive build with the API
  key configured).
- Android: EAS generates and stores an upload keystore on first build
  (`eas credentials`); no local keystore needed.

### Triggers (explicit only — respects the 15-build cap)
- **PR-comment workflow:** `on: issue_comment` (types: created). Guard:
  `github.event.issue.pull_request != null` and comment body starts with
  `/eas-build`, and the commenter has write permission (check via
  `gh api repos/{owner}/{repo}/collaborators/{user}/permission`). Then checkout
  the PR head and run `eas build --platform all --profile preview
  --non-interactive`. Post the build URL back as a comment.
- **Tag workflow:** `on: push: tags: ['v*']` → `eas build --platform all
  --profile production --non-interactive`.

### Steps (shared)
1. checkout (for comment trigger: the PR head ref)
2. Node 22, `cd CoteccApp && npm ci`
3. `expo/expo-github-action@v8` with `eas-version: latest`,
   `token: ${{ secrets.EXPO_TOKEN }}`
4. `eas build --platform all --profile <profile> --non-interactive
   --no-wait` (or wait + capture artifact URL)

## Phase 3 — Store submission (design only, not implemented)

### Secrets (in addition to Phase 2)
- iOS: the same App Store Connect API key (TestFlight upload).
- Android: a **Google Play service-account JSON** (`GOOGLE_SERVICE_ACCOUNT_KEY`)
  with the "Service Account User" role and access to the app in Play Console.

### Prerequisites
- App records must already exist: an App Store Connect app with the
  `com.localcardsgames.coteccapp` bundle id, and a Google Play app with the
  matching package, with at least one manual upload to the internal track
  (Play requires a first manual upload before API uploads).

### Workflow
- Extend `eas.json` `submit` config: iOS `appleId`/`ascAppId`/`appleTeamId` (or
  API key), Android `serviceAccountKeyPath` + `track: internal`.
- `.github/workflows/eas-submit.yml`:
  - **Trigger:** after a successful production build on a `v*` tag, or a
    `/publish` PR comment (same permission guard as Phase 2).
  - Steps: Node 22 → expo-github-action with `EXPO_TOKEN` →
    `eas submit --platform ios --profile production --non-interactive` and
    `eas submit --platform android --profile production --non-interactive`
    (consuming the latest production build, or `--path` to a built artifact).

## Out of scope

- Code changes to the app itself.
- Actually creating the Apple Developer / Google Play accounts or app records.
- Implementing Phases 2 and 3 (specified here, executed later).
- Web hosting/deploy (web stays a static artifact; deployment is separate).

## Risks

- **macOS runner cost/time:** `verify-ios` on `macos-latest` is the slowest and
  most expensive Phase-1 job; if CI minutes become a concern, it can be moved to
  manual/main-only.
- **prebuild drift:** `expo prebuild` must produce a buildable project from
  `app.json` alone; any future config-plugin requirement must be captured in
  `app.json` (verified once in BC).
- **release-please first run:** the initial manifest version must match the
  current `app.json` (`1.0.0`) or the first release PR will propose an
  unexpected version.
- **Phase 2/3 account gating:** iOS signing and store submission cannot be
  exercised without a paid Apple Developer account and Play Console access;
  these phases are blocked on those externalities, by design.
