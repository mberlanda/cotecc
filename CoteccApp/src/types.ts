import {Suit} from './utils/constants';

export interface Card {
  suit: Suit;
  rank: number;
  points: number;
}

export interface Player {
  readonly ID: number;
  readonly name: string;
  readonly isHuman: boolean;
  lifeCount: number;
  hand: Card[];
}

export interface Move {
  playerID: number;
  card: Card;
}

export interface Turn {
  currentPlayerID: number;
  highestCard: Card | null; // Highest card played in the turn
  moves: Move[];
  suit: Suit | null; // Suit that must be followed, if applicable
  winnerID: number | null; // ID of the player who won the last round
}

export interface GameState {
  players: Player[];
  initialPlayerID: number;
  deck: Card[];
  currentTurn: Turn;
  pastTurns: Turn[];
  scores: {[playerID: number]: number};
}
