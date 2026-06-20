# Review Comments: 11 build-engineer

## Reviewer Scope
Reviewed only build-system, native packaging, Expo CNG/prebuild, embedded web export, dependency, reproducibility, CI/EAS, and developer workflow implications.

## Overall Verdict
The design is directionally buildable, but Phase 1 is not yet ready as an implementation handoff because the embedded web bundle and custom native networking path are described conceptually rather than as reproducible CNG/CI artifacts.

## Comments
- `Comment ID:` `LMCD-RC-11-BUILD-001`
  `Severity:` high
  `Section:` 12. Platform implementation realities
  `Issue:` The design says the web bundle is exported and shipped as an asset, but does not define the build step that packages `dist/` into Android/iOS binaries.
  `Rationale:` Current native CI runs `expo prebuild` and Gradle/Xcode builds, while web export is a separate artifact; without an explicit copy/package step, the host app may build successfully but serve no web assets.
  `Suggested Change:` Add a “Web bundle embedding” subsection specifying the command sequence: `npm ci`, `npx expo export --platform web --output-dir dist-embedded`, copy into a native-bundled asset/resource path via config plugin or build script, include a generated asset manifest/hash, and verify the packaged APK/IPA contains it.

- `Comment ID:` `LMCD-RC-11-BUILD-002`
  `Severity:` high
  `Section:` 12. Platform implementation realities
  `Issue:` The custom native module requirement is not translated into CNG-owned config changes.
  `Rationale:` This project gitignores `android/` and `ios/`, so permissions, Info.plist entries, AndroidManifest changes, resource copying, and any Pod/Gradle tweaks must be generated from `app.json` or config plugins.
  `Suggested Change:` Add text requiring every native networking change to be represented in `app.json` or a committed Expo config plugin, with `expo prebuild --clean` as the acceptance test.

- `Comment ID:` `LMCD-RC-11-BUILD-003`
  `Severity:` high
  `Section:` 5. Decision block C — Browser participation tier (incremental)
  `Issue:` The same-origin `http`/`ws` path omits native cleartext networking packaging requirements.
  `Rationale:` Browser clients may accept same-origin `ws://`, but native Android/iOS clients connecting to a LAN `http://` or `ws://` endpoint can require Android cleartext and iOS ATS configuration generated at prebuild time.
  `Suggested Change:` Add a platform build note to require explicit Android cleartext policy and iOS ATS/local-network settings for LAN-only endpoints, implemented through CNG config and verified on real devices.

- `Comment ID:` `LMCD-RC-11-BUILD-004`
  `Severity:` high
  `Section:` 14. Open questions / things to validate before Phase 1
  `Issue:` Native dependency selection is left as “pick the WS/server native module” without a compatibility gate.
  `Rationale:` Expo SDK 56 / React Native 0.85 / Xcode 26 / Android SDK 35 compatibility is a release risk for socket, mDNS, BLE, Nearby, and Multipeer libraries.
  `Suggested Change:` Expand the open question into an explicit dependency spike: choose exact package versions, confirm config-plugin support or write one, run `expo prebuild --clean`, Android release build, iOS simulator build, and record maintenance/license status before Phase 1 implementation.

- `Comment ID:` `LMCD-RC-11-BUILD-005`
  `Severity:` medium
  `Section:` 13. Recommended phased roadmap
  `Issue:` Phase 1 does not say how CI changes when native networking and embedded web assets are introduced.
  `Rationale:` Current native verification is label-gated on PRs, but this feature changes native packaging and can break only after prebuild or real native compilation.
  `Suggested Change:` Add Phase 1 CI requirements: path-trigger or mandatory `build-native` checks for native/config/plugin changes, `expo export` before native builds, packaged-asset existence checks, and a release artifact check that the embedded web bundle hash matches the exported web artifact.

- `Comment ID:` `LMCD-RC-11-BUILD-006`
  `Severity:` medium
  `Section:` 12. Platform implementation realities
  `Issue:` Leaving Expo Go is noted, but the developer workflow for a custom dev client is not specified.
  `Rationale:` Developers need a reliable loop for native modules; Expo Go will not exercise the host server, permissions, or bundled web assets.
  `Suggested Change:` Add a “Developer workflow” paragraph with expected commands for local work, such as `npm run ios`/`npm run android` or an EAS development-client profile, plus a note that Expo Go remains valid only for non-networking screens.

- `Comment ID:` `LMCD-RC-11-BUILD-007`
  `Severity:` medium
  `Section:` 5. Decision block C — Browser participation tier (incremental)
  `Issue:` Serving the exported SPA from the native host does not define routing, MIME, cache, or fallback behavior.
  `Rationale:` The current web target is a static Expo Router export; serving it from an embedded HTTP server needs deterministic handling for `/`, asset paths, SPA fallback, content types, and cache invalidation.
  `Suggested Change:` Add acceptance criteria for the embedded server: serve `index.html`, static assets with correct MIME types, SPA fallback for route refreshes, no stale cache after app upgrade, and a Playwright smoke test against the host-served bundle.

- `Comment ID:` `LMCD-RC-11-BUILD-008`
  `Severity:` medium
  `Section:` 13. Recommended phased roadmap
  `Issue:` The roadmap does not account for binary-size impact from embedding a second web bundle and duplicated assets.
  `Rationale:` The native app already bundles React Native JS/assets, and adding a full web export can materially increase APK/IPA size and release artifacts.
  `Suggested Change:` Add a Phase 1 build budget: report APK/IPA size before and after embedding, set an acceptable size threshold, and decide whether to ship the full web app bundle or a smaller join-client export.

## Consolidation Notes
Likely overlaps with security reviewers on cleartext HTTP, local-network permissions, and dependency trust; my comments are limited to how those risks must be represented in CNG, builds, CI, and release artifacts.
