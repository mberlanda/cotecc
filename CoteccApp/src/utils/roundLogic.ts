import {newTurn} from './turnLogic';
import {Round} from '../types';

export const newRound = (ID: number, initialPlayerID: number): Round => {
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    scoresMap: {},
  };
};
