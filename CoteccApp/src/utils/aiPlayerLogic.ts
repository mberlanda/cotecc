import {cardIsGreater, getCardsWithSuit} from './cardsLogic';
import {Suit} from './constants';
import {Move, PlayerHand, Turn} from '../types';

// TODO: think about a strategy to set different difficulty levels
// TODO: think about either playing for capot or for making less points
export const aiMoveToPlay = (
  hand: PlayerHand,
  currentTurn: Turn,
  pastTurns: Turn[],
): Move => {
  if (!hand.cards.length) {
    throw Error(`AI player ${hand.playerID} does not own any card`);
  }

  // RULE-1 if player has a single card, it would play it
  if (hand.cards.length === 1) {
    console.log(`Player ${hand.playerID}: RULE-1 single card`);
    return {
      card: hand.cards[0],
      playerID: hand.playerID,
    };
  }

  // TODO-2: pastTurns and currentTurns should be modeled
  // so that ai player can consume card already played by
  // suit and make decisions based on the cards in their
  // hand
  const currentSuit: Suit | null = currentTurn.suit;
  const isFirstToMove: boolean = !currentSuit;
  const cardsOfSameSuit: number = currentSuit
    ? hand.cardsBySuit[currentSuit].length
    : 0;
  const hasSameSuit: boolean = cardsOfSameSuit > 0;

  // RULE-2 respects the rule of responding with the same suit
  if (currentSuit && hasSameSuit) {
    // 2.a only one eligible card is a forced move
    if (cardsOfSameSuit === 1) {
      console.log(`Player ${hand.playerID}: RULE-2.A only one eligible card`);
      return {
        card: hand.cardsBySuit[currentSuit][0],
        playerID: hand.playerID,
      };
    }

    const highestInSuit = hand.cardsBySuit[currentSuit].reduce((c1, c2) =>
      cardIsGreater(c1, c2) ? c1 : c2,
    );
    // 2.b highest card is lower than the current highest
    if (highestInSuit.rank < (currentTurn.highestCard?.rank || 0)) {
      // TODO: reconsider this behavior depending the on what has been played previously
      console.log(
        `Player ${hand.playerID}: RULE-2.B highest in rank lower than already played`,
      );
      return {
        card: highestInSuit,
        playerID: hand.playerID,
      };
    }
  }

  // RULE-3 When no past turn
  const fewestSuit = Object.entries(hand.cardsBySuit)
    .filter(([_, value]) => value.length > 0)
    .reduce((a, b) => (a[1].length <= b[1].length ? a : b))[0] as Suit;

  if (!pastTurns.length && fewestSuit) {
    const highestOfFewestSuit = hand.cardsBySuit[fewestSuit].reduce((c1, c2) =>
      cardIsGreater(c1, c2) ? c1 : c2,
    );
    // 3.a if first player to move
    if (isFirstToMove) {
      // Highest rank from the fewest suit
      console.log(
        `Player ${hand.playerID}: RULE-3.A first move no previous turn`,
      );
      return {
        card: highestOfFewestSuit,
        playerID: hand.playerID,
      };
    }
    // 3.b if cannot reply with the same suit
    if (!hasSameSuit) {
      // TODO: reconsider this behavior depending the on what has been played previously
      console.log(
        `Player ${hand.playerID}: RULE-3.B not same suit no previous turn`,
      );
      return {
        card: highestOfFewestSuit,
        playerID: hand.playerID,
      };
    }
  }

  // TODO: implement some logic here
  if (hasSameSuit) {
    // TODO: group cards by suit in hand
    const cardsWithSuit = getCardsWithSuit(currentTurn.suit, hand.cards);

    console.log(`Player ${hand.playerID}: RANDOM same suit`);
    return {
      card: cardsWithSuit[Math.floor(Math.random() * cardsWithSuit.length)],
      playerID: hand.playerID,
    };
  }

  console.log(`Player ${hand.playerID}: RANDOM any suit`);
  return {
    card: hand.cards[Math.floor(Math.random() * hand.cards.length)],
    playerID: hand.playerID,
  };
};
