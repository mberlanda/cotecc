# Reproducible Local Android Builds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tools/build-android-{debug,release}.sh` succeed from a fresh/unprovisioned macOS checkout by self-bootstrapping Java, the Android SDK/NDK, and licenses.

**Architecture:** One sourced helper (`tools/lib/android-env.sh`) exposes `ensure_java` and `ensure_android_sdk`; required SDK/build-tools/NDK versions are read from the generated `android/build.gradle` after prebuild (with documented fallbacks). A standalone `tools/setup-android.sh` and both build scripts reuse the helper.

**Tech Stack:** Bash, sdkman (Temurin 17), Android command-line tools (`sdkmanager`), Expo prebuild, Gradle.

---

## File Structure

- Create: `tools/lib/android-env.sh` — sourced helper: `ensure_java`, `ensure_android_sdk`, `gradle_ext_value`.
- Create: `tools/setup-android.sh` — standalone one-time provisioning (sources helper).
- Create: `tools/lib/__fixtures__/build.gradle.sample` — fixture for testing `gradle_ext_value`.
- Create: `tools/lib/android-env.test.sh` — plain-bash unit tests for the parser/resolver (no bats dependency).
- Modify: `tools/build-android-debug.sh` — source helper, drop the no-op `sdkmanager --licenses` block.
- Modify: `tools/build-android-release.sh` — same as debug.
- Modify: `doc/DEVELOPMENT.md` — point at `tools/setup-android.sh`, note self-bootstrap.

Conventions: scripts start with `#!/usr/bin/env bash` and `set -euo pipefail` (matching existing tools). The sourced helper does NOT call `set -e` at top level (it defines functions only); callers own `set -euo pipefail`.

---

## Task 1: Gradle ext value parser

**Files:**
- Create: `tools/lib/android-env.sh`
- Create: `tools/lib/__fixtures__/build.gradle.sample`
- Create: `tools/lib/android-env.test.sh`

- [ ] **Step 1: Write the fixture mimicking Expo's generated ext block**

Create `tools/lib/__fixtures__/build.gradle.sample`:

```gradle
buildscript {
    ext {
        buildToolsVersion = findProperty('android.buildToolsVersion') ?: '35.0.0'
        minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '24')
        compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '35')
        targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '35')
        ndkVersion = "27.1.12297006"
    }
}
```

- [ ] **Step 2: Write the failing test**

Create `tools/lib/android-env.test.sh`:

```bash
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

exit "$fail"
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `bash tools/lib/android-env.test.sh`
Expected: FAIL — `android-env.sh` does not exist / `gradle_ext_value` not found.

- [ ] **Step 4: Implement `gradle_ext_value`**

Create `tools/lib/android-env.sh`:

```bash
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
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `bash tools/lib/android-env.test.sh`
Expected: all four lines start with `ok` and exit code 0.

- [ ] **Step 6: Commit**

```bash
chmod +x tools/lib/android-env.test.sh
git add tools/lib/android-env.sh tools/lib/__fixtures__/build.gradle.sample tools/lib/android-env.test.sh
git commit -m "feat(tools): add gradle ext value parser for android-env helper"
```

---

## Task 2: `ensure_java`

**Files:**
- Modify: `tools/lib/android-env.sh`
- Modify: `tools/lib/android-env.test.sh`

- [ ] **Step 1: Add a test for the version check helper**

The hard part to unit-test without a clean machine is `java_major_version`. Add this near the other `check` calls in `tools/lib/android-env.test.sh`, before `exit "$fail"`:

```bash
# java_major_version parses `java -version` style output (handles 1.8 and 17).
check "java major from 17.0.11" "17" "$(printf 'openjdk version "17.0.11" 2024-04-16\n' | java_major_version)"
check "java major from 1.8.0"   "8"  "$(printf 'java version "1.8.0_392"\n' | java_major_version)"
```

- [ ] **Step 2: Run the test, verify the new cases fail**

Run: `bash tools/lib/android-env.test.sh`
Expected: the two new lines FAIL (`java_major_version` not found); earlier `gradle_ext_value` lines still `ok`.

- [ ] **Step 3: Implement `java_major_version` and `ensure_java`**

Append to `tools/lib/android-env.sh`:

