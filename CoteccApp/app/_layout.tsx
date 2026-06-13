import React, {useEffect, useState} from 'react';

import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import {theme} from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      if (!isAppReady) {
        try {
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
    <Stack
      screenOptions={{
        title: 'Cotecc',
        headerStyle: {backgroundColor: theme.colors.surface},
        headerTintColor: theme.colors.ink,
        headerTitleStyle: {fontWeight: '900'},
        contentStyle: {backgroundColor: theme.colors.background},
      }}
    />
  );
}
