#!/usr/bin/env bash
# Build the static web bundle into CoteccApp/dist
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"

cd "$APP_DIR"
npm ci --silent
npx expo export --platform web --output-dir dist
echo "Web bundle written to $APP_DIR/dist"
