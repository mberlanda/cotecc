# Review Comments: 05 expo-react-native-expert

## Reviewer Scope
Read-only Expo SDK 56 / React Native review of the local multiplayer design, validating native-runtime, CNG/prebuild, permissions, lifecycle/backgrounding, and EAS assumptions against the repo config and current Expo/platform docs.

## Overall Verdict
The Phase 1 direction is feasible in principle, but the design is not yet implementation-ready for Expo SDK 56 because the native host server, permissions, foreground lifecycle, bundled web asset pipeline, and EAS/runtime-version implications need to be promoted from open questions into explicit Phase 1 requirements.

## Comments

- `Comment ID:` `LMCD-RC-05-EXPO-001`
  `Severity:` high
  `Section:` `## 12. Platform implementation realities (what each choice costs)`, lines 466-472
  `Issue:` The embedded HTTP/WebSocket host is treated as a small native detail, but it is the core native-runtime risk for Phase 1.
  `Rationale:` The repo is CNG with no committed `ios/` or `android/`, and `app.json` currently has only `expo-router` and splash plugins; Expo requires a development build/custom native code path for native libraries not in Expo Go ([Expo custom native code](https://docs.expo.dev/workflow/customizing/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/)).
  `Suggested Change:` Add text: “Phase 1 is blocked until we select either a maintained SDK 56/RN 0.85-compatible server library or a local Expo Module, add any required config plugin, and prove `expo prebuild` plus iOS/Android development builds on real devices.”

- `Comment ID:` `LMCD-RC-05-EXPO-002`
  `Severity:` high
  `Section:` `## 9. Decision block G — Resilience (incremental)` and `## 12. Platform implementation realities (what each choice costs)`
  `Issue:` The design omits the mobile app foreground/background lifecycle for the device acting as host.
  `Rationale:` A phone-hosted socket server cannot be assumed to survive lock, app switch, OS suspension, incoming calls, or process death; `expo-keep-awake` can prevent screen sleep while foregrounded but is not a general background server solution ([Expo KeepAwake](https://docs.expo.dev/versions/latest/sdk/keep-awake/)).
  `Suggested Change:` Add a lifecycle subsection: “Phase 1 hosting is foreground-only; use `expo-keep-awake`, warn the host to keep the app open/unlocked, handle `AppState` transitions by pausing or terminating the table cleanly, and treat background/lock as a reconnect or host-loss path.”

- `Comment ID:` `LMCD-RC-05-EXPO-003`
  `Severity:` high
  `Section:` `## 12. Platform implementation realities (what each choice costs)`, lines 473-477
  `Issue:` The permissions section is too narrow and does not cover cleartext LAN HTTP/WebSocket requirements for native app clients.
  `Rationale:` Browser same-origin `http`/`ws` does not solve native app transport policy; Android 9+ disables cleartext by default unless opted in ([Android network security config](https://developer.android.com/privacy-and-security/security-config)), iOS needs local-network purpose strings and Bonjour service declarations when used, and Expo CNG changes belong in `ios.infoPlist`, `android.permissions`, and/or config plugins ([Expo app config](https://docs.expo.dev/versions/latest/config/app/), [Apple local network FAQ](https://developer.apple.com/forums/thread/663874)).
  `Suggested Change:` Add a platform matrix listing iOS `NSLocalNetworkUsageDescription`, `NSBonjourServices` when mDNS is used, ATS/local-network cleartext handling for native clients, Android `INTERNET`/cleartext network security config, and Wi-Fi/hotspot-specific permissions.

- `Comment ID:` `LMCD-RC-05-EXPO-004`
  `Severity:` medium
  `Section:` `### Tier 1 — Browser join-only (recommended target)` and `## 13. Recommended phased roadmap`
  `Issue:` “Serves the React web bundle itself” lacks a concrete Expo build and packaging path.
  `Rationale:` The repo uses Expo Router with `web.output: "single"`, which is compatible with SPA export, but the native app still needs an EAS/prebuild step to generate, package, locate, and serve `dist` assets with correct MIME types and index fallback; updates also need runtime compatibility planning ([Expo web output](https://docs.expo.dev/versions/latest/config/app/), [EAS runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)).
  `Suggested Change:` Add a Phase 1 deliverable: “Create a prebuild/EAS build step that runs `expo export --platform web`, packages the output into native app resources or update-bundled assets, serves static files with MIME types and SPA fallback, and defines whether web bundle changes ship via EAS Update or binary release.”

- `Comment ID:` `LMCD-RC-05-EXPO-005`
  `Severity:` medium
  `Section:` `### A2. No-router: one device becomes the access point (hotspot / tethering)` and `## 10. Decision block H — Captive / isolated / hostile networks`
  `Issue:` The Android hotspot path overstates “one tap” and “auto-join” behavior.
  `Rationale:` `LocalOnlyHotspot` credentials are app-provided, joining from another device is user-mediated, and Android requires API-level-specific permissions such as `CHANGE_WIFI_STATE` plus `NEARBY_WIFI_DEVICES` on Android 13+ or location on older targets; the hotspot can also stop unexpectedly ([Android WifiManager](https://developer.android.com/reference/android/net/wifi/WifiManager#startLocalOnlyHotspot(android.net.wifi.WifiManager.LocalOnlyHotspotCallback,%20android.os.Handler))).
  `Suggested Change:` Replace “guests auto-join” with “guests are guided to join via OS Wi-Fi QR/manual flow,” and add permission, unsupported-device, failure-code, and hotspot-stopped handling to the fallback requirements.

- `Comment ID:` `LMCD-RC-05-EXPO-006`
  `Severity:` medium
  `Section:` `## 7. Decision block E — Discovery & pairing UX`
  `Issue:` Native app QR scanning is listed as primary UX without documenting the Expo dependency and camera permissions.
  `Rationale:` Browser users can scan with the OS camera, but installed iOS/Android app guests need an in-app scanner such as `expo-camera`, its config plugin, `NSCameraUsageDescription`, and Android camera permission; the repo does not currently include `expo-camera` ([Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)).
  `Suggested Change:` Add text: “Native QR join requires `expo-camera` with barcode scanning enabled, camera permission copy in app config, denial handling, and manual IP/code entry as the no-camera fallback.”

- `Comment ID:` `LMCD-RC-05-EXPO-007`
  `Severity:` medium
  `Section:` `## 14. Open questions / things to validate before Phase 1`
  `Issue:` EAS build readiness is left as a validation note instead of an acceptance criterion.
  `Rationale:` The repo has an EAS project id but no `eas.json` in `CoteccApp`, and Phase 1 adds native code, permissions, and possibly bundled native assets that require development/preview binaries and runtime-version discipline rather than JS-only updates ([EAS Build](https://docs.expo.dev/build/introduction/), [EAS runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)).
  `Suggested Change:` Add: “Phase 1 acceptance requires `eas.json` development/preview profiles, `expo-dev-client` or equivalent development-build workflow, runtimeVersion policy such as `fingerprint`, and successful EAS or local builds on physical iOS and Android devices.”

## Consolidation Notes
Likely overlap with native-platform reviewers on iOS Local Network, Android hotspot, and background execution; this review frames those as Expo CNG/app-config/EAS requirements rather than Swift/Kotlin implementation detail.
