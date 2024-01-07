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
}

export interface Move {
  readonly playerID: PlayerID;
  readonly card: Card;
}

export interface PlayerHand {
  readonly isHuman: boolean;
  readonly playerID: PlayerID;
  cards: Card[];
  cardsBySuit: Record<Suit, Card[]>;
}

export interface Turn {
  currentPlayerID: PlayerID;
  highestCard: Card | null; // Highest card played in the turn
  moves: Move[];
  suit: Suit | null; // Suit that must be followed, if applicable
  winnerID: PlayerID | null; // ID of the player who won the last round
}

export enum RoundOutcome {
  CAPOT, // all hands
  MAX_SCORE,
}

export interface RoundResult {
  outcome: RoundOutcome;
  roundLosers: Set<PlayerID>;
  winnerID?: PlayerID;
}

export interface Round {
  readonly ID: number;
  readonly initialPlayerID: PlayerID;
  currentTurn: Turn;
  pastTurns: Turn[];
  players: PlayerHand[];
  scoresMap: {[playerID: PlayerID]: number};
  result?: RoundResult; // TODO: use this to display the outcome of the round in the UX
}

export interface GameState {
  players: Player[];
  initialPlayerID: PlayerID;
  currentRound: Round;
  pastRounds: Round[];
  readonly maxLifeCount: number;
}

export const newSuitMap = <T>(defaultValue: T): Record<Suit, T> => {
  return Object.fromEntries(
    Object.values(Suit)
      .filter(value => typeof value === 'string')
      .map(suit => [suit, defaultValue]),
  ) as Record<Suit, T>;
};
