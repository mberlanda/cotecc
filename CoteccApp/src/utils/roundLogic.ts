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

export enum RoundOutcome {
  CAPOT, // all hands
  MAX_SCORE,
}

interface RoundResult {
  outcome: RoundOutcome;
  roundLosers: Set<PlayerID>;
  winnerID?: PlayerID;
}

export const computeRoundOutcome = (currentRound: Round): RoundResult => {
  const turnWinnersSet = new Set(currentRound.pastTurns.map(t => t.winnerID));
  // A player taking all cards does a "capòt", reducing their score by one,
  // while others increase by one
  let roundLosers: Set<PlayerID> = new Set();
  if (turnWinnersSet.size === 1) {
    const winnerID: PlayerID = turnWinnersSet.values().next().value;
    currentRound.players.forEach(p => {
      if (p.playerID !== winnerID) {
        roundLosers.add(p.playerID);
      }
    });
    return {
      outcome: RoundOutcome.CAPOT,
      roundLosers,
      winnerID,
    };
  }

  let maxScore = -1;

  for (let playerID in currentRound.scoresMap) {
    const score = currentRound.scoresMap[playerID];
    if (score > maxScore) {
      maxScore = score;
      roundLosers.clear();
    }
    if (score === maxScore) {
      roundLosers.add(Number(playerID));
    }
  }
  return {
    outcome: RoundOutcome.MAX_SCORE,
    roundLosers,
  };
};
