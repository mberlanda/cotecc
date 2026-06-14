#!/usr/bin/env bash
# Build a debug APK — fast, no signing config needed, sideloadable.
# Output: CoteccApp/android/app/build/outputs/apk/debug/app-debug.apk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleDebug --no-daemon
APK="$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo "Debug APK: $APK"
