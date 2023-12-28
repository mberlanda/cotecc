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
