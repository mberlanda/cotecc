import {describe, expect, it} from '@jest/globals';

import {
  cardIsGreater,
  createDeck,
  dealCards,
  getCardsWithSuit,
  shuffleDeck,
  sortCards,
} from './cardsLogic';
import {Suit} from './constants';

describe('createDeck', () => {
  it('creates a deck of 40 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);
  });

  it('creates a deck with correct suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(card => card.suit));
    expect(suits).toEqual(new Set(['bastoni', 'coppe', 'ori', 'spade']));
  });

  it('creates a deck with correct ranks', () => {
    const deck = createDeck();
    const ranks = new Set(deck.map(card => card.rank));
    const expectedRanks = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ranks).toEqual(expectedRanks);
  });
});

describe('sortCards', () => {
  it('returns cards sorted by suit and number', () => {
    const shuffledPartialDeck = [
      {suit: Suit.Ori, rank: 7, points: 0},
      {suit: Suit.Spade, rank: 5, points: 0},
      {suit: Suit.Ori, rank: 5, points: 0},
      {suit: Suit.Bastoni, rank: 9, points: 4},
      {suit: Suit.Coppe, rank: 1, points: 6},
    ];
    const expectedSortedDeck = [
      {suit: Suit.Bastoni, rank: 9, points: 4},
      {suit: Suit.Coppe, rank: 1, points: 6},
      {suit: Suit.Ori, rank: 5, points: 0},
      {suit: Suit.Ori, rank: 7, points: 0},
      {suit: Suit.Spade, rank: 5, points: 0},
    ];

    expect(sortCards(shuffledPartialDeck)).toEqual(expectedSortedDeck);
  });
});

describe('shuffleDeck', () => {
  it('returns a deck with the same number of cards', () => {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck([...deck]);
    expect(shuffledDeck).toHaveLength(deck.length);
  });

  it('returns a deck in a different order', () => {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck([...deck]);
    expect(shuffledDeck).not.toEqual(deck);
  });

  it('contains all the same cards after shuffle', () => {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck([...deck]);
    const sortedDeck = sortCards(deck);
    const sortedShuffledDeck = sortCards(shuffledDeck);
    expect(sortedShuffledDeck).toEqual(sortedDeck);
  });
});

describe('dealCards', () => {
  it('deals 7 cards to each player', () => {
    const deck = shuffleDeck(createDeck());
    const players = [
      {ID: 0, name: 'foo', hand: [], boleCount: 0, score: 0, isHuman: true},
      {ID: 1, name: 'bar', hand: [], boleCount: 0, score: 0, isHuman: false},
      {ID: 2, name: 'baz', hand: [], boleCount: 0, score: 0, isHuman: true},
    ];
    dealCards(deck, players);
    players.forEach(player => {
      expect(player.hand).toHaveLength(7);
    });
  });
});

describe('cardIsGreater', () => {
  it('handles two cards with the same points based on rank', () => {
    const a = {suit: Suit.Ori, rank: 6, points: 0};
    const b = {suit: Suit.Ori, rank: 4, points: 0};

    expect(cardIsGreater(a, b)).toBeTruthy();
  });

  it('handles two cards with the different points', () => {
    const a = {suit: Suit.Ori, rank: 9, points: 4};
    const b = {suit: Suit.Ori, rank: 4, points: 0};

    expect(cardIsGreater(a, b)).toBeTruthy();
  });

  it('handles ace special case', () => {
    const a = {suit: Suit.Ori, rank: 1, points: 6};
    const b = {suit: Suit.Ori, rank: 9, points: 4};

    expect(cardIsGreater(a, b)).toBeTruthy();
  });

  it('disregards card suit - not a legit use case', () => {
    const a = {suit: Suit.Ori, rank: 7, points: 0};
    const b = {suit: Suit.Spade, rank: 9, points: 4};

    expect(cardIsGreater(a, b)).toBeFalsy();
  });

  it('returns false on identical cards - not a legit use case', () => {
    const a = {suit: Suit.Ori, rank: 7, points: 0};
    const b = {suit: Suit.Spade, rank: 7, points: 0};

    expect(cardIsGreater(a, b)).toBeFalsy();
  });
});

describe('getCardsWithSuit', () => {
  it('returns empty array when suit is null', () => {
    const suit = null;
    const hand = [{suit: Suit.Ori, rank: 7, points: 0}];

    expect(getCardsWithSuit(suit, hand)).toEqual([]);
  });

  it('returns empty array when hand does not contain any card with given suit', () => {
    const suit = Suit.Spade;
    const hand = [{suit: Suit.Ori, rank: 7, points: 0}];

    expect(getCardsWithSuit(suit, hand)).toEqual([]);
  });

  it('returns all cards with given suit', () => {
    const suit = Suit.Spade;
    const hand = [
      {suit: Suit.Ori, rank: 7, points: 0},
      {suit: Suit.Spade, rank: 3, points: 0},
      {suit: Suit.Spade, rank: 4, points: 0},
    ];
    const expected = [
      {suit: Suit.Spade, rank: 3, points: 0},
      {suit: Suit.Spade, rank: 4, points: 0},
    ];

    expect(getCardsWithSuit(suit, hand).sort()).toEqual(expected.sort());
  });
});
