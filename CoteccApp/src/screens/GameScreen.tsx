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
import {GameState, Move, Round, Turn} from '../types';
import {aiMoveToPlay} from '../utils/aiPlayerLogic';
import {validateMove} from '../utils/moveLogic';
import {generatePlayers} from '../utils/playerLogic';
import {handleRoundEnd, newGame, nextRound} from '../utils/roundLogic';
import {
  handleCardPlayed,
  handleNextMove,
  handleTurnEnd,
} from '../utils/turnLogic';

// Define an interface for the props
interface GameScreenProps {
  route: RouteProp<RootStackParamList, 'GameScreen'>;
}

const GameScreen: React.FC<GameScreenProps> = ({route}) => {
  const {gameSpeed, opponents, name, showDebug}: GameScreenRouteParams =
    route.params;
  const initialPlayers = useMemo(
    () => generatePlayers(name, opponents, 4),
    [name, opponents],
  );
  const initialGame = useMemo<GameState>(
    () => newGame(initialPlayers),
    [initialPlayers],
  );

  const [localGameState, setLocalGameState] = useState<GameState>(() => {
    return initialGame;
  });

  const [currentRound, setCurrentRound] = useState<Round>(() => {
    return {...initialGame.currentRound};
  });

  const [currentTurn, setCurrentTurn] = useState<Turn>(() => {
    return {...initialGame.currentRound.currentTurn};
  });

  const handleCardSelect = (move: Move) => {
    if (move.playerID !== currentTurn.currentPlayerID) {
      // TODO: display an error message in the UI
      console.log(
        `Player ${move.playerID} tried to play while it was player ${currentTurn.currentPlayerID} move`,
      );
      return;
    }
    const hand = currentRound.players.find(p => p.playerID === move.playerID)!;
    if (validateMove(currentTurn, hand, move.card)) {
      handleCardPlayed(currentTurn, hand, move.card);
      if (handleNextMove(currentTurn, currentRound)) {
        // When next move in same turn, just update the turn
        setCurrentTurn({...currentTurn});
      } else {
        if (handleTurnEnd(currentTurn, currentRound)) {
          // When turn ends in the same round
          console.log('Reset current turn');
          setCurrentRound({...currentRound});
          setCurrentTurn({...currentRound.currentTurn});
        } else {
          handleRoundEnd(currentRound, localGameState);

          setLocalGameState({...localGameState});
          setCurrentRound({...localGameState.currentRound});
          setCurrentTurn({...localGameState.currentRound.currentTurn});
        }
      }
    }
  };

  useEffect(() => {
    const currentPlayer = currentRound.players.find(
      p => p.playerID === currentTurn.currentPlayerID,
    )!;
    console.log(currentPlayer);
    // `currentPlayer.hand.length` is needed when the current turn is over
    // and the user has to tap DealCardsButton to start a new turn
    if (!currentPlayer.isHuman && currentPlayer.cards.length) {
      setTimeout(() => {
        const aiMove = aiMoveToPlay(
          currentPlayer,
          currentTurn,
          currentRound.pastTurns,
        );
        handleCardSelect(aiMove);
      }, gameSpeed);
    }
    // TODO: fix state management. If effect gets overtriggered, players do not move
    // however it has dependencies on
  }, [currentTurn]); // eslint-disable-line react-hooks/exhaustive-deps

  const doDealCards = () => {
    nextRound(localGameState);

    setCurrentTurn({...localGameState.currentRound.currentTurn});
    setCurrentRound({...localGameState.currentRound});
    setLocalGameState({...localGameState});
  };

  return (
    <ScrollView>
      <StickyHeader />
      {/* if all hands have been played, render deal cards otherwise render table*/}
      {currentRound.pastTurns.length === 7 ? (
        <DealCardsButton doDealCards={doDealCards} />
      ) : (
        <TableComponent moves={currentTurn.moves} />
      )}
      {localGameState.players.map((player, index) => (
        <View key={index}>
          <Text
            style={
              player.ID === currentTurn.currentPlayerID
                ? styles.currentPlayer
                : null
            }>
            Player name: {player.name} - ID {player.ID} - score{' '}
            {currentRound.playersScoreMap[player.ID] || 0} - lifes{' '}
            {player.lifeCount}
          </Text>
          {player.isHuman && (
            <PlayerHandComponent
              hand={currentRound.players.find(p => p.playerID === player.ID)!}
              onCardSelect={handleCardSelect}
            />
          )}
          <PastTurn
            key={index}
            turns={currentRound.pastTurns.filter(t => t.winnerID === player.ID)}
          />
        </View>
      ))}
      {/* Implement UI elements for game controls */}

      {showDebug && <StateDebugComponent round={currentRound} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  currentPlayer: {
    fontWeight: 'bold',
  },
});

export default GameScreen;
