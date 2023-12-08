import { Card, Player, GameState } from '../types';
import { cardIsGreater } from './cardsLogic';

export const findPlayerById = (players: Player[], playerID: number): Player => {
    const player = players.find(p => p.ID == playerID);
    if (!player) {
        throw RangeError(`PlayerID ${playerID} out of range`);
    }
    return player;
}

export const playCard = (gameState: GameState, player: Player, playedCard: Card): void => {
    // Implement playing a card logic
    if (gameState.currentPlayerID !== player.ID) {
        // Ensure that a player plays only when it's their turn
        // TODO: return an exception visible in the UI
        return
    }

    // If a suit is set, check if the player follows it
    if (gameState.currentSuit && playedCard.suit !== gameState.currentSuit) {
        // Check if the player has any cards of the current suit
        const hasSuit = findPlayerById(gameState.players, player.ID).hand.some(card => card.suit === gameState.currentSuit);
        if (hasSuit) {
            // Player must play a card of the current suit
            // TODO: return an exception visible in the UI
            return;
        }
    }

    // Update the current suit if this is the first card of the round
    if (!gameState.currentSuit) {
        gameState.currentSuit = playedCard.suit;
    }

    // Update the highest card if applicable
    if (!gameState.currentHighestCard || (playedCard.suit === gameState.currentSuit && cardIsGreater(playedCard, gameState.currentHighestCard))) {
        gameState.currentHighestCard = playedCard;
        gameState.currentWinnerID = player.ID;
    }

    // This function should be more complex, handling game rules and logic
    const cardIndex = player.hand.findIndex(c => c === playedCard);
    if (cardIndex !== -1) {
        const removedCard = player.hand.splice(cardIndex, 1);
        gameState.currentMoves.push({
            playerID: player.ID,
            card: removedCard[0],
        });
    }

    nextMove(gameState, player);
};

export const nextMove = (gameState: GameState, player: Player): void => {
    // When all players made their move, the round is over
    const playersCount = gameState.players.length;
    if (gameState.currentMoves.length == playersCount) {
        // All players have moved
        endTurn(gameState);
        return;
    }

    const currentPlayerIndex = gameState.players.findIndex(p => p.ID == player.ID);
    gameState.currentPlayerID = gameState.players[(currentPlayerIndex + 1) % playersCount].ID;
};

export const endTurn = (gameState: GameState): void => {
    const turn = gameState.currentMoves;
    const score = turn.reduce((s, m) => s + m.card.points, 0);
    gameState.pastTurns.push(turn);
    findPlayerById(gameState.players, gameState.currentWinnerID!).score += score;
    nextTurn(gameState);
};

export const nextTurn = (gameState: GameState): void => {
    // When a player does not have card in their end, the round is over
    if (!gameState.players[0].hand.length) {
        endRound(gameState);
        return;
    }
    gameState.currentPlayerID = gameState.currentWinnerID!;
    gameState.currentSuit = null;
    gameState.currentHighestCard = null;
    gameState.currentMoves = [];
    gameState.currentWinnerID = null;
};

export const endRound = (gameState: GameState): void => {
    // Handle end of a round, such as calculating scores, dealing new cards, etc.
    // Reset players' hands or game state as needed
    // TODO: implement the logic including 6 extra points for the player
    // who collect the last turn
};

export const checkForElimination = (players: Player[]): void => {
    // Implement elimination check logic
    players.forEach(player => {
        if (player.boleCount >= 4) {
            // Eliminate player
            // Additional logic for re-entering the game with a higher score might be needed
            // TODO: implement some logic to mark the player as eliminated
        }
    });
};