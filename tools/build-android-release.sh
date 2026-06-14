#!/usr/bin/env bash
# Build a release APK signed with the debug keystore (installable, matches CI).
# Output: CoteccApp/android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease --no-daemon
APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo "Release APK (debug-signed): $APK"
