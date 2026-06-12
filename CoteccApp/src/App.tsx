import React, {useEffect, useState} from 'react';

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import * as SplashScreen from 'expo-splash-screen';

import {RootStackParamList} from './routes';
import AuthScreen from './screens/AuthScreen';
import GameScreen from './screens/GameScreen';
import HomeScreen from './screens/HomeScreen';
import HowToPlayScreen from './screens/HowToPlayScreen';
import {theme} from './theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()
  .then(() => console.log('SplashScreen preventAutoHideAsync was successful'))
  .catch(error =>
    console.warn(`SplashScreen.preventAutoHideAsync error: ${error}`),
  );

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // After all preparations, hide the splash screen
    async function prepare() {
      if (!isAppReady) {
        try {
          // replace with any dependency which may need to be fetched
          await new Promise(r => setTimeout(r, 500));
          await SplashScreen.hideAsync();

          setIsAppReady(true);
        } catch (e) {
          console.warn(e);
        }
      }
    }

    prepare();
  }, [isAppReady]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthScreen"
        screenOptions={{
          headerStyle: {backgroundColor: theme.colors.surface},
          headerTintColor: theme.colors.ink,
          headerTitleStyle: {fontWeight: '900'},
          cardStyle: {backgroundColor: theme.colors.background},
        }}>
        <Stack.Screen
          name="AuthScreen"
          component={AuthScreen}
          options={{title: 'Cotecc'}}
        />
        <Stack.Screen
          name="HowToPlayScreen"
          component={HowToPlayScreen}
          options={{title: 'Cotecc'}}
        />
        <Stack.Screen
          name="HomeScreen"
          component={HomeScreen}
          options={{title: 'Cotecc'}}
        />
        <Stack.Screen
          name="GameScreen"
          component={GameScreen}
          options={{title: 'Cotecc'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
