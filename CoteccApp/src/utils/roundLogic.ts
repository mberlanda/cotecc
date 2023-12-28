import {newTurn} from './turnLogic';
import {PlayerID, Round} from '../types';

export const newRound = (ID: number, initialPlayerID: PlayerID): Round => {
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    scoresMap: {},
  };
};
