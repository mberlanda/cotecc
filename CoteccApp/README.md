This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

----------------------|---------|----------|---------|---------|---------------------------------------------------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                             
----------------------|---------|----------|---------|---------|---------------------------------------------------------------
All files             |   41.58 |    24.61 |    37.5 |   40.93 |                                                               
 src                  |       0 |        0 |       0 |       0 |                                                               
  App.tsx             |       0 |        0 |       0 |       0 | 13-43                                                         
  types.ts            |       0 |        0 |       0 |       0 |                                                               
 src/components       |   29.03 |        0 |   26.66 |   29.03 |                                                               
  CardComponent.tsx   |      80 |      100 |      50 |      80 | 18                                                            
  DealCardsButton.tsx |       0 |        0 |       0 |       0 | 5-28                                                          
  PlayerHand.tsx      |     100 |      100 |     100 |     100 |                                                               
  StateDebug.tsx      |       0 |        0 |       0 |       0 | 5-17                                                          
  StickyHeader.tsx    |       0 |      100 |       0 |       0 | 4-16                                                          
  TableComponent.tsx  |       0 |      100 |       0 |       0 | 6-31                                                          
 src/screens          |       0 |        0 |       0 |       0 |                                                               
  GameScreen.tsx      |       0 |        0 |       0 |       0 | 17-63                                                         
 src/utils            |      50 |    32.65 |      50 |   49.64 |                                                               
  cardAssets.ts       |     100 |      100 |     100 |     100 |                                                               
  cardsLogic.ts       |   97.56 |    92.85 |     100 |   97.36 | 53                                                            
  constants.ts        |       0 |        0 |       0 |       0 |                                                               
  gameLogic.ts        |   23.71 |     3.03 |   22.22 |   24.73 | ...0,64-70,82-108,113-120,127-135,140-146,153-208,215,220-221 
  playerLogic.ts      |     100 |      100 |     100 |     100 |                                                               
----------------------|---------|----------|---------|---------|---------------------------------------------------------------
Test Suites: 1 failed, 6 passed, 7 total
Tests:       23 passed, 23 total
Snapshots:   2 passed, 2 total
Time:        3.418 s