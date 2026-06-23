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

export type JoinResult =
  | {ok: true; seatId: SeatId; seatToken: string}
  | {ok: false; code: 'TABLE_FULL'};

export type BindResult = {ok: true} | {ok: false; code: 'BAD_SEAT_TOKEN'};

// Minimal 1A reconnect: the host re-projects a fresh SeatView for a returning client
// (the view already carries stateVersion/serverSeq), or reports the seat is gone.
// Full pause/AI/heartbeat policy is Phase 1B.
export type ResumeResult =
  | {ok: true; view: SeatView}
  | {ok: false; code: 'SEAT_EXPIRED'};

// Default resume-token generator. Portable (no Node crypto) so the same GameSession
// runs in the RN host and the Node harness. The native host MAY inject a
// crypto-strong generator via the constructor for production hardening (SEC).
const defaultTokenGen = (): string =>
  `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}-${Math.random().toString(36).slice(2)}`;

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
  // connection -> seat binding (seat is derived from the connection, never the payload)
  private connToSeat = new Map<string, SeatId>();
  // issued resume tokens per seat (validates reconnect via bind)
  private seatTokens = new Map<SeatId, string>();
  private genToken: () => string;

  constructor(
    state: GameState,
    seats: Seat[],
    opts: {genToken?: () => string} = {},
  ) {
    this.state = state;
    this.seats = seats;
    this.genToken = opts.genToken ?? defaultTokenGen;
  }

  // Assign the first free, non-host seat to a connection and issue a resume token.
  // The host occupies its own seat locally and does not join over the wire.
  join(connId: string, info: {displayName: string}): JoinResult {
    const seat = this.seats.find(
      s => !s.isHostSeat && !this.seatTokens.has(s.seatId),
    );
    if (!seat) {
      return {ok: false, code: 'TABLE_FULL'};
    }
    const seatToken = this.genToken();
    this.seatTokens.set(seat.seatId, seatToken);
    this.connToSeat.set(connId, seat.seatId);
    if (info.displayName) {
      seat.displayName = info.displayName;
    }
    seat.connection = 'connected';
    return {ok: true, seatId: seat.seatId, seatToken};
  }

  // Re-attach a (possibly new) connection to a seat using the issued resume token.
  bind(connId: string, seatId: SeatId, seatToken: string): BindResult {
    const expected = this.seatTokens.get(seatId);
    if (!expected || expected !== seatToken) {
      return {ok: false, code: 'BAD_SEAT_TOKEN'};
    }
    this.connToSeat.set(connId, seatId);
    const seat = this.seats.find(s => s.seatId === seatId);
    if (seat) {
      seat.connection = 'connected';
    }
    return {ok: true};
  }

  seatForConn(connId: string): SeatId | undefined {
    return this.connToSeat.get(connId);
  }

  unbind(connId: string): void {
    this.connToSeat.delete(connId);
  }

  // Resume by token: returns a fresh snapshot if the seat token is still valid, else
  // SEAT_EXPIRED (e.g. the table was torn down / the token was never issued).
  snapshotForResume(seatToken: string): ResumeResult {
    const entry = [...this.seatTokens.entries()].find(
      ([, token]) => token === seatToken,
    );
    if (!entry) {
      return {ok: false, code: 'SEAT_EXPIRED'};
    }
    return {ok: true, view: this.viewFor(entry[0])};
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
