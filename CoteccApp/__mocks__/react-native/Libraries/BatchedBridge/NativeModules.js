import {jest} from 'jest';

// Largerly based on https://gist.github.com/sibelius/c345f4577be678d313db7a2868984623
const NativeModules = {
  AlertManager: {
    alertWithArgs: jest.fn(),
  },
  AsyncLocalStorage: {
    multiGet: jest.fn((keys, callback) =>
      process.nextTick(() => callback(null, [])),
    ),
    multiSet: jest.fn((entries, callback) =>
      process.nextTick(() => callback(null)),
    ),
    multiRemove: jest.fn((keys, callback) =>
      process.nextTick(() => callback(null)),
    ),
    multiMerge: jest.fn((entries, callback) =>
      process.nextTick(() => callback(null)),
    ),
    clear: jest.fn(callback => process.nextTick(() => callback(null))),
    getAllKeys: jest.fn(callback => process.nextTick(() => callback(null, []))),
  },
  Clipboard: {
    getString: jest.fn(() => ''),
    setString: jest.fn(),
  },
  DeviceInfo: {
    getConstants() {
      return {
        Dimensions: {
          window: {
            fontScale: 2,
            height: 1334,
            scale: 2,
            width: 750,
          },
          screen: {
            fontScale: 2,
            height: 1334,
            scale: 2,
            width: 750,
          },
        },
      };
    },
  },
  ImageLoader: {
    getSize: jest.fn(url => Promise.resolve({width: 320, height: 240})),
    prefetchImage: jest.fn(),
  },
  ImageViewManager: {
    getSize: jest.fn((uri, success) =>
      process.nextTick(() => success(320, 240)),
    ),
    prefetchImage: jest.fn(),
  },
  KeyboardObserver: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  Networking: {
    sendRequest: jest.fn(),
    abortRequest: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  PlatformConstants: {
    getConstants() {
      return {};
    },
  },
  PushNotificationManager: {
    presentLocalNotification: jest.fn(),
    scheduleLocalNotification: jest.fn(),
    cancelAllLocalNotifications: jest.fn(),
    removeAllDeliveredNotifications: jest.fn(),
    getDeliveredNotifications: jest.fn(callback => process.nextTick(() => [])),
    removeDeliveredNotifications: jest.fn(),
    setApplicationIconBadgeNumber: jest.fn(),
    getApplicationIconBadgeNumber: jest.fn(callback =>
      process.nextTick(() => callback(0)),
    ),
    cancelLocalNotifications: jest.fn(),
    getScheduledLocalNotifications: jest.fn(callback =>
      process.nextTick(() => callback()),
    ),
    requestPermissions: jest.fn(() =>
      Promise.resolve({alert: true, badge: true, sound: true}),
    ),
    abandonPermissions: jest.fn(),
    checkPermissions: jest.fn(callback =>
      process.nextTick(() => callback({alert: true, badge: true, sound: true})),
    ),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  SourceCode: {
    getConstants() {
      return {
        scriptURL: null,
      };
    },
  },
  StatusBarManager: {
    setColor: jest.fn(),
    setStyle: jest.fn(),
    setHidden: jest.fn(),
    setNetworkActivityIndicatorVisible: jest.fn(),
    setBackgroundColor: jest.fn(),
    setTranslucent: jest.fn(),
    getConstants: () => ({
      HEIGHT: 42,
    }),
  },
  Timing: {
    createTimer: jest.fn(),
    deleteTimer: jest.fn(),
  },
  UIManager: {},
  BlobModule: {
    getConstants: () => ({BLOB_URI_SCHEME: 'content', BLOB_URI_HOST: null}),
    addNetworkingHandler: jest.fn(),
    enableBlobSupport: jest.fn(),
    disableBlobSupport: jest.fn(),
    createFromParts: jest.fn(),
    sendBlob: jest.fn(),
    release: jest.fn(),
  },
  WebSocketModule: {
    connect: jest.fn(),
    send: jest.fn(),
    sendBinary: jest.fn(),
    ping: jest.fn(),
    close: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
  I18nManager: {
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
    swapLeftAndRightInRTL: jest.fn(),
    getConstants: () => ({
      isRTL: false,
      doLeftAndRightSwapInRTL: true,
    }),
  },
  SettingsManager: {
    settings: {
      AppleLocal: 'en-US',
      AppleLanguages: ['en-US'],
    },
  },
};

module.exports = NativeModules;
