import {aiMoveToPlay} from './aiPlayerLogic';
import {cardIsGreater, cardsEqual} from './cardsLogic';
import {validateMove} from './movesLogic';
import {nextHandPlayerID} from './playerHandLogic';
import {updateLivesCount} from './playerLogic';
import {computeRoundOutcome, newRound, nextRound} from './roundLogic';
import {roundIsOver} from './roundLogic';
import {endTurn, resetTurnState} from './turnLogic';
import {
  Card,
  GameState,
  Player,
  PlayerHand,
  PlayerID,
  Round,
  Turn,
} from '../types';

export const newGame = (
  players: Player[],
  initialPlayerID: PlayerID,
  maxLifeCount: number,
): GameState => {
  return {
    players: players,
    initialPlayerID: initialPlayerID,
    currentRound: newRound(1, initialPlayerID, players),
    pastRounds: [],
    maxLifeCount: maxLifeCount,
    eliminationOrder: [],
  };
};

export const playCard = (
  gameState: GameState,
  playerID: PlayerID,
  playedCard: Card,
): void => {
  try {
    const hand = gameState.currentRound.players.find(
      p => p.playerID === playerID,
    )!;
    validateMove(gameState.currentRound.currentTurn, hand, playedCard);
    makeMove(gameState.currentRound.currentTurn, hand, playedCard, () =>
      nextMove(gameState.currentRound, hand, () => endRound(gameState)),
    );
  } catch (err) {
    console.log(err);
    // TODO: return an exception visible in the UI
    return;
  }
};

export const makeMove = (
  currentTurn: Turn,
  hand: PlayerHand,
  playedCard: Card,
  nextMove: () => void,
): void => {
  // Match by VALUE so a rehydrated/wire card resolves to the held card.
  const cardIndex = hand.cards.findIndex(c => cardsEqual(c, playedCard));
  if (cardIndex === -1) {
    throw Error(
      `Player ${hand.playerID} does not own card: ${JSON.stringify(playedCard)}`,
    );
  }
  // Use the HAND's own card from here on: host-derived points, canonical identity.
  const handCard = hand.cards[cardIndex];

  // Update the current suit/highest/winner if this is the first card of the turn.
  currentTurn.suit ||= handCard.suit;
  currentTurn.highestCard ||= handCard;
  currentTurn.winnerID ??= hand.playerID;

  if (
    handCard.suit === currentTurn.suit &&
    cardIsGreater(handCard, currentTurn.highestCard)
  ) {
    currentTurn.highestCard = handCard;
    currentTurn.winnerID = hand.playerID;
  }

  // Remove from BOTH structures by value, atomically (RC3-GAME-001). Resolve the
  // cardsBySuit index BEFORE mutating and guard it: a -1 would make splice(-1, 1)
  // silently drop the wrong card, so a cards/cardsBySuit desync must fail loudly.
  const cardInSuitIndex = hand.cardsBySuit[handCard.suit].findIndex(c =>
    cardsEqual(c, handCard),
  );
  if (cardInSuitIndex === -1) {
    throw Error(
      `cardsBySuit desync: ${handCard.suit} ${handCard.rank} missing for player ${hand.playerID}`,
    );
  }
  hand.cards.splice(cardIndex, 1);
  hand.cardsBySuit[handCard.suit].splice(cardInSuitIndex, 1);

  currentTurn.moves.push({playerID: hand.playerID, card: handCard});

  nextMove();
};

export const nextMove = (
  currentRound: Round,
  hand: PlayerHand,
  endRound: () => void,
): void => {
  // When all players made their move, the round is over
  const playersCount = currentRound.players.length;
  if (currentRound.currentTurn.moves.length === playersCount) {
    // All players have moved
    const winnerID = endTurn(currentRound);
    if (roundIsOver(currentRound)) {
      // The last hand awards an additional 6 points.
      currentRound.scoresMap[winnerID] += 6;
      endRound();
    } else {
      resetTurnState(currentRound, winnerID);
    }
    return;
  }

  currentRound.currentTurn.currentPlayerID = nextHandPlayerID(
    currentRound.players,
    hand.playerID,
  );
};

