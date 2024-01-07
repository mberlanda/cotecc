import {getCardsWithSuit} from './cardsLogic';
import {Suit} from './constants';
import {Card, Move, newSuitMap, PlayerHand, Turn} from '../types';

type SuitCardsRecord = Record<Suit, Card | null>;
type SuitCountRecord = Record<Suit, number>;

// TODO-1: player hand may be refactored to perform
// this transformation only when we deal cards
interface ComputedCards {
  fewestSuit: Suit | null;
  highestRankInSuit: Record<Suit, Card | null>;
  suitCounts: SuitCountRecord;
}

const computeCards = (cards: Card[]): ComputedCards => {
  let fewestSuit: Suit | null = null;
  const highestRankInSuit: SuitCardsRecord = newSuitMap<null>(null);
  const suitCounts: SuitCountRecord = newSuitMap<number>(0);

  cards.forEach((card: Card) => {
    suitCounts[card.suit] += 1;
    const highestCard = highestRankInSuit[card.suit];
    if (!highestCard || card.rank > highestCard.rank) {
      highestRankInSuit[card.suit] = card;
    }
    if (fewestSuit === null || suitCounts[card.suit] < suitCounts[fewestSuit]) {
      fewestSuit = card.suit;
    }
  });

  return {
    fewestSuit,
    highestRankInSuit,
    suitCounts,
  };
};

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

  const computedHand = computeCards(hand.cards);
  // TODO-2: pastTurns and currentTurns should be modeled
  // so that ai player can consume card already played by
  // suit and make decisions based on the cards in their
  // hand
  const currentSuit: Suit | null = currentTurn.suit;
  const isFirstToMove: boolean = !currentSuit;
  const cardsOfSameSuit: number = currentSuit
    ? computedHand.suitCounts[currentSuit]
    : 0;
  const hasSameSuit: boolean = cardsOfSameSuit > 0;

  // RULE-2 respects the rule of responding with the same suit
  if (currentSuit && hasSameSuit) {
    const highestInSuit = computedHand.highestRankInSuit[currentSuit] as Card;

    // 2.a only one eligible card is a forced move
    if (cardsOfSameSuit === 1) {
      console.log(`Player ${hand.playerID}: RULE-2.A only one eligible card`);
      return {
        card: highestInSuit,
        playerID: hand.playerID,
      };
    }

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
  if (
    !pastTurns.length &&
    computedHand.fewestSuit &&
    computedHand.highestRankInSuit[computedHand.fewestSuit]
  ) {
    const highestOfFewestSuit = computedHand.highestRankInSuit[
      computedHand.fewestSuit
    ] as Card;
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
