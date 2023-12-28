import {calculateScore} from './movesLogic';
import {Round, Turn} from '../types';

export const newTurn = (playerID: number): Turn => {
  return {
    currentPlayerID: playerID,
    highestCard: null,
    moves: [],
    suit: null,
    winnerID: null,
  };
};
export const resetTurnState = (round: Round, playerID: number): void => {
  round.currentTurn = newTurn(playerID);
};

export const endTurn = (currentRound: Round): number => {
  const score = calculateScore(currentRound.currentTurn.moves);
  const winnerID = currentRound.currentTurn.winnerID!;
  currentRound.pastTurns.push(currentRound.currentTurn);
  currentRound.scoresMap[winnerID] ||= 0;
  currentRound.scoresMap[winnerID] += score;
  return winnerID;
};
