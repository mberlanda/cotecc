import React from 'react';
import { Text, View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Card } from '../types';
import cardImages from '../utils/cardAssets';


const CardComponent = ({ card, onCardSelect }: { card: Card, onCardSelect: (card: Card) => void }) => {
    const imageSource = cardImages[`${card.rank}_${card.suit}`]; // Construct the key to match the naming convention

    return (
        <TouchableOpacity onPress={() => onCardSelect(card)}>
            <View style={styles.card}>
                <Image source={imageSource} resizeMode="contain" style={styles.cardImage} />
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