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
# Installs an sdkmanager package only if its directory is absent (idempotent).
_sdk_install_if_missing() {
  local pkg="$1" dir="$2"
  if [ -d "$ANDROID_HOME/$dir" ]; then
    return 0
  fi
  echo "Installing $pkg ..."
  yes | sdkmanager --sdk_root="$ANDROID_HOME" "$pkg" >/dev/null
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

  local build_tools="35.0.0" platform="35" ndk="27.1.12297006" gradle_file="$1"
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
