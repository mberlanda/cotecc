#!/usr/bin/env bash
# Build a debug APK — fast, no signing config needed, sideloadable.
# Self-bootstraps the Android toolchain (see tools/lib/android-env.sh).
# Output: CoteccApp/android/app/build/outputs/apk/debug/app-debug.apk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/android-env.sh"

ensure_java

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform android --no-install

ensure_android_sdk "$APP_DIR/android/build.gradle"

# Build native code for a single inferred ABI to save time and disk (CI builds
# all of them). Override with REACT_NATIVE_ARCHITECTURES, e.g. "x86_64" for an
# Intel emulator or "armeabi-v7a,arm64-v8a,x86,x86_64" to match CI.
ABIS="$(default_android_abi)"

cd android
./gradlew assembleDebug --no-daemon -PreactNativeArchitectures="$ABIS"
APK="$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo "Debug APK ($ABIS): $APK"
