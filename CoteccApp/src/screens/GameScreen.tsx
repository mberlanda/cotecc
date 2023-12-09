import React, {useState, useEffect, useRef} from 'react';
import {View, Text, ScrollView} from 'react-native';
import {GameState, Card} from '../types';
import PlayerHand from '../components/PlayerHand';
import {dealCards} from '../utils/cardsLogic';
import {playCard} from '../utils/gameLogic';
import {StateDebugComponent} from '../components/StateDebug';

// Define an interface for the props
interface GameScreenProps {
  gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({gameState}) => {
  const [localGameState, setLocalGameState] = useState<GameState>(gameState);

  const initialized = useRef(false);
  // TODO: For some reason useEffect is triggered twice
  // need to find a permanent fix: https://stackoverflow.com/a/60619061
  useEffect(() => {
    // Fix the event and remove the initiated workaround
    if (!initialized.current) {
      initialized.current = true;
      // Deal cards when the component mounts if the deck and players are ready
      if (localGameState.deck.length && localGameState.players.length) {
        dealCards(localGameState.deck, localGameState.players);
        setLocalGameState({...localGameState});
      }
    }
  }, [localGameState]);

  const handleCardSelect = (card: Card) => {
    // Handle card selection logic

    const currentPlayer =
      localGameState.players[localGameState.currentPlayerID];
    playCard(localGameState, currentPlayer, card);

    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView>
      {localGameState.players.map((player, index) => (
        <View key={index}>
          <Text>
            Player name: {player.name} - ID {player.ID} - score {player.score}
          </Text>
          <PlayerHand player={player} onCardSelect={handleCardSelect} />
        </View>
      ))}
      {/* Implement UI elements for game controls */}
      <StateDebugComponent state={localGameState} />
    </ScrollView>
  );
};

export default GameScreen;
