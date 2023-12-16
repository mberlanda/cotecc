/**
 * @format
 */

import {AppRegistry} from 'react-native';

import {name as appName} from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);
// TODO: main component name is used by expo dev server
// fix the configuration to point to the appName
AppRegistry.registerComponent('main', () => App);
