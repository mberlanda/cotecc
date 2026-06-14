#!/usr/bin/env bash
# Sourced helper for Android build provisioning. Defines functions only.
# Callers own `set -euo pipefail`.

# gradle_ext_value <key> <gradle-file>
# Extracts a value from a Gradle `ext { key = ... }` line: prefers the last
# quoted token (e.g. ndkVersion = "27.1.12297006" -> 27.1.12297006), otherwise
# the trailing integer (e.g. compileSdkVersion = ... ?: '35' -> 35). Empty if absent.
gradle_ext_value() {
  local key="$1" file="$2" line quoted
  [ -f "$file" ] || return 0
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$file" | head -1)" || return 0
  [ -n "$line" ] || return 0
  quoted="$(printf '%s' "$line" | grep -oE "['\"][^'\"]+['\"]" | tail -1 | tr -d "\"'")"
  if [ -n "$quoted" ]; then
    printf '%s' "$quoted"
    return 0
  fi
  printf '%s' "$line" | grep -oE '[0-9]+' | tail -1
}

# java_major_version: reads `java -version` output on stdin, prints major version
# (8 for 1.8.x, 17 for 17.x). Empty if unparseable.
java_major_version() {
  local v
  v="$(grep -oE '"[0-9._]+"' | head -1 | tr -d '"')" || return 0
  [ -n "$v" ] || return 0
  if [[ "$v" == 1.* ]]; then
    printf '%s' "$v" | cut -d. -f2
  else
    printf '%s' "$v" | cut -d. -f1
  fi
}

# ensure_java: guarantee a JDK 17 is on PATH / JAVA_HOME. Exits non-zero with
# guidance if none can be found.
ensure_java() {
  local candidate=""
  # 1) existing java on PATH, if it is 17
  if command -v java >/dev/null 2>&1; then
    if [ "$(java -version 2>&1 | java_major_version)" = "17" ]; then
      return 0
    fi
  fi
  # 2) sdkman current
  if [ -x "$HOME/.sdkman/candidates/java/current/bin/java" ]; then
    candidate="$HOME/.sdkman/candidates/java/current"
  # 3) macOS java_home
  elif /usr/libexec/java_home -v 17 >/dev/null 2>&1; then
    candidate="$(/usr/libexec/java_home -v 17)"
  fi
  if [ -z "$candidate" ]; then
    echo "ERROR: no JDK 17 found. Install via sdkman:" >&2
    echo "  sdk install java 17.0.11-tem" >&2
    echo "See doc/DEVELOPMENT.md." >&2
    return 1
  fi
  export JAVA_HOME="$candidate"
  export PATH="$JAVA_HOME/bin:$PATH"
  if [ "$(java -version 2>&1 | java_major_version)" != "17" ]; then
    echo "ERROR: resolved JAVA_HOME=$JAVA_HOME is not JDK 17." >&2
    return 1
  fi
}

# _sdk_install_if_missing <pkg> <dir-under-ANDROID_HOME>
# Installs an sdkmanager package only if it is not already fully installed
# (idempotent). Completion is detected via the `source.properties` marker that
# sdkmanager writes to every installed package — a bare directory can be a
# partial/interrupted install (e.g. a download aborted on low disk) and must be
# retried, not skipped.
_sdk_install_if_missing() {
  local pkg="$1" dir="$2"
  if [ -f "$ANDROID_HOME/$dir/source.properties" ]; then
    return 0
  fi
  echo "Installing $pkg ..."
  # `yes` is killed by SIGPIPE once sdkmanager stops reading; `|| true` keeps that
  # from tripping `set -o pipefail`, while sdkmanager's own exit status still
  # propagates as the rightmost command in the pipeline.
  { yes || true; } | sdkmanager --sdk_root="$ANDROID_HOME" "$pkg" >/dev/null
}

