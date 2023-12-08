import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Player, Card } from '../types';
import CardComponent from './CardComponent';

const PlayerHand = ({ player, onCardSelect }: { player: Player, onCardSelect: (card: Card) => void }) => (
    <View style={styles.container}>
    <FlatList
      data={player.hand}
      renderItem={({ item }) => (
        <CardComponent card={item} onCardSelect={onCardSelect} />
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
