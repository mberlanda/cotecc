import {Suit} from './constants';
import {Card, PlayerHand} from '../types';

const pointsRankMap: {[rank: number]: number} = {
  11: 6,
  10: 5,
  9: 4,
  8: 3,
};

const minRank = 2;
const maxRank = 11;
const maxCardsPerPlayer = 7;
const deckSize = Object.values(Suit).length * (maxRank - minRank + 1);

export const createDeck = (): Card[] => {
  // Implement deck creation logic
  // This may be generalized to fit multiple games
  // and to support different kind of card decks.
  const deck: Card[] = [];

  for (const suit of Object.values(Suit)) {
    for (let rank = minRank; rank <= maxRank; rank++) {
      const points = pointsRankMap[rank] || 0;
      deck.push({suit, rank, points});
    }
  }

  return deck;
};

export const shuffleDeck = (
  deck: Card[],
  rng: () => number = Math.random,
): Card[] => {
  // Implement shuffling logic
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const sortCards = (deck: Card[]): Card[] => {
  return deck.sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank);
};

export const cardsPerPlayerFor = (playersCount: number): number => {
  if (playersCount <= 0) {
    throw RangeError(`Invalid number of players ${playersCount}`);
  }

  return Math.min(maxCardsPerPlayer, Math.floor(deckSize / playersCount));
};

export const dealCards = (deck: Card[], players: PlayerHand[]): void => {
  // Implement card dealing logic
  const cardsPerPlayer = cardsPerPlayerFor(players.length);
  if (cardsPerPlayer * players.length > deck.length) {
    throw RangeError(
      `Invalid number of players ${players.length} for cardsPerPlayer ${cardsPerPlayer}`,
    );
  }
  for (const player of players) {
    player.cards = [];
    Object.keys(player.cardsBySuit).forEach((suit: string) => {
      player.cardsBySuit[suit as Suit] = [];
    });
    for (let i = 0; i < cardsPerPlayer; i++) {
      const card = deck.pop()!;
      player.cardsBySuit[card.suit].push(card);
    }
    Object.keys(player.cardsBySuit).forEach((suit: string) => {
      const sortedCards = sortCards(player.cardsBySuit[suit as Suit]);
      player.cardsBySuit[suit as Suit] = sortedCards;
      player.cards = [...player.cards, ...sortedCards];
    });
  }
};

export const cardIsGreater = (a: Card, b: Card): boolean => {
  if (a.points === b.points) {
    return a.rank > b.rank;
  }
  return a.points > b.points;
};

export const getCardsWithSuit = (suit: Suit | null, hand: Card[]): Card[] => {
  return hand.filter(card => card.suit === suit);
};

// Canonical suit index: pins a stable order independent of locale/string compare.
const SUIT_ORDER: Suit[] = [Suit.Bastoni, Suit.Coppe, Suit.Ori, Suit.Spade];

// Value equality: two cards are the same iff suit AND rank match. Points are
// host-derived and ignored, so a rehydrated/wire card compares equal to the held one.
export const cardsEqual = (
  a: {suit: Suit; rank: number},
  b: {suit: Suit; rank: number},
): boolean => a.suit === b.suit && a.rank === b.rank;

// Total order on cards: suit (by SUIT_ORDER) then rank ascending. Use as a
// comparator. Guarantees a deterministic, locale-independent canonical ordering.
export const canonicalCardOrder = (a: Card, b: Card): number => {
  const s = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
  return s !== 0 ? s : a.rank - b.rank;
};

// Return a NEW array sorted in canonical order (does not mutate the input).
export const sortCanonical = (cards: Card[]): Card[] =>
  [...cards].sort(canonicalCardOrder);