# ensure_android_sdk: set ANDROID_HOME, install required packages, accept licenses.
# Versions default to documented values but, if a generated android/build.gradle
# is present, are overridden by what Gradle actually requires (drift-proof).
ensure_android_sdk() {
  : "${ANDROID_HOME:=$HOME/Library/Android/sdk}"
  export ANDROID_HOME
  mkdir -p "$ANDROID_HOME"

  if ! command -v sdkmanager >/dev/null 2>&1; then
    echo "ERROR: sdkmanager not found. Install the command-line tools:" >&2
    echo "  brew install --cask android-commandlinetools" >&2
    echo "See doc/DEVELOPMENT.md." >&2
    return 1
  fi

  local build_tools="35.0.0" platform="35" ndk="27.1.12297006" gradle_file="${1:-}"
  if [ -n "${gradle_file:-}" ] && [ -f "$gradle_file" ]; then
    build_tools="$(gradle_ext_value buildToolsVersion "$gradle_file")"; build_tools="${build_tools:-35.0.0}"
    platform="$(gradle_ext_value compileSdkVersion "$gradle_file")"; platform="${platform:-35}"
    ndk="$(gradle_ext_value ndkVersion "$gradle_file")"; ndk="${ndk:-27.1.12297006}"
  fi

  _sdk_install_if_missing "platform-tools"            "platform-tools"
  _sdk_install_if_missing "build-tools;$build_tools"  "build-tools/$build_tools"
  _sdk_install_if_missing "platforms;android-$platform" "platforms/android-$platform"
  _sdk_install_if_missing "ndk;$ndk"                  "ndk/$ndk"

  yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses >/dev/null 2>&1 || true
}

# Minimum Node version. Matches the project's declared requirement
# (CoteccApp/package.json `engines.node` >= 22.13.0, root .nvmrc 22). Node 18
# also breaks the release JS bundle, which uses Array.prototype.toReversed
# (added in Node 20).
NODE_MIN_VERSION="22.13.0"

# _node_version_ok <vstring>: true if a node version (e.g. "v22.15.0" or
# "20.19.4") is >= NODE_MIN_VERSION.
_node_version_ok() {
  local v="${1#v}"
  [ -n "$v" ] || return 1
  [ "$(printf '%s\n%s\n' "$NODE_MIN_VERSION" "$v" | sort -V | head -1)" = "$NODE_MIN_VERSION" ]
}

# ensure_node: guarantee `node` on PATH is >= NODE_MIN_VERSION. Uses the active
# node if new enough; otherwise activates the highest compatible version via nvm
# (honoring .nvmrc first). Exits non-zero with guidance if none is available.
ensure_node() {
  if command -v node >/dev/null 2>&1 && _node_version_ok "$(node -v 2>/dev/null)"; then
    return 0
  fi
  local nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$nvm_sh" ]; then
    # shellcheck source=/dev/null
    . "$nvm_sh" >/dev/null 2>&1 || true
    [ -f .nvmrc ] && nvm use >/dev/null 2>&1 || true
    if ! _node_version_ok "$(node -v 2>/dev/null)"; then
      local v best=""
      for v in $(nvm ls --no-colors 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | sort -V); do
        _node_version_ok "$v" && best="$v"
      done
      [ -n "$best" ] && nvm use "$best" >/dev/null 2>&1 || true
    fi
  fi
  if command -v node >/dev/null 2>&1 && _node_version_ok "$(node -v 2>/dev/null)"; then
    return 0
  fi
  echo "ERROR: Node >= $NODE_MIN_VERSION required (found $(node -v 2>/dev/null || echo none))." >&2
  echo "  Install/activate a compatible version, e.g.: nvm install 22 && nvm use 22" >&2
  return 1
}

# _abi_for_host_arch <uname-m>: map a host machine architecture to the matching
# Android ABI (what an emulator/device on that host typically uses).
_abi_for_host_arch() {
  case "$1" in
    arm64|aarch64) printf 'arm64-v8a' ;;
    x86_64|amd64)  printf 'x86_64' ;;
    *)             printf 'arm64-v8a' ;;
  esac
}

# default_android_abi: choose which ABI(s) to build for, best signal first:
#   1. explicit REACT_NATIVE_ARCHITECTURES override
#   2. a connected device/emulator's own ABI (build exactly what will run it)
#   3. the host architecture (arm64 -> arm64-v8a, x86_64 -> x86_64)
# Local builds target one ABI to save time/disk; CI builds all of them.
default_android_abi() {
  if [ -n "${REACT_NATIVE_ARCHITECTURES:-}" ]; then
    printf '%s' "$REACT_NATIVE_ARCHITECTURES"
    return 0
  fi
  local adb="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb" abi=""
  if [ -x "$adb" ]; then
    abi="$("$adb" shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r\n')"
  fi
  if [ -n "$abi" ]; then
    printf '%s' "$abi"
  else
    _abi_for_host_arch "$(uname -m)"
  fi
}
