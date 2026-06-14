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
