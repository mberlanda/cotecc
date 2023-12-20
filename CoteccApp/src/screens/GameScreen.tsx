import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {RouteProp} from '@react-navigation/native';

import DealCardsButton from '../components/DealCardsButton';
import PlayerHand from '../components/PlayerHand';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {GameScreenRouteParams, RootStackParamList} from '../routes';
import {GameState, Move} from '../types';
import {dealCards} from '../utils/cardsLogic';
import {newRound, playAICard, playCard} from '../utils/gameLogic';
import {findPlayerById, generatePlayers} from '../utils/playerLogic';

// Define an interface for the props
interface GameScreenProps {
  route: RouteProp<RootStackParamList, 'GameScreen'>;
}

const GameScreen: React.FC<GameScreenProps> = ({route}) => {
  const {opponents, name, showDebug}: GameScreenRouteParams = route.params;
  const initialPlayers = useMemo(
    () => generatePlayers(name, opponents),
    [name, opponents],
  );
  const [localGameState, setLocalGameState] = useState<GameState>(() => {
    return newRound(initialPlayers, initialPlayers[0].ID);
  });

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

  useEffect(() => {
    const currentPlayer = findPlayerById(
      localGameState.players,
      localGameState.currentTurn.currentPlayerID,
    );
    // `currentPlayer.hand.length` is needed when the current turn is over
    // and the user has to tap DealCardsButton to start a new turn
    if (!currentPlayer.isHuman && currentPlayer.hand.length) {
      setTimeout(() => {
        playAICard(localGameState, currentPlayer);
        setLocalGameState({...localGameState});
      }, 1500); // TODO: make delay configurable
    }
  });

  const doDealCards = () => {
    console.log(`doDealCards: ${JSON.stringify(localGameState)}`);
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
          {player.isHuman && (
            <PlayerHand player={player} onCardSelect={handleCardSelect} />
          )}
        </View>
      ))}
      {/* Implement UI elements for game controls */}
      <DealCardsButton state={localGameState} doDealCards={doDealCards} />
      {showDebug && <StateDebugComponent state={localGameState} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  currentPlayer: {
    fontWeight: 'bold',
  },
});

export default GameScreen;