```bash
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
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `bash tools/lib/android-env.test.sh`
Expected: all `ok`, exit 0.

- [ ] **Step 5: Smoke-test `ensure_java` on this machine**

Run: `bash -c 'set -euo pipefail; source tools/lib/android-env.sh; ensure_java; echo "JAVA_HOME=$JAVA_HOME"; java -version'`
Expected: prints `JAVA_HOME=.../.sdkman/candidates/java/current` and `openjdk version "17.0.11"`.

- [ ] **Step 6: Commit**

```bash
git add tools/lib/android-env.sh tools/lib/android-env.test.sh
git commit -m "feat(tools): add ensure_java to android-env helper"
```

---

## Task 3: `ensure_android_sdk`

**Files:**
- Modify: `tools/lib/android-env.sh`

This installs packages and mutates `~/Library/Android/sdk`; it is verified by smoke-test + the end-to-end build (Task 6) rather than a pure unit test.

- [ ] **Step 1: Implement `ensure_android_sdk`**

Append to `tools/lib/android-env.sh`:

```bash
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
```

- [ ] **Step 2: Re-run the unit test to confirm nothing regressed**

Run: `bash tools/lib/android-env.test.sh`
Expected: all `ok`, exit 0 (the new functions are not exercised but sourcing must still succeed).

- [ ] **Step 3: Smoke-test argument-less defaults parse correctly (no install)**

Run: `bash -c 'set -euo pipefail; source tools/lib/android-env.sh; ANDROID_HOME=$(mktemp -d); export ANDROID_HOME; declare -f ensure_android_sdk >/dev/null && echo "defined ok"'`
Expected: prints `defined ok` (verifies the function sources cleanly).

- [ ] **Step 4: Commit**

```bash
git add tools/lib/android-env.sh
git commit -m "feat(tools): add ensure_android_sdk to android-env helper"
```

---

## Task 4: Standalone `tools/setup-android.sh`

**Files:**
- Create: `tools/setup-android.sh`

- [ ] **Step 1: Create the script**

```bash
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
```

- [ ] **Step 2: Make executable and verify it sources cleanly (dry, no install)**

Run: `chmod +x tools/setup-android.sh && bash -n tools/setup-android.sh && echo "syntax ok"`
Expected: prints `syntax ok`.

- [ ] **Step 3: Commit**

```bash
git add tools/setup-android.sh
git commit -m "feat(tools): add idempotent setup-android.sh provisioning script"
```

---

## Task 5: Wire build scripts to the helper

**Files:**
- Modify: `tools/build-android-debug.sh`
- Modify: `tools/build-android-release.sh`

- [ ] **Step 1: Rewrite `tools/build-android-debug.sh`**

Replace the whole file with:

```bash
#!/usr/bin/env bash
# Build a debug APK — fast, no signing config needed, sideloadable.
# Self-bootstraps the Android toolchain (see tools/lib/android-env.sh).
# Output: CoteccApp/android/app/build/outputs/apk/debug/app-debug.apk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/android-env.sh"

ensure_java

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform android --no-install

ensure_android_sdk "$APP_DIR/android/build.gradle"

cd android
./gradlew assembleDebug --no-daemon
APK="$APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo "Debug APK: $APK"
```

- [ ] **Step 2: Rewrite `tools/build-android-release.sh`**

Replace the whole file with:

```bash
#!/usr/bin/env bash
# Build a release APK signed with the debug keystore (installable, matches CI).
# Self-bootstraps the Android toolchain (see tools/lib/android-env.sh).
# Output: CoteccApp/android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/../CoteccApp"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/lib/android-env.sh"

ensure_java

cd "$APP_DIR"
npm ci --silent
npx expo prebuild --platform android --no-install

ensure_android_sdk "$APP_DIR/android/build.gradle"

cd android
./gradlew assembleRelease --no-daemon
APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
echo "Release APK (debug-signed): $APK"
```

- [ ] **Step 3: Syntax-check both scripts**

Run: `bash -n tools/build-android-debug.sh && bash -n tools/build-android-release.sh && echo "syntax ok"`
Expected: prints `syntax ok`.

- [ ] **Step 4: Commit**

```bash
git add tools/build-android-debug.sh tools/build-android-release.sh
git commit -m "feat(tools): self-bootstrap android toolchain in build scripts"
```

---

## Task 6: End-to-end verification (the real proof)

**Files:** none (verification only)

- [ ] **Step 1: Run the debug build from the current unprovisioned state**

Run: `time tools/build-android-debug.sh 2>&1 | tee /tmp/android-debug-build.log`
Expected: SDK/NDK download messages, Gradle `BUILD SUCCESSFUL`, final line `Debug APK: .../app-debug.apk`. This is slow (first run downloads the SDK + NDK).

- [ ] **Step 2: Confirm the APK exists**

Run: `ls -la CoteccApp/android/app/build/outputs/apk/debug/app-debug.apk`
Expected: file exists, non-zero size.

- [ ] **Step 3: Prove idempotency — second run does no re-provisioning**

Run: `tools/build-android-debug.sh 2>&1 | grep -c "Installing " || true`
Expected: `0` (no "Installing ..." lines — packages already present).

- [ ] **Step 4: (Optional, slower) verify release build**

Run: `tools/build-android-release.sh && ls -la CoteccApp/android/app/build/outputs/apk/release/app-release.apk`
Expected: `BUILD SUCCESSFUL` and the release APK exists.

---

## Task 7: Update DEVELOPMENT.md

**Files:**
- Modify: `doc/DEVELOPMENT.md`

- [ ] **Step 1: Add a setup pointer**

After the Android SDK install bullet (the `brew install --cask android-commandlinetools` block), add:

```markdown
- **One-step toolchain setup** — once `sdkman` and the command-line tools are
  installed, run the idempotent provisioning script instead of the manual
  `sdkmanager` commands above:
  ```bash
  tools/setup-android.sh
  ```
  The build scripts (`tools/build-android-debug.sh`, `tools/build-android-release.sh`)
  also self-bootstrap: they resolve JDK 17, install the required SDK/NDK packages
  (versions read from the generated `android/build.gradle`), and accept licenses
  automatically.
```

- [ ] **Step 2: Commit**

```bash
git add doc/DEVELOPMENT.md
git commit -m "docs: document setup-android.sh and self-bootstrapping builds"
```

---

## Self-Review Notes

- **Spec coverage:** ensure_java (Task 2), ensure_android_sdk + version derivation (Tasks 1+3), setup-android.sh (Task 4), build script wiring + removal of no-op licenses block (Task 5), error handling with install guidance (Tasks 2–3), reproducibility/idempotency proof (Task 6 Step 3), docs (Task 7). All spec sections mapped.
- **Type/name consistency:** `gradle_ext_value`, `java_major_version`, `ensure_java`, `ensure_android_sdk`, `_sdk_install_if_missing` used identically across tasks; `ensure_android_sdk` takes one arg (gradle file path, may be empty) everywhere.
- **No placeholders:** every code step contains full content.
