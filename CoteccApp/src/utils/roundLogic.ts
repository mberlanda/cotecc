import {newPlayersHand} from './playerHandLogic';
import {nextPlayerID} from './playerLogic';
import {genDealSeed, makeRng} from './prng';
import {newTurn} from './turnLogic';
import {
  GameState,
  Player,
  PlayerID,
  Round,
  RoundOutcome,
  RoundResult,
} from '../types';

export const newRound = (
  ID: number,
  initialPlayerID: PlayerID,
  players: Player[],
  dealSeed: string = genDealSeed(),
): Round => {
  // dealSeed is host-internal (kept by the host/session for replay), never stored on
  // Round so it can't leak through serialization. Default-random preserves offline play.
  const rng = makeRng(dealSeed);
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    players: newPlayersHand(players, rng),
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

export const computeRoundOutcome = (currentRound: Round): RoundResult => {
  const turnWinnersSet = new Set(currentRound.pastTurns.map(t => t.winnerID));
  // A player taking all cards does a "capòt", reducing their score by one,
  // while others increase by one
  let roundLosers: Set<PlayerID> = new Set();
  if (turnWinnersSet.size === 1) {
    // Guaranteed defined: this branch only runs when the set has exactly one entry.
    const winnerID = turnWinnersSet.values().next().value as PlayerID;
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

export const roundIsOver = (currentRound: Round): boolean => {
  return currentRound.players.reduce(
    (acc, hand) => acc && hand.cards.length === 0,
    true,
  );
};
