#!/usr/bin/env bash
# One-time (idempotent) provisioning of the local Android toolchain:
# resolves JDK 17, installs the Android SDK/NDK, and accepts licenses.
# Safe to re-run. The build scripts call the same helper automatically.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/android-env.sh"

ensure_java
# No generated gradle yet at setup time -> documented fallback versions.
ensure_android_sdk ""

echo "Android toolchain ready:"
echo "  JAVA_HOME=$JAVA_HOME"
echo "  ANDROID_HOME=$ANDROID_HOME"
