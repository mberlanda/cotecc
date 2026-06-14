# Development — environment prerequisites

This file covers the **OS-level toolchain** needed for native iOS/Android
development. For all build/run/test/export commands, see the **Development**
section in the root [README](../README.md).

## Dependencies

https://reactnative.dev/docs/environment-setup?os=macos&platform=android&guide=native#installing-dependencies

- `brew install curl-openssl`
- node >= 22. It can be installed using `nvm` https://github.com/nvm-sh/nvm (see [`.nvmrc`](../.nvmrc))
- ruby >= 2.7 (CocoaPods, iOS). It can be installed using `rbenv` https://github.com/rbenv/rbenv
- watchman for watching changes in filesystem and improve performances `brew install watchman`
- **Java 17 (Temurin)** — install via [sdkman](https://sdkman.io/install) (recommended) or via `brew install --cask temurin`:
  ```bash
  curl -s "https://get.sdkman.io" | zsh   # install sdkman
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  sdk install java 17.0.11-tem
  sdk default java 17.0.11-tem
  ```
  To switch to Java 17 in the current shell session (if you have multiple versions):
  ```bash
  sdk use java 17.0.11-tem
  ```

- **Android SDK** (no full Android Studio required) — install the command-line tools via Homebrew, then fetch the required SDK packages:
  ```bash
  brew install --cask android-commandlinetools
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  mkdir -p "$ANDROID_HOME"
  sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "build-tools;35.0.0" "platforms;android-35" "ndk;27.1.12297006"
  yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
  ```
  Add `export ANDROID_HOME="$HOME/Library/Android/sdk"` to your `~/.zshrc` (or `~/.bashrc`) so it persists across sessions.

  > Note: brew installs the `sdkmanager` binary to `/opt/homebrew/bin/` but SDK *packages* must be installed into a separate `ANDROID_HOME` directory. The `--sdk_root` flag controls where packages land.

  Alternatively, install the full [Android Studio](https://developer.android.com/studio) which bundles the SDK automatically.

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

  To save time and disk, local builds compile native code for a single ABI,
  inferred automatically: a connected device/emulator's ABI if one is attached,
  otherwise the host architecture (`arm64-v8a` on Apple Silicon, `x86_64` on
  Intel). Override with `REACT_NATIVE_ARCHITECTURES`, e.g.
  `REACT_NATIVE_ARCHITECTURES="armeabi-v7a,arm64-v8a,x86,x86_64" tools/build-android-release.sh`
  to match CI's all-ABI build.

- xcode

```
xcode-select --install
sudo xcode-select --switch /Library/Developer/CommandLineTools
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

## Running on a device without the native SDK (Expo Go)

You can run on iOS or Android without the full native toolchain using Expo Go:

```
cd CoteccApp
npx expo start
```

Download Expo Go from the Play Store or App Store and scan the QR code. To
expose the dev server over the internet use `npx expo start --tunnel`.

> Note: Expo Go does not include custom native modules; for a full native build
> use `npm run ios` / `npm run android` (which run `expo prebuild` + the native
> toolchain). See the root README.

## Troubleshooting

### `LicenceNotAcceptedException: ndk;27.1.12297006`

```
com.android.builder.sdk.LicenceNotAcceptedException: Failed to install the following
Android SDK packages as some licences have not been accepted.
     ndk;27.1.12297006 NDK (Side by side) 27.1.12297006
```

This means the NDK package is **not installed** — Gradle is trying to auto-download it
but can't because no license file exists yet. Running `sdkmanager --licenses` alone only
accepts licenses for already-downloaded packages; a first-time install requires an explicit
`sdkmanager` call:

```bash
sdkmanager "ndk;27.1.12297006"
```

Type `y` at the license prompt, then re-run the build script.
