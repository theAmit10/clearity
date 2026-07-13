/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

notifee.onBackgroundEvent(async event => {
  // Background notification tap handling for habit reminders
  if (event.type === EventType.PRESS || event.type === EventType.ACTION_PRESS) {
    // User tapped the notification — app will open naturally
  }
});

AppRegistry.registerComponent(appName, () => App);
