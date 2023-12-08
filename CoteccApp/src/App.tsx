import React, { useState } from 'react';
import { GameState, Player } from './types';
import GameScreen from './screens/GameScreen';
import { createDeck, shuffleDeck } from './utils/cardsLogic';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { SafeAreaView, StatusBar, StyleSheet, useColorScheme } from 'react-native';

const initialPlayers: Player[] = [
    // Initialize players with empty hands and scores
    { ID: 0, name: 'foo', hand: [], boleCount: 0, score: 0 },
    { ID: 1, name: 'bar', hand: [], boleCount: 0, score: 0 },
    { ID: 2, name: 'baz', hand: [], boleCount: 0, score: 0 },
    // ... for all five players
];

const App = () => {
    const [gameState, setGameState] = useState<GameState>({
        players: initialPlayers,
        deck: shuffleDeck(createDeck()),
        currentPlayerID: initialPlayers[0].ID,
        currentSuit: null,
        currentHighestCard: null,
        currentWinnerID: initialPlayers[0].ID,
        currentMoves: [],
        pastTurns: [],
    });

    const isDarkMode = useColorScheme() === 'dark';

    const backgroundStyle = {
        backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    };

    return (
        <SafeAreaView style={backgroundStyle}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={backgroundStyle.backgroundColor}
            />
            <GameScreen gameState={gameState} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
    },
    highlight: {
        fontWeight: '700',
    },
});

export default App;