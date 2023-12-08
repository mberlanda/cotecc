import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { GameState, Card } from '../types';
import PlayerHand from '../components/PlayerHand';
import { dealCards } from '../utils/gameLogic';
import { playCard, nextTurn, endRound } from '../utils/gameLogic';

// Define an interface for the props
interface GameScreenProps {
    gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({ gameState }) => {
    const [localGameState, setLocalGameState] = useState<GameState>(gameState);

    const initialized = useRef(false);
    // For some reason useEffect is triggered twice
    // need to fine a permanent fix: https://stackoverflow.com/a/60619061
    useEffect(() => {
        // Fix the event and remove the initiated workaround
        if (!initialized.current) {
            initialized.current = true
            // Deal cards when the component mounts if the deck and players are ready
            if (localGameState.deck.length && localGameState.players.length) {
                dealCards(localGameState.deck, localGameState.players);
                setLocalGameState({ ...localGameState });
            }
        }
    }, [localGameState]);


    const handleCardSelect = (card: Card) => {
        // Handle card selection logic

        const currentPlayer = gameState.players[gameState.currentTurn];
        playCard(currentPlayer, card);

        const isRoundEnd = nextTurn(gameState);
        if (isRoundEnd) {
            endRound(gameState);
            // Reset for a new round or handle game end
        }
        // Update gameState accordingly
        setLocalGameState({ ...gameState });
    };

    return (
        <ScrollView>
            {gameState.players.map((player, index) => (
                <View key={index}>
                    <Text>Player name: {player.name}</Text>
                    <PlayerHand player={player} onCardSelect={handleCardSelect} />
                </View>
            ))}
            {/* Implement UI elements for game controls */}
        </ScrollView>
    );
};

export default GameScreen;