import React from 'react';
import {StyleSheet, View} from 'react-native';

import PrimaryButton from './PrimaryButton';
import {theme} from '../theme';

const DealCardsButton = ({
  doDealCards,
  title = 'Deal Cards',
}: {
  doDealCards: () => void;
  title?: string;
}) => {
  return (
    <View style={styles.container}>
      <PrimaryButton onPress={doDealCards} title={title} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
});

export default DealCardsButton;
