import React from 'react';
import {
  FlatList,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import CardComponent from './CardComponent';
import {theme} from '../theme';
import {Move, PlayerHand} from '../types';

const PlayerHandComponent = ({
  hand,
  onCardSelect,
  title = 'Your hand',
  cardStyles,
}: {
  hand: PlayerHand;
  onCardSelect: (move: Move) => void;
  title?: string;
  cardStyles?: StyleProp<ViewStyle>;
}) => (
  <View style={styles.container}>
    <Text style={styles.playerName}>{title}</Text>
    <FlatList
      data={hand.cards}
      contentContainerStyle={styles.cardListContent}
      renderItem={({item}) => (
        <CardComponent
          card={item}
          playerID={hand.playerID}
          onCardSelect={onCardSelect}
          cardStyles={cardStyles}
        />
      )}
      keyExtractor={(item, index) => index.toString()}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.cardList}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  cardList: {
    width: '100%',
  },
  cardListContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  playerName: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: theme.spacing.sm,
  },
});

export default PlayerHandComponent;
