#!/usr/bin/env bash
# Plain-bash unit tests for android-env.sh (no external test framework needed).
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=/dev/null
source "$DIR/android-env.sh"

FIXTURE="$DIR/__fixtures__/build.gradle.sample"
fail=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "ok   - $desc"
  else
    echo "FAIL - $desc: expected '$expected', got '$actual'"
    fail=1
  fi
}

check "ndkVersion (quoted)"        "27.1.12297006" "$(gradle_ext_value ndkVersion "$FIXTURE")"
check "buildToolsVersion (quoted)" "35.0.0"        "$(gradle_ext_value buildToolsVersion "$FIXTURE")"
check "compileSdkVersion (int)"    "35"            "$(gradle_ext_value compileSdkVersion "$FIXTURE")"
check "missing key -> empty"       ""              "$(gradle_ext_value nopeVersion "$FIXTURE")"

# java_major_version parses `java -version` style output (handles 1.8 and 17).
check "java major from 17.0.11" "17" "$(printf 'openjdk version "17.0.11" 2024-04-16\n' | java_major_version)"
check "java major from 1.8.0"   "8"  "$(printf 'java version "1.8.0_392"\n' | java_major_version)"

# _sdk_install_if_missing skips fully-installed packages (source.properties present)
# but retries partial installs (directory exists but marker is missing). A stub
# sdkmanager records whether an install was attempted. The stub does not read
# stdin, so the `{ yes || true; }` writer simply gets SIGPIPE — no hang.
SDK_HOME="$(mktemp -d)"
export ANDROID_HOME="$SDK_HOME"
sdkmanager() { : > "$ANDROID_HOME/.install_attempted"; }
attempted() { [ -e "$ANDROID_HOME/.install_attempted" ] && echo yes || echo no; }

mkdir -p "$SDK_HOME/platform-tools"
printf 'Pkg.Revision=35.0.0\n' > "$SDK_HOME/platform-tools/source.properties"
rm -f "$SDK_HOME/.install_attempted"
_sdk_install_if_missing "platform-tools" "platform-tools" >/dev/null
check "skip fully-installed package" "no" "$(attempted)"

mkdir -p "$SDK_HOME/ndk/27.1.12297006/.installer"   # partial: no source.properties
rm -f "$SDK_HOME/.install_attempted"
_sdk_install_if_missing "ndk;27.1.12297006" "ndk/27.1.12297006" >/dev/null
check "retry partial install" "yes" "$(attempted)"

unset -f sdkmanager
rm -rf "$SDK_HOME"

# _abi_for_host_arch maps host machine arch to an Android ABI.
check "host arm64 -> arm64-v8a"  "arm64-v8a" "$(_abi_for_host_arch arm64)"
check "host aarch64 -> arm64-v8a" "arm64-v8a" "$(_abi_for_host_arch aarch64)"
check "host x86_64 -> x86_64"    "x86_64"    "$(_abi_for_host_arch x86_64)"
check "host unknown -> arm64-v8a" "arm64-v8a" "$(_abi_for_host_arch sparc)"

# default_android_abi honors an explicit override.
check "abi override honored" "x86,x86_64" "$(REACT_NATIVE_ARCHITECTURES='x86,x86_64' default_android_abi)"

exit "$fail"
