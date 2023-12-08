import { Card, Player, GameState } from '../types';
import { Suit } from './constants';

// Initialize Game Logic

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

// Implement Game Mechanics

export const playCard = (player: Player, card: Card): void => {
    // Implement playing a card logic
    // This function should be more complex, handling game rules and logic
    const cardIndex = player.hand.findIndex(c => c === card);
    if (cardIndex !== -1) {
        player.hand.splice(cardIndex, 1);
    }

    // Additional game logic goes here
};

export const calculateScore = (player: Player): void => {
    // Implement score calculation logic
    player.score = player.hand.reduce((score, card) => score + card.points, 0);
};

export const checkForElimination = (players: Player[]): void => {
    // Implement elimination check logic
    players.forEach(player => {
        if (player.boleCount >= 4) {
            // Eliminate player
            // Additional logic for re-entering the game with a higher score might be needed
        }
    });
};

export const nextTurn = (gameState: GameState): boolean => {
    // Increment the currentTurn, and check if the round should end
    gameState.currentTurn = (gameState.currentTurn + 1) % gameState.players.length;
    return gameState.currentTurn === 0; // Example condition for round end
};

export const endRound = (gameState: GameState): void => {
    // Handle end of a round, such as calculating scores, dealing new cards, etc.
    // Reset players' hands or game state as needed
};
