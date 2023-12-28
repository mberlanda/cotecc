import {Suit} from './utils/constants';

export type PlayerID = number;

export interface Card {
  readonly suit: Suit;
  readonly rank: number;
  readonly points: number;
}

export interface Player {
  readonly ID: PlayerID;
  readonly name: string;
  readonly isHuman: boolean;
  lifeCount: number;
  hand: Card[];
}

export interface Move {
  readonly playerID: PlayerID;
  readonly card: Card;
}

export interface PlayerHand {
  readonly isHuman: boolean;
  readonly playerID: PlayerID;
  cards: Card[];
}

export interface Turn {
  currentPlayerID: PlayerID;
  highestCard: Card | null; // Highest card played in the turn
  moves: Move[];
  suit: Suit | null; // Suit that must be followed, if applicable
  winnerID: PlayerID | null; // ID of the player who won the last round
}

export interface Round {
  readonly ID: number;
  readonly initialPlayerID: PlayerID;
  currentTurn: Turn;
  pastTurns: Turn[];
  players: PlayerHand[];
  scoresMap: {[playerID: PlayerID]: number};
}

export interface GameState {
  players: Player[];
  initialPlayerID: PlayerID;
  deck: Card[];
  currentRound: Round;
  pastRounds: Round[];
  readonly maxLifeCount: number;
}
