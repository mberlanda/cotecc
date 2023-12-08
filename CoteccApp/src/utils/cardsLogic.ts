import { Card, Player } from '../types';
import { Suit } from './constants';

export const createDeck = (): Card[] => {
    // Implement deck creation logic
    // This may be generalized to fit multiple games
    // and to support different kind of card decks.
    const deck: Card[] = [];

    for (const suit of Object.values(Suit)) {
        for (let rank = 1; rank <= 10; rank++) {
            let points = 0;
            if (rank === 1) { // Ace
                points = 6;
            } else if (rank === 10) {
                points = 5;
            } else if (rank === 9) {
                points = 4;
            } else if (rank === 8) {
                points = 3;
            }
            deck.push({ suit, rank, points });
        }
    }

    return deck;

};

export const shuffleDeck = (deck: Card[]): Card[] => {
    // Implement shuffling logic
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

export const sortCards = (deck: Card[]): Card[] => {
    return deck.sort((a, b) => {
        if (a.suit === b.suit) {
            // TODO: update to take in account points
            return a.rank - b.rank;
        }
        return a.suit.localeCompare(b.suit);
    });
}

export const dealCards = (deck: Card[], players: Player[]): void => {
    // Implement card dealing logic
    const cardsPerPlayer = 7;
    if ((cardsPerPlayer * players.length) > deck.length) {
        throw RangeError(
            `Invalid number of players ${players.length} for cardsPerPlayer ${cardsPerPlayer}`
        );
    }
    for (const player of players) {
        const cards = [];
        for (let i = 0; i < cardsPerPlayer; i++) {
            cards.push(deck.pop()!);
        }
        player.hand = sortCards(cards);
    }
};

export const cardIsGreater = (a: Card, b: Card): boolean => {
    return a.points > b.points || a.rank > b.rank;
}