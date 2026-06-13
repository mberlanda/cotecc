import React, {useEffect} from 'react';

import {Stack} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import {theme} from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    // No async resource loading to wait on — hide the splash once mounted.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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
