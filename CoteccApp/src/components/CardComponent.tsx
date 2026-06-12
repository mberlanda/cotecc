import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import {theme} from '../theme';
import {Card, Move, PlayerID} from '../types';
import cardImages from '../utils/cardAssets';

const CardComponent = ({
  card,
  playerID,
  onCardSelect,
  cardStyles,
}: {
  card: Card;
  playerID: PlayerID;
  onCardSelect: (move: Move) => void;
  cardStyles?: StyleProp<ViewStyle>;
}) => {
  const imageSource = cardImages[`${card.rank}_${card.suit}`]; // Construct the key to match the naming convention

  return (
    <TouchableOpacity
      accessibilityLabel={`Play card ${card.rank} ${card.suit}`}
      accessibilityRole="button"
      onPress={() => onCardSelect({card, playerID})}>
      <View style={StyleSheet.compose(styles.card, cardStyles)}>
        {imageSource ? (
          <Image
            source={imageSource}
            resizeMode="contain"
            style={styles.cardImage}
          />
        ) : (
          <Text style={styles.missingCardText}>
            {card.rank} {card.suit}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 54,
    height: 101,
    borderRadius: theme.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radii.sm,
  },
  missingCardText: {
    position: 'absolute',
    color: theme.colors.danger,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default CardComponent;
