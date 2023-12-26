import {Suit} from './utils/constants';

export interface Card {
  readonly suit: Suit;
  readonly rank: number;
  readonly points: number;
}

export interface Move {
  readonly playerID: number;
  readonly card: Card;
}

export interface Player {
  readonly ID: number;
  readonly name: string;
  readonly isHuman: boolean;
  lifeCount: number;
}

export interface PlayerHand {
  readonly isHuman: boolean;
  readonly playerID: number;
  cards: Card[];
  cardsBitMap: Record<Suit, number>;
}

export interface Turn {
  currentPlayerID: number;
  moves: Move[];
  score: number;
  highestCard?: Card; // Highest card played in the turn
  suit?: Suit; // Suit that must be followed, if applicable
  winnerID?: number; // ID of the player who won the last round
}

export interface Round {
  readonly ID: number;
  readonly initialPlayerID: number;
  players: PlayerHand[];
  // playerHandsCountMap: Record<number, number>;
  playersScoreMap: {[playerID: number]: number};
  currentTurn: Turn;
  pastTurns: Turn[];
  playedCardsBitMap: Record<Suit, number>;
  losersID: number[];
  // playedCardsCountMap: Record<Suit, number>;
  // scores: {[playerID: number]: number};
}

export interface GameState {
  players: Player[];
  currentRound: Round;
  pastRounds: Round[];
}

export const newSuitMap = <T>(defaultValue: T): Record<Suit, T> => {
  return Object.fromEntries(
    Object.values(Suit)
      .filter(value => typeof value === 'string')
      .map(suit => [suit, defaultValue]),
  ) as Record<Suit, T>;
};
