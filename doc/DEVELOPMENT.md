# Development

The purpose of the file is to keep track of the step by step
istructions adopted.


Dependecies:

https://reactnative.dev/docs/environment-setup?os=macos&platform=android&guide=native#installing-dependencies

* `brew install curl-openssl`
* node >= 18. It can be installed using `nvm` https://github.com/nvm-sh/nvm
* ruby >= 2.7. It can be installed using `rbenv` https://github.com/rbenv/rbenv
* watchman for watching changes in filesystem and improve performances `brew install watchman`
* openjdk (recommended `zulu17` compatible with both arm and amd architecture). It can be installed via `sdkman` https://sdkman.io/install or via brew

* android studio
* xcode

```
xcode-select --install
sudo xcode-select --switch /Library/Developer/CommandLineTools
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### api
```
mkdir cotecc-api && cd cotecc-api
npm init -y
npm install express body-parser cors 
npm install  --save-dev typescript ts-node @types/express @types/body-parser @types/cors
npx tsc --init
```

### mobile
```
npx react-native init CoteccApp --template react-native-template-typescript
cd CoteccApp
```

### mobile without SDK
You can use Expo GO to run for iOS or Android without the SDK installed. 

To use Expo GO run the app with 
```
npx expo start
```
download Expo GO from Play Store or App Store and scan the QRCode generated.

To expose the system use
```
npx expo start --tunnel
```
This command will expose the service through a port and everybody that scan the QRCode could use the app via internet.

#### Troubleshooting:

> No bundle URL present

```
npm install
npm start
```


### web
The app runs in the browser through react-native-web (metro bundler):
```
cd CoteccApp
npm run web -- --port 8090
```

### screenshots
`doc/screenshots/` holds the reference screenshots used for design work
(selection screen, game screen and a turn in progress at mobile, tablet
and desktop viewports). To regenerate them with the web app running:
```
cd tools/screenshots
npm install
npx playwright install chromium
npm run capture            # BASE_URL defaults to http://localhost:8090
```

