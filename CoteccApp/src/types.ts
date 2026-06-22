import {Suit} from './utils/constants';

export type PlayerID = number;

export interface Card {
  readonly suit: Suit;
  readonly rank: number;
  readonly points: number;
}

// A value-only reference to a card (suit + rank). Points are host-derived and are
// never trusted from a client, so a CardRef intentionally omits them.
export interface CardRef {
  readonly suit: Suit;
  readonly rank: number;
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
  // Player IDs in the order they were permanently eliminated (earliest first).
  // Drives the final standings / podium.
  eliminationOrder: PlayerID[];
}

export const newSuitMap = <T>(createDefaultValue: () => T): Record<Suit, T> => {
  return Object.fromEntries(
    Object.values(Suit)
      .filter(value => typeof value === 'string')
      .map(suit => [suit, createDefaultValue()]),
  ) as Record<Suit, T>;
};
