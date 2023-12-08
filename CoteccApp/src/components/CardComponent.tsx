import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Card } from '../types';

const CardComponent = ({ card }: { card: Card }) => (
  <View style={styles.card}>
    <Text>{card.suit}</Text>
    <Text>{card.rank}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 90,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: 'black',
  },
});

export default CardComponent;