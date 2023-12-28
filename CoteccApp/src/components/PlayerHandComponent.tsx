import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';

import CardComponent from './CardComponent';
import {Move, PlayerHand} from '../types';

const PlayerHandComponent = ({
  hand,
  onCardSelect,
}: {
  hand: PlayerHand;
  onCardSelect: (move: Move) => void;
}) => (
  <View style={styles.container}>
    <FlatList
      data={hand.cards}
      renderItem={({item}) => (
        <CardComponent
          card={item}
          playerID={hand.playerID}
          onCardSelect={onCardSelect}
        />
      )}
      keyExtractor={(item, index) => index.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  // Add styles for CardComponent if necessary
});

export default PlayerHandComponent;
