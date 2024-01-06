import {Card, Move, PlayerHand, Turn} from '../types';

export const calculateScore = (moves: Move[]): number => {
  return moves.reduce((acc, m) => acc + m.card.points, 0);
};

export class ValidationError extends Error {}
type MoveValidationFn = (
  turn: Turn,
  hand: PlayerHand,
  playedCard: Card,
) => void;
enum MoveValidationRule {
  PLAYER_TURN_VALIDATION,
  SUIT_TURN_VALIDATION,
}

const validateCurrentPlayer = (currentTurn: Turn, hand: PlayerHand): void => {
  if (currentTurn.currentPlayerID !== hand.playerID) {
    throw new ValidationError(
      `Player ${hand.playerID} tried to play while it was player ${currentTurn.currentPlayerID} move`,
    );
  }
};

const validateSuit = (
  currentTurn: Turn,
  hand: PlayerHand,
  playedCard: Card,
): void => {
  const currentSuit = currentTurn.suit;
  if (!currentSuit || playedCard.suit === currentSuit) {
    return;
  }
  const hasSuit = hand.cards.some(card => card.suit === currentSuit);
  if (hasSuit) {
    throw new ValidationError(
      `Illegal move. Player ${hand.playerID} should respect ${currentSuit}`,
    );
  }
};

const moveValidationRegistry: {[fn in MoveValidationRule]: MoveValidationFn} = {
  [MoveValidationRule.PLAYER_TURN_VALIDATION]: validateCurrentPlayer,
  [MoveValidationRule.SUIT_TURN_VALIDATION]: validateSuit,
};

export const validateMove: MoveValidationFn = (...args) => {
  Object.values(moveValidationRegistry).forEach(rule => rule(...args));
};
