export interface Card {
    suit: string;
    rank: number;
    points: number;
  }
  
  export interface Player {
    hand: Card[];
    boleCount: number;
    score: number;
  }
  
  export interface GameState {
    players: Player[];
    deck: Card[];
    currentTurn: number;
  }
  