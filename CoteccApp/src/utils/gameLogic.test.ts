import { describe, expect, it } from '@jest/globals';

import { createDeck, dealCards, shuffleDeck, sortCards } from './gameLogic';

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
            { suit: "ori", rank: 7, points: 0 },
            { suit: "spade", rank: 5, points: 0 },
            { suit: "ori", rank: 5, points: 0 },
            { suit: "bastoni", rank: 9, points: 4 },
            { suit: "coppe", rank: 1, points: 6 },
        ];
        const expectedSortedDeck = [
            { suit: "bastoni", rank: 9, points: 4 },
            { suit: "coppe", rank: 1, points: 6 },
            { suit: "ori", rank: 5, points: 0 },
            { suit: "ori", rank: 7, points: 0 },
            { suit: "spade", rank: 5, points: 0 },
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
            { name: 'foo', hand: [], boleCount: 0, score: 0 },
            { name: 'bar', hand: [], boleCount: 0, score: 0 },
            { name: 'baz', hand: [], boleCount: 0, score: 0 },
        ];
        dealCards(deck, players);
        players.forEach(player => {
            expect(player.hand).toHaveLength(7);
        });
    });
});