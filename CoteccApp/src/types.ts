import {Suit} from './utils/constants';

export interface Card {
  readonly suit: Suit;
  readonly rank: number;
  readonly points: number;
}

export interface Player {
  readonly ID: number;
  readonly name: string;
  readonly isHuman: boolean;
  lifeCount: number;
  hand: Card[];
}

export interface Move {
  readonly playerID: number;
  readonly card: Card;
}

export interface PlayerHand {
  readonly isHuman: boolean;
  readonly playerID: number;
  cards: Card[];
}

export interface Turn {
  currentPlayerID: number;
  highestCard: Card | null; // Highest card played in the turn
  moves: Move[];
  suit: Suit | null; // Suit that must be followed, if applicable
  winnerID: number | null; // ID of the player who won the last round
}

export interface Round {
  readonly ID: number;
  readonly initialPlayerID: number;
  currentTurn: Turn;
  pastTurns: Turn[];
  scoresMap: {[playerID: number]: number};
  players?: PlayerHand[]; // TODO: enable in the next commit
}

export interface GameState {
  players: Player[];
  initialPlayerID: number;
  deck: Card[];
  currentRound: Round;
  pastRounds: Round[];
  readonly maxLifeCount: number;
}
