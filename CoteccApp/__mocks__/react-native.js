const ReactNative = jest.requireActual('react-native');

ReactNative.NativeModules.ActionSheetManager = {};

ReactNative.NativeModules.Appearance = {};

ReactNative.NativeModules.BugReporting = {};

ReactNative.NativeModules.DialogManagerAndroid = {};

ReactNative.NativeModules.FrameRateLogger = {};

ReactNative.NativeModules.HeadlessJsTaskSupport = {};

ReactNative.NativeModules.LogBox = {};

ReactNative.NativeModules.ModalManager = {};

ReactNative.NativeModules.NativeAnimatedModule = {};

ReactNative.NativeModules.NativePerformanceCxx = {};

ReactNative.NativeModules.PermissionsAndroid = {};

ReactNative.NativeModules.RedBox = {};

ReactNative.NativeModules.SettingsManager = {
  settings: {
    AppleLocale: 'en_US', // example value
  },
};

ReactNative.NativeModules.SoundManager = {};

module.exports = ReactNative;
