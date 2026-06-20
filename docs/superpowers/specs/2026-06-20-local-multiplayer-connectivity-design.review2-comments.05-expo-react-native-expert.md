# Expo/React Native Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 05 · **Role:** Expo/RN · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 5 |
| PARTIALLY | 1 |
| NOT-ADDRESSED | 0 |
| WONT-FIX / deferred (documented) | 1 |

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-05-EXPO-001 | RESOLVED | 1A §1 (cluster E); 1A §1.1 (mandatory spike); 1A §1.5; master §7 Phase 1A | 1A §1 names the embedded HTTP+WS host as "highest delivery risk" and makes it a gated mandatory spike (§1.1) that must pass on real Android + iOS dev-client builds before anything else in 1A is started. It also requires choosing a maintained SDK 56/RN 0.85-compatible library or a local Expo Module with a config plugin, verifying `expo prebuild --clean` regenerates native changes, and recording exact library versions/maintenance/license. The 1A §1.5 section adds `eas.json` development/preview profiles and an `npm run android`/`npm run ios` dev-client loop. The native CI gate (path-triggered `build-native`) is also specified. All requirements from the original comment are explicitly incorporated. |
| LMCD-RC-05-EXPO-002 | RESOLVED | 1A §1.4 (host lifecycle); master §2 D4; 1B §2.2–2.4 | 1A §1.4 "Host lifecycle" directly addresses the foreground-only constraint: `expo-keep-awake`, on-screen warning to keep the app open/unlocked, `AppState` transitions handled as pause/host-loss path, and process death treated as host loss (D5: match ends). 1B §2.2 adds heartbeats with half-open detection and browser visibility/resume handling. 1B §2.4 addresses the host-loss UX including the edge case where browser clients served by the now-dead host cannot refresh. The round-1 recommendation is substantially satisfied. |
| LMCD-RC-05-EXPO-003 | RESOLVED | 1A §2 (cluster F — permissions & cleartext) | 1A §2 provides the platform matrix the review requested. Android: `INTERNET`, cleartext network-security-config scoped to LAN/hotspot endpoints, `NEARBY_WIFI_DEVICES` (API 33+)/location (older), `CHANGE_WIFI_STATE`. iOS: `NSLocalNetworkUsageDescription` (+ `NSBonjourServices` deferred to 1B when mDNS lands), ATS/local-network handling for native cleartext clients. All represented in `app.json`/config plugins; `expo prebuild --clean` as the validation test. A permission UX matrix (trigger point, purpose string, denial flow, fallback) is also required (UX-004). Note: `NSBonjourServices` is correctly deferred to 1B when mDNS is added, which is the right sequencing. |
| LMCD-RC-05-EXPO-004 | RESOLVED | 1A §1.2 (static-serving contract); 1A §1.3 (web-bundle embedding pipeline); master §2 D6 | 1A §1.3 specifies the full pipeline: `expo export --platform web --output-dir dist-embedded`, copy to native asset path via config plugin/build script, generate asset manifest + hash, verify packaged APK/IPA. It explicitly calls out the `runtimeVersion` policy question (EAS Update vs binary release, with `fingerprint` as example) — this is BUILD-001/EXPO-004/EXPO-007. 1A §1.2 specifies the static-serving contract (MIME types, SPA fallback for `/join`/`/game`, no CDN dependency, cache invalidation on upgrade). D6 in the master document commits to shipping the full app bundle with a size budget check. The round-1 deliverable is word-for-word incorporated. |
| LMCD-RC-05-EXPO-005 | RESOLVED | master §4 decision block A; 1B §1.3 | The master doc (§4A) now explicitly states Android `LocalOnlyHotspot` joining is "OS-mediated", "a two-step flow (join Wi-Fi, then open the game URL) — not silent auto-join," and cites this comment as a fix (NET-001, EXPO-005). 1B §1.3 adds the full handling: ephemeral creds → Wi-Fi QR, guided two-step join, unsupported-device/failure-code/hotspot-stopped event handling. Android permission requirements (`NEARBY_WIFI_DEVICES`, `CHANGE_WIFI_STATE`) are in 1A §2. iOS Personal Hotspot is marked as manual throughout. The "one tap / auto-join" overstatement is corrected. |
| LMCD-RC-05-EXPO-006 | RESOLVED | 1A §2 (camera permissions); 1A §3.2 (guest journey); 1B §4 (QA pairing tests) | 1A §2 explicitly lists `expo-camera` + `NSCameraUsageDescription` + Android camera permission as a Phase 1A deliverable (EXPO-006), with manual IP/token entry as the no-camera fallback. 1A §3.2 shows the native app guest journey using in-app scan (expo-camera) with fallback to full URL/token. 1B §4 adds pairing QA tests including "camera unavailable" and denial paths. The `package.json` confirms `expo-camera` is not yet in dependencies — it is correctly identified as something to add (tracked as EXPO-006 in the traceability footer of 1A). |
| LMCD-RC-05-EXPO-007 | PARTIALLY | 1A §1.3 (runtimeVersion policy); 1A §1.5 (eas.json + dev workflow); 1A §1.6 (acceptance E) | `eas.json` development/preview profiles are now required deliverables (1A §1.5). The `runtimeVersion` policy is named (fingerprint example) in 1A §1.3. `expo-dev-client` is implied by the dev loop (`npm run android`/`npm run ios`) but is not named explicitly; the spec says "dev client" builds without listing `expo-dev-client` as a dependency to add. The acceptance criterion (§1.6) requires "spike green on both platforms; `expo prebuild --clean` reproducible" but does not state the acceptance criterion in the round-1 suggestion verbatim (successful EAS or local builds on physical iOS and Android devices with `fingerprint` or equivalent). The master §9 still lists "exact native server library + config-plugin" as a remaining open question rather than a resolved acceptance gate. Partial: the spirit is there, but `expo-dev-client` as an explicit package dependency and a hard runtimeVersion acceptance criterion (not just a choice-to-be-made) are still absent. |

