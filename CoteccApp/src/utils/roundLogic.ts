import {newPlayersHand} from './playerHandLogic';
import {nextPlayerID} from './playerLogic';
import {newTurn} from './turnLogic';
import {GameState, Player, PlayerID, Round} from '../types';

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
    players: newPlayersHand(players),
    scoresMap: {},
  };
};

export const nextRound = (gameState: GameState) => {
  const nextInitialPlayerID = nextPlayerID(
    gameState.players.filter(p => p.lifeCount > 0),
    gameState.currentRound.initialPlayerID,
  );
  gameState.currentRound = newRound(
    gameState.currentRound.ID + 1,
    nextInitialPlayerID,
    gameState.players.filter(p => p.lifeCount > 0),
  );
};
