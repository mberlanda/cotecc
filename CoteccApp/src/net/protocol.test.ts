import {decodeEnvelope, PROTOCOL_VERSION} from './protocol';
import {
  LobbyUpdatedPayload,
  makeEnvelope,
  StateDeltaEvent,
} from './protocol';

describe('protocol decode/validate', () => {
  it('accepts a well-formed PlayMove envelope', () => {
    const raw = JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      sessionId: 'sess-1',
      seatId: 's1',
      type: 'PlayMove',
      clientMessageId: 'm-1',
      sentAt: new Date().toISOString(),
      payload: {cardRef: {suit: 'ori', rank: 7}, clientSeq: 1},
    });
    const res = decodeEnvelope(raw);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.envelope.type).toBe('PlayMove');
  });

  it('rejects an unknown protocol version', () => {
    const raw = JSON.stringify({
      protocolVersion: 999,
      sessionId: 'x',
      type: 'Heartbeat',
      sentAt: '',
      payload: {},
    });
    const res = decodeEnvelope(raw);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('UNSUPPORTED_PROTOCOL');
  });

  it('rejects malformed JSON', () => {
    const res = decodeEnvelope('{not json');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BAD_FRAME');
  });

  it('rejects an unknown message type', () => {
    const raw = JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      sessionId: 'x',
      type: 'Nope',
      sentAt: '',
      payload: {},
    });
    const res = decodeEnvelope(raw);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BAD_FRAME');
  });
});

describe('StateDelta union', () => {
  it('accepts each known delta event shape', () => {
    const events: StateDeltaEvent[] = [
      {kind: 'MoveApplied', seatId: 's1', cardRef: {suit: 'ori', rank: 7}, serverSeq: 1, stateVersion: 1},
      {kind: 'TrickWon', seatId: 's2', serverSeq: 2, stateVersion: 2},
      {kind: 'RoundDealt', roundId: 2, serverSeq: 3, stateVersion: 3},
      {kind: 'RoundEnded', roundId: 2, serverSeq: 4, stateVersion: 4},
    ];
    expect(events).toHaveLength(4);
  });
});

// inline structural walker (same idea as seatView.test.ts collectCardRefs)
const cardRefsIn = (node: unknown, acc = new Set<string>()): Set<string> => {
  if (Array.isArray(node)) node.forEach(n => cardRefsIn(n, acc));
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.suit === 'string' && typeof o.rank === 'number') acc.add(`${o.suit}-${o.rank}`);
    Object.values(o).forEach(v => cardRefsIn(v, acc));
  }
  return acc;
};

describe('delta/lobby redaction', () => {
  it("StateDelta exposes only the moving seat's played cardRef (no hands)", () => {
    const events: StateDeltaEvent[] = [
      {kind: 'MoveApplied', seatId: 's2', cardRef: {suit: 'ori', rank: 7}, serverSeq: 1, stateVersion: 1},
      {kind: 'TrickWon', seatId: 's2', serverSeq: 2, stateVersion: 2},
    ];
    const env = makeEnvelope('StateDelta', 'sess-1', {events}, {serverSeq: 2});
    const refs = cardRefsIn(JSON.parse(JSON.stringify(env)));
    expect([...refs]).toEqual(['ori-7']);
  });

  it('LobbyUpdated carries no card refs at all (cardCount only)', () => {
    const payload: LobbyUpdatedPayload = {
      tableName: 'T',
      hostSeatId: 's1',
      canStart: false,
      seats: [{seatId: 's1', displayName: 'A', cardCount: 7, lives: 3, roundScore: 0, controller: 'local', connection: 'connected'}],
    };
    const env = makeEnvelope('LobbyUpdated', 'sess-1', payload, {serverSeq: 1});
    expect([...cardRefsIn(JSON.parse(JSON.stringify(env)))]).toEqual([]);
  });
});
