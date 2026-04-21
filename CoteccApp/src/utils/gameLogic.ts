import {cardIsGreater} from './cardsLogic';
import {validateMove} from './movesLogic';
import {nextHandPlayerID} from './playerHandLogic';
import {updateLivesCount} from './playerLogic';
import {computeRoundOutcome, newRound} from './roundLogic';
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
  // Ensure player holds the card selected.
  const cardIndex = hand.cards.findIndex(c => c === playedCard);
  if (cardIndex === -1) {
    throw Error(
      `Player ${hand.playerID} does not own card: ${JSON.stringify(
        playedCard,
      )}`,
    );
  }
  // Update the current suit if this is the first card of the round
  currentTurn.suit ||= playedCard.suit;
  currentTurn.highestCard ||= playedCard;
  currentTurn.winnerID ??= hand.playerID;

  // Update the highest card if applicable
  if (
    playedCard.suit === currentTurn.suit &&
    cardIsGreater(playedCard, currentTurn.highestCard)
  ) {
    currentTurn.highestCard = playedCard;
    currentTurn.winnerID = hand.playerID;
  }

  const removedCard = hand.cards.splice(cardIndex, 1)[0];
  currentTurn.moves.push({
    playerID: hand.playerID,
    card: removedCard,
  });
  const cardInSuitIndex = hand.cardsBySuit[removedCard.suit].findIndex(
    c => c === playedCard,
  );
  hand.cardsBySuit[removedCard.suit].splice(cardInSuitIndex, 1);

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
  checkForElimination(gameState.players);
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

export const getGameWinner = (players: Player[]): Player | undefined => {
  const activePlayers = players.filter(p => p.lifeCount > 0);
  return activePlayers.length === 1 ? activePlayers[0] : undefined;
};
