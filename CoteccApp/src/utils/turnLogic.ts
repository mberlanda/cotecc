import {cardIsGreater, resetCardsBitMap} from './cardsLogic';
import {nextPlayerID} from './playerHandLogic';
import {Card, PlayerHand, Round, Turn} from '../types';

export const newTurn = (playerID: number): Turn => {
  return {
    currentPlayerID: playerID,
    moves: [],
    score: 0,
  };
};

/**
 * `handleNextMove` returns true when the turn is still active and false when
 * the turn is over
 */
export const handleNextMove = (
  currentTurn: Turn,
  currentRound: Round,
): boolean => {
  // When all players made their move, the round is over
  const playersCount = currentRound.players.length;
  if (currentTurn.moves.length === playersCount) {
    // All players have moved
    return false;
  }

  currentTurn.currentPlayerID = nextPlayerID(
    currentRound.players,
    currentTurn.currentPlayerID,
  );

  return true;
};

/**
 * `handleTurnEnd` returns true when the round is still active and false when
 * the round is over
 */
export const handleTurnEnd = (
  currentTurn: Turn,
  currentRound: Round,
): boolean => {
  const score = currentTurn.moves.reduce((s, m) => s + m.card.points, 0);
  const winnerID = currentTurn.winnerID!;
  currentRound.pastTurns.push(currentTurn);
  currentRound.playersScoreMap[winnerID] += score;
  // When a player does not have card in their hand, the round is over
  if (currentRound.players[0].cards.length > 0) {
    currentRound.currentTurn = newTurn(winnerID);
    return true;
  } else {
    // The last hand awards an additional 6 points.
    currentRound.playersScoreMap[winnerID] += 6;
    return false;
  }
};

export const handleCardPlayed = (
  currentTurn: Turn,
  hand: PlayerHand,
  playedCard: Card,
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
  if (!currentTurn.suit) {
    currentTurn.suit = playedCard.suit;
  }

  // Update the highest card if applicable
  if (
    !currentTurn.highestCard ||
    (playedCard.suit === currentTurn.suit &&
      cardIsGreater(playedCard, currentTurn.highestCard))
  ) {
    currentTurn.highestCard = playedCard;
    currentTurn.winnerID = hand.playerID;
  }

  const removedCard = hand.cards.splice(cardIndex, 1);
  currentTurn.moves.push({
    playerID: hand.playerID,
    card: removedCard[0],
  });
  resetCardsBitMap(hand.cardsBitMap, removedCard[0]);
};
