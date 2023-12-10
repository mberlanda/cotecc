import React, {ReactNode} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

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
    if (!state.pastTurns.length && !state.players[0].hand.length) {
      return (
        <TouchableOpacity onPress={() => doDealCards()} style={styles.button}>
          <Text style={styles.buttonText}>Deal Cards</Text>
        </TouchableOpacity>
      );
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
  button: {
    backgroundColor: '#007bff', // Standard blue for primary buttons
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DealCardsButton;
