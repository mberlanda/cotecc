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

exit "$fail"
