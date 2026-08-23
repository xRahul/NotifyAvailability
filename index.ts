/**
 * @format
 */

import { AppRegistry } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from './src/App';
import { name as appName } from './app.json';

import { runScheduledCheck } from './src/services/watchScheduler';

AppRegistry.registerComponent(appName, () => App);

BackgroundFetch.registerHeadlessTask(runScheduledCheck);