export const endRound = (gameState: GameState): void => {
  const roundOutcome = computeRoundOutcome(gameState.currentRound);
  gameState.currentRound.result = roundOutcome;
  updateLivesCount(gameState.players, roundOutcome, gameState.maxLifeCount);
  const eliminated = checkForElimination(gameState.players);
  eliminated.forEach(player => {
    if (!gameState.eliminationOrder.includes(player.ID)) {
      gameState.eliminationOrder.push(player.ID);
    }
  });
  gameState.pastRounds.push({...gameState.currentRound});
};

export const checkForElimination = (players: Player[]): Player[] => {
  const activePlayers = players.filter(p => p.lifeCount > 0);
  const eliminatedPlayers = players.filter(p => p.lifeCount === 0);

  if (eliminatedPlayers.length === 0 || activePlayers.length <= 1) {
    return eliminatedPlayers;
  }

  // Re-entry: if there is more than one active player left and the
  // second-lowest life count among active players is > 1, eliminated
  // players can re-enter with 1 life.
  const sortedLives = activePlayers.map(p => p.lifeCount).sort((a, b) => a - b);
  const secondLowest = sortedLives.length > 1 ? sortedLives[1] : sortedLives[0];

  if (secondLowest > 1) {
    eliminatedPlayers.forEach(p => {
      p.lifeCount = 1;
    });
    return [];
  }

  return eliminatedPlayers;
};

export const isGameOver = (players: Player[]): boolean => {
  return players.filter(p => p.lifeCount > 0).length <= 1;
};

// The human player is out as soon as they run out of lives, even if AI players
// are still in the game — at that point the game is over for them.
export const isHumanEliminated = (players: Player[]): boolean => {
  const human = players.find(p => p.isHuman);
  return human !== undefined && human.lifeCount === 0;
};

export const getGameWinner = (players: Player[]): Player | undefined => {
  const activePlayers = players.filter(p => p.lifeCount > 0);
  return activePlayers.length === 1 ? activePlayers[0] : undefined;
};

// Final ranking for the podium: survivors first (most lives wins), then the
// eliminated players from last-eliminated to first-eliminated.
export const getFinalStandings = (gameState: GameState): Player[] => {
  const {players, eliminationOrder} = gameState;
  const survivors = players
    .filter(p => p.lifeCount > 0)
    .sort((a, b) => b.lifeCount - a.lifeCount);
  const eliminated = [...eliminationOrder]
    .reverse()
    .map(id => players.find(p => p.ID === id))
    .filter((p): p is Player => p !== undefined);

  const ranked = [...survivors, ...eliminated];
  // Safety net: append any player not captured above (should not happen).
  const seen = new Set(ranked.map(p => p.ID));
  players.forEach(p => {
    if (!seen.has(p.ID)) {
      ranked.push(p);
    }
  });
  return ranked;
};

// Fast-forward the rest of the game with AI moves until a winner emerges. Used
// when the human is knocked out but we still want the final standings/podium.
export const simulateGameToEnd = (gameState: GameState): void => {
  // Bound the loop so a pathological state can never hang the UI.
  const maxIterations = 10000;
  let iterations = 0;
  while (!isGameOver(gameState.players) && iterations++ < maxIterations) {
    const round = gameState.currentRound;
    if (roundIsOver(round)) {
      nextRound(gameState);
      continue;
    }
    const currentPlayerID = round.currentTurn.currentPlayerID;
    const hand = round.players.find(p => p.playerID === currentPlayerID);
    if (!hand) {
      break;
    }
    const move = aiMoveToPlay(
      hand,
      round.currentTurn,
      round.pastTurns,
      round.players.length,
    );
    playCard(gameState, move.playerID, move.card);
  }
};
