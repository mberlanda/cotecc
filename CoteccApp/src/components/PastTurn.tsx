import React from 'react';
import {Alert, FlatList, StyleSheet, View} from 'react-native';

import CardComponent from './CardComponent';
import {Turn} from '../types';

const PastTurn = ({turns}: {turns: Turn[]}) => (
  <View style={styles.container}>
    {turns.map(turn => (
      <FlatList
        key={`${turn.winnerID}-${turn.suit}-${turn.highestCard?.rank}`}
        data={turn.moves.map(m => m.card)}
        renderItem={({item}) => (
          <CardComponent
            card={item}
            playerID={turn.winnerID || -1}
            onCardSelect={() => {
              Alert.alert(`${item.rank} - ${item.suit}`);
            }}
            cardStyles={styles.miniCard}
          />
        )}
        keyExtractor={(item, index) => `${turn.winnerID}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
  },
  miniCard: {
    width: 30,
    height: 45,
    margin: 2.5,
    borderWidth: 0.5,
  },
});

export default PastTurn;
