import {
  decodeRoundResult,
  decodeScoresMap,
  encodeRoundResult,
  encodeScoresMap,
} from './codec';
import {RoundOutcome, RoundResult} from '../types';

describe('codec — RoundResult', () => {
  it('round-trips roundLosers Set in the CAPOT branch', () => {
    const rr: RoundResult = {
      outcome: RoundOutcome.CAPOT,
      roundLosers: new Set([2, 3]),
      winnerID: 1,
    };
    const wire = encodeRoundResult(rr);
    expect(JSON.parse(JSON.stringify(wire)).roundLosers).toEqual([2, 3]);
    const back = decodeRoundResult(JSON.parse(JSON.stringify(wire)));
    expect(back.outcome).toBe(RoundOutcome.CAPOT);
    expect(back.winnerID).toBe(1);
    expect([...back.roundLosers].sort()).toEqual([2, 3]);
  });

  it('round-trips roundLosers Set in the MAX_SCORE branch', () => {
    const rr: RoundResult = {
      outcome: RoundOutcome.MAX_SCORE,
      roundLosers: new Set([5]),
    };
    const back = decodeRoundResult(
      JSON.parse(JSON.stringify(encodeRoundResult(rr))),
    );
    expect([...back.roundLosers]).toEqual([5]);
    expect(back.winnerID).toBeUndefined();
  });

  it('emits roundLosers as a SORTED array (canonical)', () => {
    const wire = encodeRoundResult({
      outcome: RoundOutcome.MAX_SCORE,
      roundLosers: new Set([9, 1, 4]),
    });
    expect(wire.roundLosers).toEqual([1, 4, 9]);
  });
});

describe('codec — scoresMap', () => {
  it('preserves numeric keys across a JSON round-trip', () => {
    const m = {1: 5, 2: 0, 10: 7};
    const back = decodeScoresMap(JSON.parse(JSON.stringify(encodeScoresMap(m))));
    expect(back[1]).toBe(5);
    expect(back[10]).toBe(7);
    expect(Object.keys(back).map(Number).sort((a, b) => a - b)).toEqual([
      1, 2, 10,
    ]);
  });
});
