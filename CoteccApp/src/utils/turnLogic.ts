import {calculateScore} from './movesLogic';
import {PlayerID, Round, Turn} from '../types';

export const newTurn = (playerID: PlayerID): Turn => {
  return {
    currentPlayerID: playerID,
    highestCard: null,
    moves: [],
    suit: null,
    winnerID: null,
  };
};
export const resetTurnState = (round: Round, playerID: PlayerID): void => {
  round.currentTurn = newTurn(playerID);
};

export const endTurn = (currentRound: Round): PlayerID => {
  const score = calculateScore(currentRound.currentTurn.moves);
  const winnerID = currentRound.currentTurn.winnerID!;
  currentRound.pastTurns.push({...currentRound.currentTurn});
  currentRound.scoresMap[winnerID] ||= 0;
  currentRound.scoresMap[winnerID] += score;
  return winnerID;
};
