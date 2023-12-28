import {toPlayerHand} from './playerHandLogic';
import {newTurn} from './turnLogic';
import {Player, PlayerID, Round} from '../types';

export const newRound = (
  ID: number,
  initialPlayerID: PlayerID,
  players: Player[],
): Round => {
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    players: players.filter(p => p.lifeCount > 0).map(p => toPlayerHand(p)),
    scoresMap: {},
  };
};
