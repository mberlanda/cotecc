import React, {useState, useEffect, useRef} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {GameState, Move} from '../types';
import PlayerHand from '../components/PlayerHand';
import {dealCards} from '../utils/cardsLogic';
import {playCard} from '../utils/gameLogic';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';

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

  const handleCardSelect = (move: Move) => {
    if (move.playerID != localGameState.currentTurn.currentPlayerID) {
      // TODO: display an error message in the UI
      console.log(
        `Player ${move.playerID} tried to play while it was player ${localGameState.currentTurn.currentPlayerID} move`,
      );
      return;
    }
    playCard(localGameState, move.playerID, move.card);

    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView>
      <StickyHeader />
      <TableComponent moves={localGameState.currentTurn.moves} />
      {localGameState.players.map((player, index) => (
        <View key={index}>
          <Text
            style={
              player.ID == localGameState.currentTurn.currentPlayerID
                ? styles.currentPlayer
                : null
            }>
            Player name: {player.name} - ID {player.ID} - score{' '}
            {localGameState.scores[player.ID] || 0}
          </Text>
          <PlayerHand player={player} onCardSelect={handleCardSelect} />
        </View>
      ))}
      {/* Implement UI elements for game controls */}
      <StateDebugComponent state={localGameState} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  currentPlayer: {
    fontWeight: 'bold',
  },
});

export default GameScreen;
