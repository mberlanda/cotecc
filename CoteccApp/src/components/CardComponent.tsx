import React from 'react';
import {View, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {Card, Move} from '../types';
import cardImages from '../utils/cardAssets';

const CardComponent = ({
  card,
  playerID,
  onCardSelect,
}: {
  card: Card;
  playerID: number;
  onCardSelect: (move: Move) => void;
}) => {
  const imageSource = cardImages[`${card.rank}_${card.suit}`]; // Construct the key to match the naming convention

  return (
    <TouchableOpacity onPress={() => onCardSelect({card, playerID})}>
      <View style={styles.card}>
        <Image
          source={imageSource}
          resizeMode="contain"
          style={styles.cardImage}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 60, // Adjust width and height as needed
    height: 90,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: 'black',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});

export default CardComponent;
