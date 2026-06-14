#!/usr/bin/env bash
# Build a release APK signed with the debug keystore (installable, matches CI).
# Self-bootstraps the Android toolchain (see tools/lib/android-env.sh).
# Output: CoteccApp/android/app/build/outputs/apk/release/app-release.apk
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

cd android
./gradlew assembleRelease --no-daemon
APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo "Release APK (debug-signed): $APK"
