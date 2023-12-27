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
    // If no past turn and first player has no card, display
    // a button to deal cards
    if (!state.currentRound.pastTurns.length && !state.players[0].hand.length) {
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
