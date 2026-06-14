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
