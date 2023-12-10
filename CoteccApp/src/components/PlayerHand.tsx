import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';

import CardComponent from './CardComponent';
import {Move, Player} from '../types';

const PlayerHand = ({
  player,
  onCardSelect,
}: {
  player: Player;
  onCardSelect: (move: Move) => void;
}) => (
  <View style={styles.container}>
    <FlatList
      data={player.hand}
      renderItem={({item}) => (
        <CardComponent
          card={item}
          playerID={player.ID}
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

export default PlayerHand;
