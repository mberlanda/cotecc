import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import DealCardsButton from '../components/DealCardsButton';
import PlayerHand from '../components/PlayerHand';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {GameState, Move} from '../types';
import {dealCards} from '../utils/cardsLogic';
import {playCard} from '../utils/gameLogic';

// Define an interface for the props
interface GameScreenProps {
  gameState: GameState;
}

const GameScreen: React.FC<GameScreenProps> = ({gameState}) => {
  const [localGameState, setLocalGameState] = useState<GameState>(gameState);

  const handleCardSelect = (move: Move) => {
    if (move.playerID !== localGameState.currentTurn.currentPlayerID) {
      // TODO: display an error message in the UI
      console.log(
        `Player ${move.playerID} tried to play while it was player ${localGameState.currentTurn.currentPlayerID} move`,
      );
      return;
    }
    playCard(localGameState, move.playerID, move.card);

    setLocalGameState({...localGameState});
  };

  const doDealCards = () => {
    dealCards(localGameState.deck, localGameState.players);
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
              player.ID === localGameState.currentTurn.currentPlayerID
                ? styles.currentPlayer
                : null
            }>
            Player name: {player.name} - ID {player.ID} - score{' '}
            {localGameState.scores[player.ID] || 0} - bole {player.boleCount}
          </Text>
          <PlayerHand player={player} onCardSelect={handleCardSelect} />
        </View>
      ))}
      {/* Implement UI elements for game controls */}
      <DealCardsButton state={localGameState} doDealCards={doDealCards} />
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
