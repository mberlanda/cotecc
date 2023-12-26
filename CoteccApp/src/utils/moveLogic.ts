import {Card, PlayerHand, Turn} from '../types';

export const validateMove = (
  currentTurn: Turn,
  hand: PlayerHand,
  playedCard: Card,
): boolean => {
  try {
    validateCurrentPlayer(currentTurn, hand.playerID);
    validateSuit(currentTurn, hand, playedCard);
    return true;
  } catch (err) {
    console.log(err);
    // TODO: return an exception visible in the UI
    return false;
  }
};

const validateCurrentPlayer = (currentTurn: Turn, playerID: number): void => {
  if (currentTurn.currentPlayerID !== playerID) {
    throw Error(
      `Player ${playerID} tried to play while it was player ${currentTurn.currentPlayerID} move`,
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
  const hasSuit = hand.cardsBitMap[currentSuit];
  if (hasSuit) {
    console.log(JSON.stringify(hand));
    throw Error(
      `Illegal move. Player ${hand.playerID} should respect ${currentSuit}`,
    );
  }
};
