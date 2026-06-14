# Reproducible local Android builds — design

**Date:** 2026-06-14
**Status:** Approved

## Problem

`tools/build-android-release.sh` (and `build-android-debug.sh`) fail on a fresh
or partially-configured machine. Root causes, confirmed on the current host:

1. **Java not available to the script.** sdkman has Temurin 17 installed
   (`~/.sdkman/candidates/java/current` → `17.0.11-tem`), but the build scripts
   run via `#!/usr/bin/env bash` and never source sdkman's init, so `java` is not
   on PATH. `/usr/libexec/java_home -v 17` finds nothing — sdkman is the only JDK.
2. **Android SDK packages not installed.** `sdkmanager` exists (Homebrew) but
   `ANDROID_HOME` is unset and `~/Library/Android/sdk` does not exist. No
   platform-tools, build-tools, platform, or NDK are present.
3. **Licenses / NDK.** Gradle needs `ndk;27.1.12297006` (via
   `rootProject.ext.ndkVersion` in `android/app/build.gradle`) and auto-download
   fails because the license was never accepted. The current scripts run
   `sdkmanager --licenses`, which is a no-op when nothing is downloaded yet.

CI does not hit these because GitHub runners ship the SDK and use
`actions/setup-java`.

## Goal

A fresh checkout + a single script produces an installable APK with **zero manual
SDK steps**, matching CI output. Re-runs are safe no-ops (idempotent).

Decision (approved): **self-bootstrapping** scripts — they resolve Java, install
missing SDK/NDK packages, and accept licenses automatically.

## Architecture

One shared, sourced helper reused by a standalone setup script and both build
scripts (DRY; each piece has a single purpose).

### `tools/lib/android-env.sh` (sourced, not executed)

- `ensure_java`
  - Resolve a JDK **17** in order: existing `java` on PATH if it reports 17 →
    `~/.sdkman/candidates/java/current` (export `JAVA_HOME`, prepend
    `$JAVA_HOME/bin` to PATH) → `/usr/libexec/java_home -v 17`.
  - Verify the resolved runtime is major version 17 (AGP/Gradle requirement).
  - If none found: fail fast with the exact sdkman install command.
- `ensure_android_sdk`
  - Default `ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}`, export it,
    `mkdir -p`.
  - Require `sdkmanager` on PATH; if absent, fail with the
    `brew install --cask android-commandlinetools` command.
  - Install **only missing** packages via `sdkmanager --sdk_root="$ANDROID_HOME"`:
    `platform-tools`, plus the platform / build-tools / NDK versions resolved as
    described below. Skip the (slow) install call when the package directory
    already exists.
  - Accept licenses: `yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses`
    (harmless to re-run).

### NDK / build-tools version resolution (drift-proof)

Versions are read from the **generated** Gradle config after prebuild rather than
hardcoded, so they stay correct across Expo SDK upgrades:

- After `expo prebuild`, parse `ndkVersion` and `buildToolsVersion` (and
  `compileSdkVersion`) from `CoteccApp/android/build.gradle` (the generated
  `rootProject.ext` block).
- Fall back to the documented defaults if a value can't be parsed:
  `build-tools;35.0.0`, `platforms;android-35`, `ndk;27.1.12297006`.

This reorders setup so SDK/NDK package install runs **after** prebuild (prebuild
only needs Node, not the Android SDK; only `gradlew` needs the SDK).

### `tools/setup-android.sh` (standalone executable)

Sources the lib and runs `ensure_java` then `ensure_android_sdk` (using fallback
versions, since it may run before any prebuild). Lets a developer provision the
toolchain once, explicitly.

### `tools/build-android-{debug,release}.sh`

Flow:
1. source `tools/lib/android-env.sh`; `ensure_java`
2. `npm ci`
3. `npx expo prebuild --platform android --no-install`
4. `ensure_android_sdk` (now with versions derived from generated gradle)
5. `cd android && ./gradlew assemble{Debug,Release} --no-daemon`

Remove the current inline `sdkmanager --licenses` block (no-op, replaced by the
helper).

## Error handling

`set -euo pipefail` throughout. Each `ensure_*` fails fast with a single-line
message naming the missing tool and the exact command to install it (sdkman /
brew). No partial silent failures.

## Reproducibility & idempotency

- Missing packages are installed; present packages are skipped.
- License acceptance and `mkdir -p` are safe to repeat.
- A second run of a build script does no provisioning work beyond version checks.

## Documentation

Update `doc/DEVELOPMENT.md`: point developers at `tools/setup-android.sh` for
one-time provisioning and note the build scripts self-bootstrap. Keep the
manual command reference and the NDK troubleshooting note.

## Verification

Run `tools/build-android-debug.sh` end-to-end from the current (unprovisioned)
state and confirm `CoteccApp/android/app/build/outputs/apk/debug/app-debug.apk`
is produced. This is slow (real SDK download + Gradle build) but is the actual
proof the reproducible path works.
