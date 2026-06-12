import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {theme} from '../theme';

const StickyHeader = () => {
  const headerSource = require('../assets/icon.png');

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>Cotecc</Text>
        <Text style={styles.subtitle}>Point-avoidance at the table</Text>
      </View>
      <Image source={headerSource} resizeMode="contain" style={styles.image} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 132,
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryDark,
  },
  image: {
    position: 'absolute',
    right: theme.spacing.xl,
    width: 118,
    height: 118,
    opacity: 0.94,
  },
  copy: {
    left: theme.spacing.xl,
    maxWidth: 320,
  },
  title: {
    color: theme.colors.white,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.surfaceMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StickyHeader;
