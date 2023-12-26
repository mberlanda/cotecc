import {newPlayerHands} from './playerHandLogic';
import {nextPlayerID} from './playerLogic';
import {newTurn} from './turnLogic';
import {GameState, newSuitMap, Player, Round} from '../types';

export const newGame = (players: Player[]): GameState => {
  return {
    currentRound: newRound(1, players[0].ID, players),
    pastRounds: [],
    players: players,
  };
};

export const nextRound = (gameState: GameState) => {
  // This may fallback player of index 0 when the previous
  // the previous initial player was eliminated
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

export const newRound = (
  ID: number,
  initialPlayerID: number,
  players: Player[],
): Round => {
  const playerHands = newPlayerHands(players);

  return {
    ID,
    initialPlayerID,
    playedCardsBitMap: newSuitMap<number>(0b000000000000),
    players: playerHands,
    playersScoreMap: Object.fromEntries(
      playerHands.map(hand => [hand.playerID, 0]),
    ) as Record<number, number>,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    losersID: [],
  };
};

export const handleRoundEnd = (currentRound: Round, gameState: GameState) => {
  const turnWinnersSet = new Set(currentRound.pastTurns.map(t => t.winnerID));
  if (turnWinnersSet.size === 1) {
    console.log('capòt');
    const winnerID = turnWinnersSet.values().next().value;

    for (let i = 0; i < currentRound.players.length; i++) {
      const previousLifeCount = gameState.players[i].lifeCount;
      if (gameState.players[i].ID === winnerID) {
        // TODO: pass max lifeCount from gameState instead of hardcoding 4
        gameState.players[i].lifeCount = Math.max(previousLifeCount + 1, 4);
      } else {
        gameState.players[i].lifeCount = Math.max(previousLifeCount - 1, 0);
      }
    }
  }
  // Take a life away from all players with the highest score
  // This code can be made much more elegant
  else {
    let maxScore = -1;
    let turnLosers: {[playerID: number]: boolean} = {};
    console.log(
      `round scores: ${JSON.stringify(gameState.currentRound.playersScoreMap)}`,
    );
    for (let plID in gameState.currentRound.playersScoreMap) {
      const score = gameState.currentRound.playersScoreMap[plID];
      if (score > maxScore) {
        console.log(
          `score: ${score} prevMaxScore: ${maxScore} playerID: ${plID}`,
        );
        maxScore = score;
        turnLosers = {};
      }
      if (score === maxScore) {
        turnLosers[plID] = true;
      }
    }
    console.log(`turnLosers: ${JSON.stringify(turnLosers)}`);
    gameState.players.forEach(player => {
      if (player.ID in turnLosers) {
        player.lifeCount -= 1;
      }
    });
  }

  checkForElimination(gameState.players);
  gameState.pastRounds.push(currentRound);
};

export const checkForElimination = (players: Player[]): void => {
  // Implement elimination check logic
  players.forEach(player => {
    if (player.lifeCount < 1) {
      // TODO: Additional logic for re-entering the game with a higher score might be needed
    }
  });
};
