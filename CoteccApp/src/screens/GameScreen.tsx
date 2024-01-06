import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {RouteProp} from '@react-navigation/native';

import DealCardsButton from '../components/DealCardsButton';
import PastTurn from '../components/PastTurn';
import PlayerHandComponent from '../components/PlayerHandComponent';
import {StateDebugComponent} from '../components/StateDebug';
import StickyHeader from '../components/StickyHeader';
import TableComponent from '../components/TableComponent';
import {GameScreenRouteParams, RootStackParamList} from '../routes';
import {GameState, Move} from '../types';
import {aiMoveToPlay} from '../utils/aiPlayerLogic';
import {newGame, playCard} from '../utils/gameLogic';
import {generatePlayers} from '../utils/playerLogic';
import {nextRound} from '../utils/roundLogic';

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
    const currentPlayer = localGameState.currentRound.players.find(
      p =>
        p.playerID === localGameState.currentRound.currentTurn.currentPlayerID,
    );
    // `currentPlayer.hand.length` is needed when the current turn is over
    // and the user has to tap DealCardsButton to start a new turn
    if (currentPlayer && !currentPlayer.isHuman && currentPlayer.cards.length) {
      setTimeout(() => {
        const aiMove = aiMoveToPlay(
          currentPlayer,
          localGameState.currentRound.currentTurn,
          localGameState.currentRound.pastTurns,
        );
        console.log(aiMove);
        playCard(localGameState, aiMove.playerID, aiMove.card);

        setLocalGameState({...localGameState});
      }, gameSpeed);
    }
  });

  const doDealCards = () => {
    nextRound(localGameState);
    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView>
      <StickyHeader />
      {/* Show deal card button instead of table when all turns have been player */}
      {localGameState.currentRound.pastTurns.length === 7 ? (
        <View style={styles.gameSummaryContainer}>
          <DealCardsButton doDealCards={doDealCards} />
        </View>
      ) : (
        <TableComponent moves={localGameState.currentRound.currentTurn.moves} />
      )}
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
            {localGameState.currentRound.scoresMap[player.ID] || 0} - lives{' '}
            {player.lifeCount}
          </Text>
          {player.isHuman && (
            <PlayerHandComponent
              hand={
                localGameState.currentRound.players.find(
                  p => p.playerID === player.ID,
                )!
              }
              onCardSelect={handleCardSelect}
            />
          )}
          <PastTurn
            key={index}
            turns={localGameState.currentRound.pastTurns.filter(
              t => t.winnerID === player.ID,
            )}
          />
        </View>
      ))}
      {showDebug && <StateDebugComponent state={localGameState} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  currentPlayer: {
    fontWeight: 'bold',
  },
  gameSummaryContainer: {
    minHeight: 40,
  },
});

export default GameScreen;
