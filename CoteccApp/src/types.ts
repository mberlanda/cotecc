export interface Card {
    suit: string;
    rank: number;
    points: number;
}

export interface Player {
    ID: number;
    name: string;
    hand: Card[];
    boleCount: number;
    score: number;
}

export interface Move {
    playerID: number;
    card: Card;
}

export interface GameState {
    players: Player[];
    deck: Card[];
    // TODO: consider extracting the current turn attribute into a dedicated interface
    currentHighestCard: Card | null; // Highest card played in the current turn
    currentPlayerID: number;
    currentSuit: string | null; // Suit that must be followed, if applicable
    currentMoves: Move[];
    currentWinnerID: number | null; // ID of the player who won the last round  
    pastTurns: Move[][];
}