---

## New issues (v2)

### LMCD-RC2-05-EXPO-001
**Severity:** high
**Section:** 1A §1.3 (web-bundle embedding pipeline) / 1A §1.5 (CI)
**Concern:** The spec mandates `expo export --platform web --output-dir dist-embedded` and copying the output into "a native asset/resource path via config plugin/build script," but does not name the mechanism by which the web bundle is made accessible inside the native binary at runtime. For Android, assets embedded via `android/app/src/main/assets/` are accessible via `AssetManager`; for iOS the equivalent is the main bundle. Neither path is automatically handled by Expo's CNG pipeline for arbitrary output directories — a custom config plugin must write the copy step into the `android/` and `ios/` Gradle/Xcode phases that CNG regenerates on every `expo prebuild --clean`. If the config plugin is misconfigured, `expo prebuild --clean` silently regenerates native projects without the web assets, breaking the embedded server at runtime with no build-time error. The spec says "verify the packaged APK/IPA contains it and the hash matches" but this verification step is QA/CI only, not a build-time guard.
**Recommendation:** The spike (1A §1.1 item 4) should include validating that `expo prebuild --clean` followed by a cold build still produces an APK/IPA that contains the embedded web assets — i.e., the config plugin handles the copy without manual steps. Add a build-time assertion (e.g., a Gradle task or an EAS build hook that fails if the asset manifest is missing from the output) so the breakage is caught at build time, not in QA.

### LMCD-RC2-05-EXPO-002
**Severity:** medium
**Section:** 1A §1.3; master §2 D6
**Concern:** The spec defers the decision between shipping web bundle changes via EAS Update vs binary release, referencing `runtimeVersion` policy and the `fingerprint` strategy as an example. However, the choice is not neutral for Phase 1A: the embedded web bundle is a native asset baked into the APK/IPA. If the team later adopts EAS Update (OTA), the OTA bundle and the baked bundle would diverge unless the serving logic checks for and prefers an OTA-downloaded copy. Expo's standard OTA mechanism delivers JS bundles to the React Native engine, not to the native HTTP server's static file directory — serving an OTA-updated web bundle from the embedded HTTP server would require an additional layer (copy OTA assets into the server-accessible directory after download, verify integrity, serve the updated copy). This interaction is not acknowledged in the current design. If this is not planned, `runtimeVersion: fingerprint` will correctly gate OTA updates to matching binaries, but binary releases become the only update path for the web bundle, which affects time-to-fix for web-client-visible bugs.
**Recommendation:** Explicitly decide in 1A §1.3: "Web bundle changes require a binary release" (simpler, correct for alpha) or "Web bundle changes can ship via EAS Update, and the embedded server's serving logic must prefer the OTA copy after download." The former is the safe default for Phase 1A. Document this as a constraint, not an open question, so it doesn't surface as a surprise when the first web-client bug needs to be patched without a full binary release.

### LMCD-RC2-05-EXPO-003
**Severity:** medium
**Section:** 1A §1.1 (mandatory spike) / master §2 D4
**Concern:** Decision D4 states "iOS hosting validated on dev-client only, public iOS host gated on signed TestFlight/EAS later." However, `expo-keep-awake` (required by 1A §1.4) and the embedded HTTP server library will both require native modules and therefore a development build even for guest-side testing on iOS. The current `package.json` has no `expo-dev-client` dependency, and `app.json` has no `expo-dev-client` plugin. Expo Go will not run custom native code. This means that iOS-side *guest* testing (not just host) also requires a dev-client build — a detail that could delay the Phase 1A "iOS app guest" acceptance criterion (§4 item 2) if the iOS dev-client build is not set up early. The spec treats iOS dev-client as a hosting concern only, but any native module added for the host (server library, keep-awake) will require all iOS participants to use dev-client builds, not Expo Go.
**Recommendation:** Add `expo-dev-client` to `package.json` and `app.json` plugins as part of the Phase 1A native host spike, and explicitly state that "Expo Go is not a valid test environment for any device (host or guest) once native modules are added." The 1A §1.5 note "Expo Go remains valid only for non-networking screens" is correct but understates the scope — any screen rendered in the same app binary will require the dev client.

---

## Bottom line

v2 is a substantial improvement over v1 for Expo/RN concerns. The five most critical issues (native host spike, foreground lifecycle, permissions/cleartext, web asset packaging pipeline, QR/camera) are all addressed explicitly and correctly scoped to Phase 1A. The EAS/runtimeVersion comment is partially addressed — the pieces are there but the acceptance criterion is not yet hard enough to be a blocking gate.

Three new medium-to-high issues emerge from the deeper v2 spec: (1) the web asset embedding path through CNG/config-plugin must be proven by the spike and guarded at build time, not only in QA; (2) the OTA-vs-binary decision for the embedded web bundle must be resolved explicitly, not left open; (3) `expo-dev-client` must be added as a Phase 1A deliverable affecting all iOS participants, not just the iOS host path.
