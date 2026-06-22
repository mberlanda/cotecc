import {applyMove} from '../engine/applyMove';
import {GameState} from '../types';
import {PlayMovePayload} from './protocol';
import {Seat, SeatId} from './seat';
import {projectStateForSeat, SeatPhase, SeatView} from './seatView';

export type SubmitResult =
  | {ok: true}
  | {
      ok: false;
      code:
        | 'NOT_YOUR_TURN'
        | 'CARD_NOT_IN_HAND'
        | 'MUST_FOLLOW_SUIT'
        | 'ROUND_NOT_ACTIVE'
        | 'GAME_OVER'
        | 'STALE_STATE';
      message: string;
    };

// Authoritative host session: applies/validates commands, owns serverSeq/stateVersion,
// enforces per-seat clientSeq ordering, and projects redacted SeatViews.
export class GameSession {
  private state: GameState;
  private seats: Seat[];
  private serverSeq = 0;
  private stateVersion = 0;
  private phase: SeatPhase = 'playing';
  // last accepted clientSeq per seat (ordering / idempotency)
  private lastClientSeq = new Map<SeatId, number>();

  constructor(state: GameState, seats: Seat[]) {
    this.state = state;
    this.seats = seats;
  }

  viewFor(seatId: SeatId): SeatView {
    return projectStateForSeat(this.state, this.seats, seatId, {
      serverSeq: this.serverSeq,
      stateVersion: this.stateVersion,
      phase: this.phase,
    });
  }

  submitMove(seatId: SeatId, payload: PlayMovePayload): SubmitResult {
    const last = this.lastClientSeq.get(seatId) ?? 0;
    // Duplicate or older clientSeq => idempotent re-ack, do NOT re-apply.
    if (payload.clientSeq <= last) {
      return {ok: true};
    }
    // A gap (not strictly next) => client is out of sync.
    if (payload.clientSeq !== last + 1) {
      return {ok: false, code: 'STALE_STATE', message: 'Out of sequence; resync'};
    }
    const seat = this.seats.find(s => s.seatId === seatId);
    if (!seat) {
      return {ok: false, code: 'NOT_YOUR_TURN', message: 'Unknown seat'};
    }
    const res = applyMove(this.state, seat.playerId, payload.cardRef);
    if (!res.ok) {
      return res;
    }
    this.lastClientSeq.set(seatId, payload.clientSeq);
    this.serverSeq += 1;
    this.stateVersion += 1;
    return {ok: true};
  }
}
