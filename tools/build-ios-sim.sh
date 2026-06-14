#!/usr/bin/env bash
# Build the iOS app for the simulator (no code-signing required).
# Requires macOS + Xcode + CocoaPods.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform ios --no-install
cd ios
pod install
WS=$(ls -d *.xcworkspace)
SCHEME=$(basename "$WS" .xcworkspace)
echo "Building workspace=$WS scheme=$SCHEME"
xcodebuild \
  -workspace "$WS" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO \
  build
echo "Simulator build complete — derived data at $APP_DIR/ios/build"
