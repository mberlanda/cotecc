import {CardRef} from '../types';
import {SeatId} from './seat';
import {SeatSummary, SeatView} from './seatView';

export const PROTOCOL_VERSION = 1 as const;

export type MoveRejectCode =
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'MUST_FOLLOW_SUIT'
  | 'ROUND_NOT_ACTIVE'
  | 'GAME_OVER';

export type ErrorCode =
  | MoveRejectCode
  | 'BAD_SEAT_TOKEN'
  | 'STALE_STATE'
  | 'SEAT_TAKEN'
  | 'TABLE_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'ROOM_TOKEN_EXPIRED'
  | 'UNSUPPORTED_PROTOCOL';

// All message types in the v1 union. (Discriminator = Envelope.type.)
export type MsgType =
  | 'JoinRequest'
  | 'JoinAccepted'
  | 'JoinRejected'
  | 'SeatAssigned'
  | 'LobbyUpdated'
  | 'GameStarted'
  | 'ConfigureTable'
  | 'DealRound'
  | 'PlayMove'
  | 'MoveAccepted'
  | 'MoveRejected'
  | 'SeatSnapshot'
  | 'StateDelta'
  | 'RoundComplete'
  | 'RequestNextRound'
  | 'GameOver'
  | 'Rematch'
  | 'Heartbeat'
  | 'Ack'
  | 'SeatExpired'
  | 'Bye'
  | 'Error';

const MSG_TYPES: ReadonlySet<string> = new Set<MsgType>([
  'JoinRequest',
  'JoinAccepted',
  'JoinRejected',
  'SeatAssigned',
  'LobbyUpdated',
  'GameStarted',
  'ConfigureTable',
  'DealRound',
  'PlayMove',
  'MoveAccepted',
  'MoveRejected',
  'SeatSnapshot',
  'StateDelta',
  'RoundComplete',
  'RequestNextRound',
  'GameOver',
  'Rematch',
  'Heartbeat',
  'Ack',
  'SeatExpired',
  'Bye',
  'Error',
]);

export interface Envelope<T extends MsgType = MsgType, P = unknown> {
  protocolVersion: typeof PROTOCOL_VERSION;
  sessionId: string;
  seatId?: SeatId;
  seatToken?: string;
  type: T;
  clientMessageId?: string;
  serverSeq?: number;
  stateVersion?: number;
  sentAt: string;
  payload: P;
}

// ---- Representative payloads (full set per Foundations §3.2) ----
export interface PlayMovePayload {
  cardRef: CardRef;
  clientSeq: number;
}
export interface MoveRejectedPayload {
  code: MoveRejectCode;
  message: string;
}
export interface SeatSnapshotPayload {
  view: SeatView;
}
export interface LobbyUpdatedPayload {
  tableName: string;
  seats: SeatSummary[];
  canStart: boolean;
  hostSeatId: SeatId;
}
export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type DecodeResult =
  | {ok: true; envelope: Envelope}
  | {
      ok: false;
      code: 'BAD_FRAME' | 'UNSUPPORTED_PROTOCOL';
      message: string;
    };

// Runtime validate + parse for an inbound frame.
export const decodeEnvelope = (raw: string): DecodeResult => {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return {ok: false, code: 'BAD_FRAME', message: 'Invalid JSON'};
  }
  if (typeof obj !== 'object' || obj === null) {
    return {ok: false, code: 'BAD_FRAME', message: 'Not an object'};
  }
  const e = obj as Record<string, unknown>;
  if (e.protocolVersion !== PROTOCOL_VERSION) {
    return {
      ok: false,
      code: 'UNSUPPORTED_PROTOCOL',
      message: `Expected protocol ${PROTOCOL_VERSION}`,
    };
  }
  if (typeof e.type !== 'string' || !MSG_TYPES.has(e.type)) {
    return {
      ok: false,
      code: 'BAD_FRAME',
      message: `Unknown type ${String(e.type)}`,
    };
  }
  if (typeof e.sessionId !== 'string' || !('payload' in e)) {
    return {ok: false, code: 'BAD_FRAME', message: 'Missing sessionId/payload'};
  }
  return {ok: true, envelope: obj as Envelope};
};

// Helper to build a well-formed outbound envelope.
export const makeEnvelope = <T extends MsgType, P>(
  type: T,
  sessionId: string,
  payload: P,
  extra: Partial<Envelope<T, P>> = {},
): Envelope<T, P> => ({
  protocolVersion: PROTOCOL_VERSION,
  sessionId,
  type,
  sentAt: new Date().toISOString(),
  payload,
  ...extra,
});
