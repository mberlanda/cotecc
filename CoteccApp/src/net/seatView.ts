import {Card, CardRef, GameState, Round} from '../types';
import {Controller, Seat, SeatConnection, seatForPlayer, SeatId} from './seat';
import {Suit} from '../utils/constants';

export interface SeatSummary {
  seatId: SeatId;
  displayName: string;
  cardCount: number; // public count only — never the cards
  lives: number;
  roundScore: number;
  controller: Controller;
  connection: SeatConnection;
  graceUntil?: number; // epoch ms; present only when connection==='grace' (RC3-UX-001)
}

export type SeatPhase =
  | 'lobby'
  | 'dealing'
  | 'playing'
  | 'roundEnd'
  | 'gameOver';

export interface SeatView {
  localSeatId: SeatId;
  localHand: Card[]; // ONLY the recipient's hand
  seats: SeatSummary[];
  currentTrick: {seatId: SeatId; card: Card}[];
  turn: {currentSeatId: SeatId | null; suit: Suit | null};
  phase: SeatPhase;
  legalActions: CardRef[]; // host-computed for the local seat
  serverSeq: number;
  stateVersion: number;
  roundId: number;
}

// Suit-following: legal cards are those of the lead suit if held, else any card.
const computeLegalActions = (round: Round, playerId: number): CardRef[] => {
  const hand = round.players.find(h => h.playerID === playerId);
  if (!hand) return [];
  const leadSuit = round.currentTurn.suit;
  const inSuit = leadSuit ? hand.cards.filter(c => c.suit === leadSuit) : [];
  const playable = inSuit.length > 0 ? inSuit : hand.cards;
  return playable.map(c => ({suit: c.suit, rank: c.rank}));
};

// The ONLY host->client state producer. Builds an allowlisted view for one seat.
export const projectStateForSeat = (
  state: GameState,
  seats: Seat[],
  localSeatId: SeatId,
  meta: {serverSeq?: number; stateVersion?: number; phase?: SeatPhase} = {},
): SeatView => {
  const round = state.currentRound;
  const localSeat = seats.find(s => s.seatId === localSeatId);
  const localPlayerId = localSeat?.playerId;
  const localHandObj = round.players.find(h => h.playerID === localPlayerId);

  const summaries: SeatSummary[] = seats.map(seat => {
    const hand = round.players.find(h => h.playerID === seat.playerId);
    const player = state.players.find(p => p.ID === seat.playerId);
    return {
      seatId: seat.seatId,
      displayName: seat.displayName,
      cardCount: hand ? hand.cards.length : 0,
      lives: player ? player.lifeCount : 0,
      roundScore: round.scoresMap[seat.playerId] ?? 0,
      controller: seat.controller,
      connection: seat.connection,
    };
  });

  const currentTrick = round.currentTurn.moves.map(m => {
    const seat = seatForPlayer(seats, m.playerID);
    return {seatId: seat ? seat.seatId : '', card: m.card};
  });

  const currentSeat = seatForPlayer(seats, round.currentTurn.currentPlayerID);
  const phase: SeatPhase = meta.phase ?? 'playing';
  const isLocalTurn =
    phase === 'playing' &&
    currentSeat?.seatId === localSeatId &&
    localPlayerId !== undefined;

  return {
    localSeatId,
    localHand: localHandObj ? [...localHandObj.cards] : [],
    seats: summaries,
    currentTrick,
    turn: {
      currentSeatId: currentSeat ? currentSeat.seatId : null,
      suit: round.currentTurn.suit,
    },
    phase,
    legalActions: isLocalTurn ? computeLegalActions(round, localPlayerId!) : [],
    serverSeq: meta.serverSeq ?? 0,
    stateVersion: meta.stateVersion ?? 0,
    roundId: round.ID,
  };
};
