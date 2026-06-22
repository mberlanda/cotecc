import {decodeEnvelope, PROTOCOL_VERSION} from './protocol';

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
