import React from 'react';
import {StyleSheet, View} from 'react-native';

import PrimaryButton from './PrimaryButton';

const DealCardsButton = ({doDealCards}: {doDealCards: () => void}) => {
  return (
    <View style={styles.container}>
      <PrimaryButton onPress={doDealCards} title="Deal Cards" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DealCardsButton;
