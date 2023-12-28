import React, {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import PrimaryButton from './PrimaryButton';
import {GameState} from '../types';

const DealCardsButton = ({
  state,
  doDealCards,
}: {
  state: GameState;
  doDealCards: () => void;
}) => {
  const renderDealCardsButton = (): ReactNode => {
    // Each round can only contain 7 cards
    if (state.currentRound.pastTurns.length === 7) {
      return <PrimaryButton onPress={doDealCards} title="Deal Cards" />;
    }
    return null;
  };

  return <View style={styles.container}>{renderDealCardsButton()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DealCardsButton;
