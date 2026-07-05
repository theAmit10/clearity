import { Platform } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

export const APP_NAME: string = pkg.name ?? 'App';
export const APP_VERSION: string = pkg.version ?? '0.0.0';

// react-native's Platform module has no native-module dependency, so this
// works out of the box. It gives you OS + OS version, but NOT a device
// model name (e.g. "iPhone 15 Pro") — that requires a native module like
// `react-native-device-info`, which isn't in package.json yet. If you want
// the actual model name in the feedback footer, add that dependency and
// swap this line for `DeviceInfo.getModel()`.
export const DEVICE_INFO: string =
  Platform.OS === 'ios' ? `iOS ${Platform.Version}` : `Android ${Platform.Version}`;

export const X_HANDLE = 'codethenic';
export const FEEDBACK_EMAIL = 'codethenic@gmail.com';

// TODO: replace these with your real store identifiers once the app is
// actually published — these are placeholders and won't open a real
// listing until you do.
export const IOS_APP_STORE_ID = 'YOUR_IOS_APP_STORE_ID';
export const ANDROID_PACKAGE_NAME = 'com.codethenic.habittracker';