import React, { useState } from 'react';
import { GameState, Player } from './types';
import GameScreen from './screens/GameScreen';
import { createDeck, shuffleDeck } from './utils/gameLogic';

const initialPlayers: Player[] = [
    // Initialize players with empty hands and scores
    { hand: [], boleCount: 0, score: 0 },
    // ... for all five players
];

const App = () => {
    const [gameState, setGameState] = useState<GameState>({
        players: initialPlayers,
        deck: shuffleDeck(createDeck()),
        currentTurn: 0,
    });
  return (
    <GameScreen gameState={gameState} />
  );
};

export default App;