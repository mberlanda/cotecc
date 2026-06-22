import {genDealSeed, hashStringToSeed, makeRng, mulberry32} from './prng';

describe('prng', () => {
  it('mulberry32 is deterministic for a given numeric seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('mulberry32 returns values in [0, 1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashStringToSeed is stable and differs for different strings', () => {
    expect(hashStringToSeed('abc')).toEqual(hashStringToSeed('abc'));
    expect(hashStringToSeed('abc')).not.toEqual(hashStringToSeed('abd'));
  });

  it('makeRng makes equal sequences for equal dealSeed strings', () => {
    const r1 = makeRng('seed-1');
    const r2 = makeRng('seed-1');
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });

  it('genDealSeed returns a non-empty string and is collision-free across many calls', () => {
    const s = genDealSeed();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
    // Uniqueness is the property that matters for per-round seeds. Generating many at
    // once and asserting the set size is collision-free in practice (the random suffix
    // makes a same-millisecond collision astronomically unlikely), without the flaky
    // single-pair inequality the reviewer flagged.
    const seeds = new Set(Array.from({length: 1000}, () => genDealSeed()));
    expect(seeds.size).toBe(1000);
  });
});
