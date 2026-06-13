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
- openjdk (recommended `zulu17` compatible with both arm and amd architecture). It can be installed via `sdkman` https://sdkman.io/install or via brew

- android studio
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
