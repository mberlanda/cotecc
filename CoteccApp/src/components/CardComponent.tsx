import React from 'react';
import {
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import {Card, Move} from '../types';
import cardImages from '../utils/cardAssets';

const CardComponent = ({
  card,
  playerID,
  onCardSelect,
  cardStyles,
}: {
  card: Card;
  playerID: number;
  onCardSelect: (move: Move) => void;
  cardStyles?: ViewStyle | ViewStyle[];
}) => {
  const imageSource = cardImages[`${card.rank}_${card.suit}`]; // Construct the key to match the naming convention

  return (
    <TouchableOpacity onPress={() => onCardSelect({card, playerID})}>
      <View style={StyleSheet.compose(styles.card, cardStyles)}>
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
    width: 60,
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
