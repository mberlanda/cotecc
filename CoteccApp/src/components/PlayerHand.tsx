import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Player, Card } from '../types';
import CardComponent from './CardComponent';

const PlayerHand = ({ player, onCardSelect }: { player: Player, onCardSelect: (card: Card) => void }) => (
    <View>
        {player.hand.map((card, index) => (
            <TouchableOpacity key={index} onPress={() => onCardSelect(card)}>
                <CardComponent card={card} />
            </TouchableOpacity>
        ))}
    </View>
);

export default PlayerHand;
