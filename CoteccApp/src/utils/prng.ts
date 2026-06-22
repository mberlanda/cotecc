// mulberry32: tiny, fast, deterministic PRNG. Returns a function producing
// numbers in [0, 1). Same seed => same sequence (used for reproducible deals).
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Deterministic 32-bit hash of a string (FNV-1a). Maps a dealSeed string to a
// numeric seed for mulberry32.
export const hashStringToSeed = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// Build a [0,1) RNG from a dealSeed string.
export const makeRng = (dealSeed: string): (() => number) =>
  mulberry32(hashStringToSeed(dealSeed));

// Generate a fresh random dealSeed. Used when no seed is supplied (preserves the
// random feel of offline play while keeping the deal seed-driven and replayable).
export const genDealSeed = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
