import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {RouteProp} from '@react-navigation/native';

import DealCardsButton from '../components/DealCardsButton';
import PastTurn from '../components/PastTurn';
import PlayerHand from '../components/PlayerHand';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {GameScreenRouteParams, RootStackParamList} from '../routes';
import {GameState, Move} from '../types';
import {aiMoveToPlay} from '../utils/aiPlayerLogic';
import {dealCards} from '../utils/cardsLogic';
import {newGame, playCard} from '../utils/gameLogic';
import {findPlayerById, generatePlayers} from '../utils/playerLogic';

// Define an interface for the props
interface GameScreenProps {
  route: RouteProp<RootStackParamList, 'GameScreen'>;
}

const GameScreen: React.FC<GameScreenProps> = ({route}) => {
  const {gameSpeed, opponents, name, showDebug}: GameScreenRouteParams =
    route.params;
  // TODO: retrieve the maxLifeCount from the GameSelectionScreen
  const maxLifeCount: number = 4;
  const initialPlayers = useMemo(
    () => generatePlayers(name, opponents, maxLifeCount),
    [name, opponents, maxLifeCount],
  );
  const [localGameState, setLocalGameState] = useState<GameState>(() => {
    return newGame(initialPlayers, initialPlayers[0].ID, maxLifeCount);
  });

  const handleCardSelect = (move: Move) => {
    if (
      move.playerID !== localGameState.currentRound.currentTurn.currentPlayerID
    ) {
      // TODO: display an error message in the UI
      console.log(
        `Player ${move.playerID} tried to play while it was player ${localGameState.currentRound.currentTurn.currentPlayerID} move`,
      );
      return;
    }
    playCard(localGameState, move.playerID, move.card);

    setLocalGameState({...localGameState});
  };

  useEffect(() => {
    const currentPlayer = findPlayerById(
      localGameState.players,
      localGameState.currentRound.currentTurn.currentPlayerID,
    );
    // `currentPlayer.hand.length` is needed when the current turn is over
    // and the user has to tap DealCardsButton to start a new turn
    if (!currentPlayer.isHuman && currentPlayer.hand.length) {
      setTimeout(() => {
        const aiMove = aiMoveToPlay(
          currentPlayer,
          localGameState.currentRound.currentTurn,
          localGameState.currentRound.pastTurns,
        );
        playCard(localGameState, aiMove.playerID, aiMove.card);

        setLocalGameState({...localGameState});
      }, gameSpeed);
    }
  });

  const doDealCards = () => {
    dealCards(localGameState.deck, localGameState.players);
    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView>
      <StickyHeader />
      <TableComponent moves={localGameState.currentRound.currentTurn.moves} />
      {localGameState.players.map((player, index) => (
        <View key={index}>
          <Text
            style={
              player.ID ===
              localGameState.currentRound.currentTurn.currentPlayerID
                ? styles.currentPlayer
                : null
            }>
            Player name: {player.name} - ID {player.ID} - score{' '}
            {localGameState.scores[player.ID] || 0} - lives {player.lifeCount}
          </Text>
          {player.isHuman && (
            <PlayerHand player={player} onCardSelect={handleCardSelect} />
          )}
          <PastTurn
            key={index}
            turns={localGameState.currentRound.pastTurns.filter(
              t => t.winnerID === player.ID,
            )}
          />
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
