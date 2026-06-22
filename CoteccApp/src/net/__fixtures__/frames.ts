// Canonical wire frames produced by the REAL encoders, so any change to a producer
// (envelope shape, payload encoder) breaks the change-detector snapshot in T14.
import {RoundOutcome} from '../../types';
import {encodeRoundResult} from '../codec';
import {makeEnvelope} from '../protocol';

// Stable sentAt so the snapshot is deterministic.
const FIXED = {sentAt: '2026-06-21T00:00:00.000Z'};

export const GOLDEN_FRAMES: Record<string, string> = {
  PlayMove: JSON.stringify(
    makeEnvelope(
      'PlayMove',
      'sess-1',
      {cardRef: {suit: 'ori', rank: 7}, clientSeq: 1},
      {seatId: 's1', clientMessageId: 'm-1', ...FIXED},
    ),
  ),
  MoveRejected: JSON.stringify(
    makeEnvelope(
      'MoveRejected',
      'sess-1',
      {code: 'NOT_YOUR_TURN', message: 'Not your turn'},
      {serverSeq: 4, ...FIXED},
    ),
  ),
  RoundComplete: JSON.stringify(
    makeEnvelope(
      'RoundComplete',
      'sess-1',
      // real codec output, proving the Set->array encoding is part of the frame
      encodeRoundResult({
        outcome: RoundOutcome.CAPOT,
        roundLosers: new Set([2, 3]),
        winnerID: 1,
      }),
      {serverSeq: 8, ...FIXED},
    ),
  ),
  Error: JSON.stringify(
    makeEnvelope(
      'Error',
      'sess-1',
      {code: 'STALE_STATE', message: 'Resync required'},
      {...FIXED},
    ),
  ),
};
