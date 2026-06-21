# Phase 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the contracts and engine changes every transport depends on
(seeded deal, typed move results, value-based card identity, wire codec, seat model,
wire protocol v1, SeatView redaction, loopback session) **with zero behaviour change
to existing offline play.**

**Non-Goals (do NOT do in Phase 0):** no sockets, no HTTP server, no native code, no
UI redesign, no WebRTC/BLE, no reconnect/heartbeat/AI-takeover policy (that is 1B),
no `app.json` changes. If a task tempts you toward any of these, stop — it belongs to
a later phase.

**Architecture:** The pure engine in `CoteccApp/src/utils/*` is hardened in place
(wrap, don't rewrite). New networking contracts live in a new `CoteccApp/src/net/`
module. The existing single-device flow becomes a **loopback session** that proves
the seam with zero networking. Clients only ever hold a `SeatView`, never `GameState`
— enforced by a lint rule in CI.

**Tech Stack:** TypeScript 6, React Native 0.85 / Expo 56, Jest (`jest-expo`),
ESLint 8 (`eslint-config-expo`). All commands run from `CoteccApp/`.

**Spec:** `docs/superpowers/specs/2026-06-20-local-multiplayer-foundations-design.md`.

---

## File structure (created/modified in this plan)

```
CoteccApp/src/
  utils/
    prng.ts                 (NEW)   seeded PRNG + dealSeed helpers              [T1]
    prng.test.ts            (NEW)                                              [T1]
    cardsLogic.ts           (MOD)   rng-param shuffle, cardsEqual, canonicalCardOrder  [T2,T3]
    playerHandLogic.ts      (MOD)   newPlayersHand(rng)                        [T2]
    roundLogic.ts           (MOD)   newRound(...,dealSeed?)                    [T2]
    gameLogic.ts            (MOD)   value-based makeMove                       [T4]
  types.ts                  (MOD)   CardRef                                    [T3]
  engine/
    applyMove.ts            (NEW)   MoveResult + applyMove wrapper             [T5]
    applyMove.test.ts       (NEW)                                             [T5]
  net/
    hydrate.ts              (NEW)   rebuild cardsBySuit from cards             [T6]
    hydrate.test.ts         (NEW)                                            [T6]
    codec.ts                (NEW)   Wire* encode/decode (Set, numeric keys)    [T7]
    codec.test.ts           (NEW)                                            [T7]
    seat.ts                 (NEW)   Seat / Controller / SeatConnection model   [T8]
    seat.test.ts            (NEW)                                            [T8]
    seatView.ts             (NEW)   SeatView schema + projectStateForSeat      [T9]
    seatView.test.ts        (NEW)   redaction leakage oracle                   [T9]
    protocol.ts             (NEW)   envelope + message union + decode/validate [T10]
    protocol.test.ts        (NEW)                                           [T10]
    __fixtures__/frames.ts  (NEW)   golden JSON frames                        [T14]
    session.ts              (NEW)   GameSession (host authority) + seq rules   [T12]
    transport.ts            (NEW)   HostEndpoint/ClientConnection interfaces   [T12]
    loopback.ts             (NEW)   in-process transport                      [T12]
    session.test.ts         (NEW)                                           [T12]
  .eslintrc / eslint config (MOD)   client-only-SeatView import guard          [T13]
```

Build order: **T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15.**

---

## Task 1: Seeded PRNG + dealSeed helpers

Implements Foundations §1.1 (ARCH-001, GAME-001). A deterministic RNG so a deal is a
pure function of `(playerIds, initialPlayerId, dealSeed)`.

**Files:**
- Create: `CoteccApp/src/utils/prng.ts`
- Test: `CoteccApp/src/utils/prng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/utils/prng.test.ts
import {mulberry32, hashStringToSeed, makeRng, genDealSeed} from './prng';

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

  it('genDealSeed returns a non-empty string and varies', () => {
    const s = genDealSeed();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
    expect(genDealSeed()).not.toEqual(s); // effectively never equal
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prng`
Expected: FAIL — `Cannot find module './prng'`.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/utils/prng.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- prng`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/utils/prng.ts CoteccApp/src/utils/prng.test.ts
git commit -m "feat(net): seeded PRNG + dealSeed helpers (Phase 0 T1, ARCH-001)"
```

---

## Task 2: Seeded deal wiring (zero behaviour change)

Implements Foundations §1.1. Thread an optional RNG/`dealSeed` through
`shuffleDeck → newPlayersHand → newRound`. When no seed is given, behaviour is
unchanged (random). When a seed is given, the deal is reproducible.

**Files:**
- Modify: `CoteccApp/src/utils/cardsLogic.ts:32-39` (`shuffleDeck`)
- Modify: `CoteccApp/src/utils/playerHandLogic.ts:4-11` (`newPlayersHand`)
- Modify: `CoteccApp/src/utils/roundLogic.ts:13-26` (`newRound`)
- Test: `CoteccApp/src/utils/roundLogic.test.ts` (add cases)

- [ ] **Step 1: Write the failing test (append to `roundLogic.test.ts`)**

> **Imports — do NOT add duplicate import statements.** `roundLogic.test.ts` already
> imports `newRound` (from `./roundLogic`). Add only the ONE new symbol: extend the
> existing `'../types'` import line to include `Player` (today it imports `RoundOutcome`),
> i.e. `import {Player, RoundOutcome} from '../types';`. Then append the describe block below.

```ts
// append the describe block to CoteccApp/src/utils/roundLogic.test.ts
describe('newRound seeded deal', () => {
  const players: Player[] = [
    {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
    {ID: 2, name: 'B', isHuman: false, lifeCount: 3},
    {ID: 3, name: 'C', isHuman: false, lifeCount: 3},
  ];

  it('is reproducible for the same dealSeed', () => {
    const r1 = newRound(1, 1, players, 'fixed-seed');
    const r2 = newRound(1, 1, players, 'fixed-seed');
    expect(r1.players.map(h => h.cards)).toEqual(r2.players.map(h => h.cards));
  });

  it('differs for different dealSeeds', () => {
    const r1 = newRound(1, 1, players, 'seed-A');
    const r2 = newRound(1, 1, players, 'seed-B');
    expect(r1.players.map(h => h.cards)).not.toEqual(
      r2.players.map(h => h.cards),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- roundLogic`
Expected: FAIL — `newRound` ignores the 4th arg, so both seeds deal randomly and the
reproducibility assertion fails (or types reject the 4th argument).

- [ ] **Step 3: Modify `shuffleDeck` to accept an RNG**

In `CoteccApp/src/utils/cardsLogic.ts`, replace the `shuffleDeck` function:

```ts
export const shuffleDeck = (
  deck: Card[],
  rng: () => number = Math.random,
): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};
```

- [ ] **Step 4: Modify `newPlayersHand` to accept an RNG**

In `CoteccApp/src/utils/playerHandLogic.ts`, replace the `newPlayersHand` function:

```ts
export const newPlayersHand = (
  players: Player[],
  rng: () => number = Math.random,
): PlayerHand[] => {
  const shuffledDeck = shuffleDeck(createDeck(), rng);
  const playerHands = players
    .filter(p => p.lifeCount > 0)
    .map(p => toPlayerHand(p));
  dealCards(shuffledDeck, playerHands);
  return playerHands;
};
```

- [ ] **Step 5: Modify `newRound` to accept an optional `dealSeed`**

In `CoteccApp/src/utils/roundLogic.ts`, add the import and replace `newRound`:

```ts
import {makeRng, genDealSeed} from './prng';
// ...existing imports unchanged...

export const newRound = (
  ID: number,
  initialPlayerID: PlayerID,
  players: Player[],
  dealSeed: string = genDealSeed(),
): Round => {
  const rng = makeRng(dealSeed);
  return {
    ID,
    initialPlayerID,
    currentTurn: newTurn(initialPlayerID),
    pastTurns: [],
    players: newPlayersHand(players, rng),
    scoresMap: {},
  };
};
```

> Note: `dealSeed` is NOT stored on `Round` — it stays host-internal (the host/session
> keeps it for replay). This keeps `Round` serialization free of the seed (Foundations
> §4.2 prohibition). `newGame`/`nextRound` keep calling `newRound` without a seed, so
> offline play stays random and unchanged.

- [ ] **Step 6: Run the new tests AND the full suite (regression)**

Run: `npm test -- roundLogic`
Expected: PASS (new + existing roundLogic tests).

Run: `npm test`
Expected: PASS — all existing suites green, coverage thresholds met. This proves zero
behaviour change to offline play (Foundations §1.5, QA-009).

- [ ] **Step 7: Commit**

```bash
git add CoteccApp/src/utils/cardsLogic.ts CoteccApp/src/utils/playerHandLogic.ts CoteccApp/src/utils/roundLogic.ts CoteccApp/src/utils/roundLogic.test.ts
git commit -m "feat(net): seeded deal wiring, default-random (Phase 0 T2, GAME-001)"
```

---

## Task 3: CardRef, value equality, and canonical card order

Implements Foundations §1.3 (GAME-005, API-006, RC2-GAME-001). Cards must be matched
by value, and there must be a total order so a non-canonical wire round-trip can't
change suit-following evaluation.

**Files:**
- Modify: `CoteccApp/src/types.ts` (add `CardRef`)
- Modify: `CoteccApp/src/utils/cardsLogic.ts` (add `cardsEqual`, `canonicalCardOrder`, `sortCanonical`)
- Test: `CoteccApp/src/utils/cardsLogic.test.ts` (add cases)

- [ ] **Step 1: Write the failing test (append to `cardsLogic.test.ts`)**

> **Imports — do NOT add duplicate import statements.** `cardsLogic.test.ts` already
> imports `Suit` (from `./constants`) and has an existing `import { … } from './cardsLogic';`
> block. MERGE the new symbols into those existing lines (eslint `import/no-duplicates`
> forbids a second import from the same module): add `cardsEqual, canonicalCardOrder,
> sortCanonical` to the existing `./cardsLogic` import; add `import {Card} from '../types';`
> only if `Card` is not already imported. Then append the describe block below.

```ts
// append the describe block to CoteccApp/src/utils/cardsLogic.test.ts
describe('card identity & ordering', () => {
  const c = (suit: Suit, rank: number, points = 0): Card => ({suit, rank, points});

  it('cardsEqual matches by suit+rank, ignoring points and reference', () => {
    expect(cardsEqual(c(Suit.Ori, 7, 0), c(Suit.Ori, 7, 99))).toBe(true);
    expect(cardsEqual(c(Suit.Ori, 7), c(Suit.Ori, 8))).toBe(false);
    expect(cardsEqual(c(Suit.Ori, 7), c(Suit.Coppe, 7))).toBe(false);
  });

  it('canonicalCardOrder is a total order by suit then rank', () => {
    const shuffled = [c(Suit.Spade, 5), c(Suit.Bastoni, 11), c(Suit.Bastoni, 2)];
    const sorted = [...shuffled].sort(canonicalCardOrder);
    expect(sorted).toEqual([
      c(Suit.Bastoni, 2),
      c(Suit.Bastoni, 11),
      c(Suit.Spade, 5),
    ]);
  });

  it('sortCanonical returns a new array in canonical order', () => {
    const input = [c(Suit.Ori, 3), c(Suit.Coppe, 9)];
    const out = sortCanonical(input);
    expect(out).not.toBe(input); // new array
    expect(out[0].suit).toBe(Suit.Coppe); // 'coppe' < 'ori' by suit index below
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cardsLogic`
Expected: FAIL — exports `cardsEqual`/`canonicalCardOrder`/`sortCanonical` not found.

- [ ] **Step 3: Add `CardRef` to `types.ts`**

In `CoteccApp/src/types.ts`, after the `Card` interface (line 9), add:

```ts
// A value-only reference to a card (suit + rank). Points are host-derived and are
// never trusted from a client, so a CardRef intentionally omits them.
export interface CardRef {
  readonly suit: Suit;
  readonly rank: number;
}
```

- [ ] **Step 4: Add equality + canonical order to `cardsLogic.ts`**

Append to `CoteccApp/src/utils/cardsLogic.ts`:

```ts
// Canonical suit index: pins a stable order independent of locale/string compare.
const SUIT_ORDER: Suit[] = [Suit.Bastoni, Suit.Coppe, Suit.Ori, Suit.Spade];

// Value equality: two cards are the same iff suit AND rank match. Points are
// host-derived and ignored, so a rehydrated/wire card compares equal to the held one.
export const cardsEqual = (
  a: {suit: Suit; rank: number},
  b: {suit: Suit; rank: number},
): boolean => a.suit === b.suit && a.rank === b.rank;

// Total order on cards: suit (by SUIT_ORDER) then rank ascending. Use as a
// comparator. Guarantees a deterministic, locale-independent canonical ordering.
export const canonicalCardOrder = (a: Card, b: Card): number => {
  const s = SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
  return s !== 0 ? s : a.rank - b.rank;
};

// Return a NEW array sorted in canonical order (does not mutate the input).
export const sortCanonical = (cards: Card[]): Card[] =>
  [...cards].sort(canonicalCardOrder);
```

> Note: `Suit` is already imported at the top of `cardsLogic.ts` (`import {Suit} from './constants';`).
> The existing `sortCards` (which uses `localeCompare`) is left untouched to avoid
> changing existing deal output in T2's regression. New code uses `canonicalCardOrder`.

- [ ] **Step 5: Run tests**

Run: `npm test -- cardsLogic`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add CoteccApp/src/types.ts CoteccApp/src/utils/cardsLogic.ts CoteccApp/src/utils/cardsLogic.test.ts
git commit -m "feat(net): CardRef, value equality, canonical card order (Phase 0 T3, RC2-GAME-001)"
```

---

## Task 4: Value-based card removal in `makeMove`

Implements Foundations §1.3 (RC3-GAME-001) — **both** removal paths converted
atomically. Today `makeMove` removes by reference (`c === playedCard`), which breaks
for a rehydrated/wire card. Convert `hand.cards` AND `hand.cardsBySuit[suit]` to
value matching, and use the **hand's own card** (host-derived points) thereafter.

**Files:**
- Modify: `CoteccApp/src/utils/gameLogic.ts:54-94` (`makeMove`)
- Test: `CoteccApp/src/utils/gameLogic.test.ts` (add cases)

- [ ] **Step 1: Write the failing test (append to `gameLogic.test.ts`)**

> **Imports — do NOT add duplicate import statements.** `gameLogic.test.ts` already
> imports `newTurn` (`./turnLogic`), `Suit` (`./constants`), and `Card, GameState, Player`
> (`../types`), plus a `import { … } from './gameLogic';` block. The only genuinely new
> symbols are `makeMove` (add it to the existing `./gameLogic` import) and `PlayerHand`
> (add it to the existing `../types` import: `import {Card, GameState, Player, PlayerHand} from '../types';`).
> Do not re-import `newTurn`/`Suit`/`Card`. Then append the describe block below.

```ts
// append the describe block to CoteccApp/src/utils/gameLogic.test.ts
describe('makeMove value-based removal', () => {
  const buildHand = (): PlayerHand => {
    const cards: Card[] = [
      {suit: Suit.Ori, rank: 7, points: 0},
      {suit: Suit.Ori, rank: 9, points: 4},
      {suit: Suit.Coppe, rank: 3, points: 0},
    ];
    return {
      isHuman: true,
      playerID: 1,
      cards: [...cards],
      cardsBySuit: {
        [Suit.Bastoni]: [],
        [Suit.Spade]: [],
        [Suit.Coppe]: [cards[2]],
        [Suit.Ori]: [cards[0], cards[1]],
      },
    };
  };

  it('removes a card matched by VALUE (not reference) from both cards and cardsBySuit', () => {
    const hand = buildHand();
    const turn = newTurn(1);
    // A fresh object equal by value to the held Ori 7 — different reference, and a
    // bogus points value a client might send.
    const wireCard: Card = {suit: Suit.Ori, rank: 7, points: 999};

    makeMove(turn, hand, wireCard, () => {});

    expect(hand.cards.find(c => c.suit === Suit.Ori && c.rank === 7)).toBeUndefined();
    expect(hand.cardsBySuit[Suit.Ori].find(c => c.rank === 7)).toBeUndefined();
    expect(hand.cards.length).toBe(2);
    expect(hand.cardsBySuit[Suit.Ori].length).toBe(1);
    // The recorded move uses the HAND's card (host points 0), not the client's 999.
    expect(turn.moves[0].card.points).toBe(0);
  });

  it('throws if the value is not in hand', () => {
    const hand = buildHand();
    const turn = newTurn(1);
    expect(() =>
      makeMove(turn, hand, {suit: Suit.Spade, rank: 2, points: 0}, () => {}),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- gameLogic`
Expected: FAIL — `wireCard` (a different reference) is not found by `c === playedCard`,
so `makeMove` throws "does not own card".

- [ ] **Step 3: Rewrite `makeMove` for value-based removal**

In `CoteccApp/src/utils/gameLogic.ts`, add `cardsEqual` to the `cardsLogic` import:

```ts
import {cardIsGreater, cardsEqual} from './cardsLogic';
```

Then replace the entire `makeMove` function body with:

```ts
export const makeMove = (
  currentTurn: Turn,
  hand: PlayerHand,
  playedCard: Card,
  nextMove: () => void,
): void => {
  // Match by VALUE so a rehydrated/wire card resolves to the held card.
  const cardIndex = hand.cards.findIndex(c => cardsEqual(c, playedCard));
  if (cardIndex === -1) {
    throw Error(
      `Player ${hand.playerID} does not own card: ${JSON.stringify(playedCard)}`,
    );
  }
  // Use the HAND's own card from here on: host-derived points, canonical identity.
  const handCard = hand.cards[cardIndex];

  // Update the current suit/highest/winner if this is the first card of the turn.
  currentTurn.suit ||= handCard.suit;
  currentTurn.highestCard ||= handCard;
  currentTurn.winnerID ??= hand.playerID;

  if (
    handCard.suit === currentTurn.suit &&
    cardIsGreater(handCard, currentTurn.highestCard)
  ) {
    currentTurn.highestCard = handCard;
    currentTurn.winnerID = hand.playerID;
  }

  // Remove from BOTH structures by value, atomically (RC3-GAME-001).
  hand.cards.splice(cardIndex, 1);
  const cardInSuitIndex = hand.cardsBySuit[handCard.suit].findIndex(c =>
    cardsEqual(c, handCard),
  );
  hand.cardsBySuit[handCard.suit].splice(cardInSuitIndex, 1);

  currentTurn.moves.push({playerID: hand.playerID, card: handCard});

  nextMove();
};
```

- [ ] **Step 4: Run the new tests and the full suite**

Run: `npm test -- gameLogic`
Expected: PASS.

Run: `npm test`
Expected: PASS — full regression green (offline play unchanged).

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/utils/gameLogic.ts CoteccApp/src/utils/gameLogic.test.ts
git commit -m "feat(net): value-based card removal in makeMove, both paths (Phase 0 T4, RC3-GAME-001)"
```

---

## Task 5: `MoveResult` + `applyMove` wrapper

Implements Foundations §1.2 (GAME-004, API-003). A structured result type so the
network layer gets reject codes instead of `console.log` + silent return.

**Files:**
- Create: `CoteccApp/src/engine/applyMove.ts`
- Test: `CoteccApp/src/engine/applyMove.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/engine/applyMove.test.ts
import {applyMove} from './applyMove';
import {newGame} from '../utils/gameLogic';
import {Player} from '../types';
import {Suit} from '../utils/constants';

const players: Player[] = [
  {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
  {ID: 2, name: 'B', isHuman: false, lifeCount: 3},
];

describe('applyMove', () => {
  it('returns ok:true and applies a legal move', () => {
    const state = newGame(players, 1, 3);
    const hand = state.currentRound.players.find(h => h.playerID === 1)!;
    const card = hand.cards[0];
    const res = applyMove(state, 1, {suit: card.suit, rank: card.rank});
    expect(res.ok).toBe(true);
    expect(hand.cards.length).toBe(6); // started with 7 (2 players)
  });

  it('rejects a move when it is not the player\'s turn', () => {
    const state = newGame(players, 1, 3); // player 1 to move
    const hand = state.currentRound.players.find(h => h.playerID === 2)!;
    const card = hand.cards[0];
    const res = applyMove(state, 2, {suit: card.suit, rank: card.rank});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_YOUR_TURN');
  });

  it('rejects a card the player does not hold', () => {
    const state = newGame(players, 1, 3);
    // Find a (suit,rank) not in player 1's hand.
    const hand = state.currentRound.players.find(h => h.playerID === 1)!;
    const owned = new Set(hand.cards.map(c => `${c.suit}-${c.rank}`));
    let missing = {suit: Suit.Ori, rank: 2};
    for (const suit of Object.values(Suit)) {
      for (let rank = 2; rank <= 11; rank++) {
        if (!owned.has(`${suit}-${rank}`)) {
          missing = {suit, rank};
        }
      }
    }
    const res = applyMove(state, 1, missing);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('CARD_NOT_IN_HAND');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- applyMove`
Expected: FAIL — `Cannot find module './applyMove'`.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/engine/applyMove.ts
import {CardRef, GameState, PlayerID} from '../types';
import {makeMove, nextMove, endRound} from '../utils/gameLogic';
import {validateMove} from '../utils/movesLogic';
import {roundIsOver} from '../utils/roundLogic';

export type MoveRejectCode =
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'MUST_FOLLOW_SUIT'
  | 'ROUND_NOT_ACTIVE'
  | 'GAME_OVER';

export type MoveResult =
  | {ok: true}
  | {ok: false; code: MoveRejectCode; message: string};

// Network-facing wrapper around the in-place rules. Maps validation failures onto
// structured reject codes instead of console.log + silent return.
export const applyMove = (
  state: GameState,
  playerID: PlayerID,
  cardRef: CardRef,
): MoveResult => {
  const round = state.currentRound;
  if (roundIsOver(round)) {
    return {ok: false, code: 'ROUND_NOT_ACTIVE', message: 'Round is over'};
  }
  const hand = round.players.find(p => p.playerID === playerID);
  if (!hand) {
    return {ok: false, code: 'NOT_YOUR_TURN', message: 'No such seat in round'};
  }
  if (round.currentTurn.currentPlayerID !== playerID) {
    return {ok: false, code: 'NOT_YOUR_TURN', message: 'Not your turn'};
  }
  // Resolve the CardRef to the held card (value match). points come from the hand.
  const card = hand.cards.find(
    c => c.suit === cardRef.suit && c.rank === cardRef.rank,
  );
  if (!card) {
    return {ok: false, code: 'CARD_NOT_IN_HAND', message: 'Card not in hand'};
  }
  try {
    validateMove(round.currentTurn, hand, card);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Illegal move';
    // validateMove throws only for suit-following violations here (turn already checked).
    return {ok: false, code: 'MUST_FOLLOW_SUIT', message: msg};
  }
  makeMove(round.currentTurn, hand, card, () =>
    nextMove(round, hand, () => endRound(state)),
  );
  return {ok: true};
};
```

> Note: `nextMove` and `endRound` are already exported from `gameLogic.ts`
> (verified: lines 96 and 122). `roundIsOver` is exported from `roundLogic.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- applyMove`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/engine/applyMove.ts CoteccApp/src/engine/applyMove.test.ts
git commit -m "feat(net): MoveResult + applyMove wrapper (Phase 0 T5, API-003)"
```

---

## Task 6: Snapshot hydrator (rebuild `cardsBySuit` from `cards`)

Implements Foundations §1.3. After a JSON round-trip, rebuild `cardsBySuit` from
canonical `cards` so the duplicate-reference invariant can't be corrupted.

**Files:**
- Create: `CoteccApp/src/net/hydrate.ts`
- Test: `CoteccApp/src/net/hydrate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/net/hydrate.test.ts
import {rebuildCardsBySuit, hydrateHand} from './hydrate';
import {Suit} from '../utils/constants';
import {Card, PlayerHand} from '../types';

const card = (suit: Suit, rank: number): Card => ({suit, rank, points: 0});

describe('hydrate', () => {
  it('rebuildCardsBySuit groups by suit in canonical order', () => {
    const cards = [card(Suit.Ori, 9), card(Suit.Coppe, 3), card(Suit.Ori, 2)];
    const bySuit = rebuildCardsBySuit(cards);
    expect(bySuit[Suit.Ori].map(c => c.rank)).toEqual([2, 9]);
    expect(bySuit[Suit.Coppe].map(c => c.rank)).toEqual([3]);
    expect(bySuit[Suit.Bastoni]).toEqual([]);
  });

  it('hydrateHand makes cardsBySuit consistent with cards after a JSON round-trip', () => {
    const hand: PlayerHand = {
      isHuman: true,
      playerID: 1,
      cards: [card(Suit.Ori, 9), card(Suit.Coppe, 3)],
      cardsBySuit: {
        [Suit.Bastoni]: [],
        [Suit.Spade]: [],
        [Suit.Coppe]: [],
        [Suit.Ori]: [],
      }, // deliberately desynced
    };
    const roundTripped: PlayerHand = JSON.parse(JSON.stringify(hand));
    const fixed = hydrateHand(roundTripped);
    const flat = Object.values(fixed.cardsBySuit).flat();
    expect(flat.length).toBe(fixed.cards.length);
    expect(fixed.cardsBySuit[Suit.Ori].map(c => c.rank)).toEqual([9]);
  });

  // Property test (Foundations §1.3, RC2-GAME-001): a non-canonical wire round-trip
  // must NOT change suit-following evaluation. For every possible lead suit, the set of
  // legal (in-suit-else-any) cards is identical before and after shuffle→encode→hydrate.
  it('preserves suit-following (legalActions) across a shuffled round-trip', () => {
    const all: Card[] = [
      card(Suit.Ori, 9), card(Suit.Ori, 2), card(Suit.Coppe, 3),
      card(Suit.Spade, 11), card(Suit.Spade, 5), card(Suit.Bastoni, 7),
    ];
    const legalFor = (cards: Card[], lead: Suit | null): string[] => {
      const inSuit = lead ? cards.filter(c => c.suit === lead) : [];
      const playable = inSuit.length > 0 ? inSuit : cards;
      return playable.map(c => `${c.suit}-${c.rank}`).sort();
    };
    // shuffle deterministically (reverse) then JSON round-trip + hydrate
    const shuffled = [...all].reverse();
    const rehydrated = hydrateHand({
      isHuman: true,
      playerID: 1,
      cards: JSON.parse(JSON.stringify(shuffled)),
      cardsBySuit: rebuildCardsBySuit([]), // empty -> proves hydrate rebuilds it
    }).cards;
    for (const lead of [null, Suit.Ori, Suit.Spade, Suit.Coppe, Suit.Bastoni]) {
      expect(legalFor(rehydrated, lead)).toEqual(legalFor(all, lead));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- hydrate`
Expected: FAIL — `Cannot find module './hydrate'`.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/net/hydrate.ts
import {sortCanonical} from '../utils/cardsLogic';
import {Card, newSuitMap, PlayerHand} from '../types';
import {Suit} from '../utils/constants';

// Rebuild the suit-bucketed view from a flat card list, each bucket in canonical order.
export const rebuildCardsBySuit = (cards: Card[]): Record<Suit, Card[]> => {
  const bySuit = newSuitMap<Card[]>(() => []);
  for (const c of cards) {
    bySuit[c.suit].push(c);
  }
  for (const suit of Object.values(Suit)) {
    bySuit[suit] = sortCanonical(bySuit[suit]);
  }
  return bySuit;
};

// Return a hand with canonical cards + a cardsBySuit rebuilt from cards. Safe to call
// on a JSON-deserialized hand to restore the cards/cardsBySuit invariant.
export const hydrateHand = (hand: PlayerHand): PlayerHand => {
  const cards = sortCanonical(hand.cards);
  return {...hand, cards, cardsBySuit: rebuildCardsBySuit(cards)};
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- hydrate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/net/hydrate.ts CoteccApp/src/net/hydrate.test.ts
git commit -m "feat(net): snapshot hydrator rebuilds cardsBySuit (Phase 0 T6, API-006)"
```

---

## Task 7: Wire codec (`Set` → array, numeric keys)

Implements Foundations §1.4 (WS-003, API-005, RC3-GAME-002). `RoundResult.roundLosers`
is a `Set` (`JSON.stringify` → `{}`); `scoresMap` has numeric keys. Define an explicit
encode/decode with round-trip property tests.

**Files:**
- Create: `CoteccApp/src/net/codec.ts`
- Test: `CoteccApp/src/net/codec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/net/codec.test.ts
import {encodeRoundResult, decodeRoundResult} from './codec';
import {RoundOutcome, RoundResult} from '../types';

describe('codec — RoundResult', () => {
  it('round-trips roundLosers Set in the CAPOT branch', () => {
    const rr: RoundResult = {
      outcome: RoundOutcome.CAPOT,
      roundLosers: new Set([2, 3]),
      winnerID: 1,
    };
    const wire = encodeRoundResult(rr);
    // proves the Set is not lost to {}
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- codec`
Expected: FAIL — `Cannot find module './codec'`.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/net/codec.ts
import {PlayerID, RoundOutcome, RoundResult} from '../types';

// Wire form of RoundResult: Set -> sorted array, everything JSON-safe.
export interface WireRoundResult {
  outcome: RoundOutcome;
  roundLosers: PlayerID[]; // sorted ascending
  winnerID?: PlayerID;
}

export const encodeRoundResult = (rr: RoundResult): WireRoundResult => {
  const wire: WireRoundResult = {
    outcome: rr.outcome,
    roundLosers: [...rr.roundLosers].sort((a, b) => a - b),
  };
  if (rr.winnerID !== undefined) {
    wire.winnerID = rr.winnerID;
  }
  return wire;
};

export const decodeRoundResult = (w: WireRoundResult): RoundResult => {
  const rr: RoundResult = {
    outcome: w.outcome,
    roundLosers: new Set(w.roundLosers),
  };
  if (w.winnerID !== undefined) {
    rr.winnerID = w.winnerID;
  }
  return rr;
};

// scoresMap has numeric keys ({[playerID: number]: number}). JSON stringifies object
// keys to strings; this helper normalises them back to numbers on decode.
export type WireScoresMap = {[playerID: string]: number};

export const encodeScoresMap = (m: {
  [playerID: PlayerID]: number;
}): WireScoresMap => ({...m});

export const decodeScoresMap = (w: WireScoresMap): {
  [playerID: PlayerID]: number;
} => {
  const out: {[playerID: PlayerID]: number} = {};
  for (const k of Object.keys(w)) {
    out[Number(k)] = w[k];
  }
  return out;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- codec`
Expected: PASS.

- [ ] **Step 5: Add the scoresMap numeric-key test (append to `codec.test.ts`)**

```ts
import {encodeScoresMap, decodeScoresMap} from './codec';

describe('codec — scoresMap', () => {
  it('preserves numeric keys across a JSON round-trip', () => {
    const m = {1: 5, 2: 0, 10: 7};
    const back = decodeScoresMap(
      JSON.parse(JSON.stringify(encodeScoresMap(m))),
    );
    expect(back[1]).toBe(5);
    expect(back[10]).toBe(7);
    expect(Object.keys(back).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 10]);
  });
});
```

- [ ] **Step 6: Run and commit**

Run: `npm test -- codec`
Expected: PASS (all codec tests).

```bash
git add CoteccApp/src/net/codec.ts CoteccApp/src/net/codec.test.ts
git commit -m "feat(net): wire codec for Set/numeric-key round-trip (Phase 0 T7, RC3-GAME-002)"
```

---

## Task 8: Seat ownership model

Implements Foundations §2.1 (ARCH-003, GAME-006). Decouple seats from "the local
human". Pure types + small helpers (no UI in Phase 0).

**Files:**
- Create: `CoteccApp/src/net/seat.ts`
- Test: `CoteccApp/src/net/seat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/net/seat.test.ts
import {Seat, seatForPlayer, isLocalSeat} from './seat';

const seats: Seat[] = [
  {seatId: 's1', playerId: 1, displayName: 'A', controller: 'local', connection: 'connected', isHostSeat: true},
  {seatId: 's2', playerId: 2, displayName: 'B', controller: 'ai', connection: 'connected', isHostSeat: false},
];

describe('seat model', () => {
  it('seatForPlayer finds the seat by engine playerId', () => {
    expect(seatForPlayer(seats, 2)?.seatId).toBe('s2');
    expect(seatForPlayer(seats, 99)).toBeUndefined();
  });
  it('isLocalSeat compares against localSeatId', () => {
    expect(isLocalSeat(seats[0], 's1')).toBe(true);
    expect(isLocalSeat(seats[1], 's1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- net/seat`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/net/seat.ts
import {PlayerID} from '../types';

export type SeatId = string;
export type Controller = 'local' | 'remote' | 'ai';
export type SeatConnection = 'connected' | 'grace' | 'disconnected';

export interface Seat {
  seatId: SeatId; // stable for the match (not the engine PlayerID alias)
  playerId: PlayerID; // engine id
  displayName: string;
  controller: Controller; // who acts for this seat now
  connection: SeatConnection;
  isHostSeat: boolean;
}

export const seatForPlayer = (
  seats: Seat[],
  playerId: PlayerID,
): Seat | undefined => seats.find(s => s.playerId === playerId);

export const isLocalSeat = (seat: Seat, localSeatId: SeatId): boolean =>
  seat.seatId === localSeatId;
```

- [ ] **Step 4: Run and commit**

Run: `npm test -- net/seat`
Expected: PASS.

```bash
git add CoteccApp/src/net/seat.ts CoteccApp/src/net/seat.test.ts
git commit -m "feat(net): seat ownership model (Phase 0 T8, ARCH-003)"
```

---

## Task 9: `SeatView` schema + `projectStateForSeat` + redaction oracle

Implements Foundations §4 (ARCH-004, GAME-003, SEC-004, QA-005, RC2-SEC-002,
RC2-GAME-002, RC3-UX-001). **Security-critical.** The only host→client state producer,
plus the leakage oracle that proves no foreign cards / `dealSeed` ever escape.

**Files:**
- Create: `CoteccApp/src/net/seatView.ts`
- Test: `CoteccApp/src/net/seatView.test.ts`

- [ ] **Step 1: Write the failing leakage-oracle test**

```ts
// CoteccApp/src/net/seatView.test.ts
import {projectStateForSeat, SeatView} from './seatView';
import {Seat} from './seat';
import {newGame} from '../utils/gameLogic';
import {Player} from '../types';

const mkPlayers = (n: number): Player[] =>
  Array.from({length: n}, (_, i) => ({
    ID: i + 1,
    name: `P${i + 1}`,
    isHuman: i === 0,
    lifeCount: 3,
  }));

const mkSeats = (players: Player[]): Seat[] =>
  players.map((p, i) => ({
    seatId: `s${p.ID}`,
    playerId: p.ID,
    displayName: p.name,
    controller: i === 0 ? 'local' : 'remote',
    connection: 'connected',
    isHostSeat: i === 0,
  }));

// Walk any parsed JSON value and collect every {suit, rank} pair as "suit-rank".
// Structural (not substring): immune to key ordering / whitespace.
const collectCardRefs = (node: unknown, acc: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(node)) {
    node.forEach(n => collectCardRefs(n, acc));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.suit === 'string' && typeof o.rank === 'number') {
      acc.add(`${o.suit}-${o.rank}`);
    }
    Object.values(o).forEach(v => collectCardRefs(v, acc));
  }
  return acc;
};

describe('projectStateForSeat — redaction oracle', () => {
  it.each([2, 3, 4, 5, 6])(
    'for a %i-seat game, a seat view contains only the local hand',
    n => {
      const players = mkPlayers(n);
      const state = newGame(players, 1, 3);
      const seats = mkSeats(players);

      for (const seat of seats) {
        const view = projectStateForSeat(state, seats, seat.seatId);

        // The local hand is present.
        const localHand = state.currentRound.players.find(
          h => h.playerID === seat.playerId,
        )!;
        expect(view.localHand.length).toBe(localHand.cards.length);

        // STRUCTURAL oracle (not a substring match): parse the serialized payload,
        // collect EVERY {suit,rank} pair anywhere in the tree, and assert each is
        // allowed = local hand ∪ public trick cards. Robust to key ordering/spacing.
        const allowed = new Set(
          [
            ...localHand.cards,
            ...view.currentTrick.map(t => t.card),
          ].map(c => `${c.suit}-${c.rank}`),
        );
        const found = collectCardRefs(JSON.parse(JSON.stringify(view)));
        for (const ref of found) {
          expect(allowed.has(ref)).toBe(true); // any foreign card here is a leak
        }
      }
    },
  );

  it('never serializes dealSeed / RNG / full GameState markers', () => {
    const players = mkPlayers(4);
    const state = newGame(players, 1, 3);
    const seats = mkSeats(players);
    const serialized = JSON.stringify(
      projectStateForSeat(state, seats, 's1'),
    );
    expect(serialized).not.toContain('dealSeed');
    expect(serialized).not.toContain('cardsBySuit');
    expect(serialized).not.toContain('pastRounds');
    expect(serialized).not.toContain('maxLifeCount');
  });

  it('legalActions is empty when it is not the local seat\'s turn', () => {
    const players = mkPlayers(3);
    const state = newGame(players, 1, 3); // seat s1 (player 1) to move
    const seats = mkSeats(players);
    const notMyTurn = projectStateForSeat(state, seats, 's2');
    expect(notMyTurn.legalActions).toEqual([]);
    const myTurn = projectStateForSeat(state, seats, 's1');
    expect(myTurn.phase).toBe('playing');
    expect(myTurn.legalActions.length).toBeGreaterThan(0);
  });

  it('fuzz: after random legal moves, no view leaks a foreign card (mid-trick)', () => {
    const players = mkPlayers(4);
    const state = newGame(players, 1, 3);
    const seats = mkSeats(players);
    // Apply a few legal moves so currentTrick is non-empty (the interesting case).
    for (let i = 0; i < 3; i++) {
      const cur = state.currentRound.currentTurn.currentPlayerID;
      const v = projectStateForSeat(state, seats, `s${cur}`);
      if (v.legalActions.length === 0) break;
      applyMove(state, cur, v.legalActions[0]);
    }
    for (const seat of seats) {
      const v = projectStateForSeat(state, seats, seat.seatId);
      const localHand = state.currentRound.players.find(
        h => h.playerID === seat.playerId,
      )!;
      const allowed = new Set(
        [...localHand.cards, ...v.currentTrick.map(t => t.card)].map(
          c => `${c.suit}-${c.rank}`,
        ),
      );
      for (const ref of collectCardRefs(JSON.parse(JSON.stringify(v)))) {
        expect(allowed.has(ref)).toBe(true);
      }
    }
  });
});
```

> Add `import {applyMove} from '../engine/applyMove';` to this test file (it is used by
> the fuzz case). The **same `collectCardRefs` oracle MUST also be applied to the encoded
> `StateDelta` and `LobbyUpdated` payloads** — see T11 Step 1 (a redaction assertion is
> added there so every outbound message type, not just the projection, is covered, per
> Foundations §4.2/§4.3).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- seatView`
Expected: FAIL — `Cannot find module './seatView'`.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/net/seatView.ts
import {Card, CardRef, GameState, Round} from '../types';
import {Suit} from '../utils/constants';
import {Controller, Seat, SeatConnection, SeatId, seatForPlayer} from './seat';

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
const computeLegalActions = (
  round: Round,
  playerId: number,
): CardRef[] => {
  const hand = round.players.find(h => h.playerID === playerId);
  if (!hand) return [];
  const leadSuit = round.currentTurn.suit;
  const inSuit = leadSuit
    ? hand.cards.filter(c => c.suit === leadSuit)
    : [];
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
    legalActions: isLocalTurn
      ? computeLegalActions(round, localPlayerId!)
      : [],
    serverSeq: meta.serverSeq ?? 0,
    stateVersion: meta.stateVersion ?? 0,
    roundId: round.ID,
  };
};
```

> Note on the oracle: the leakage test asserts on the **serialized** view, the same
> bytes that would cross the wire. `localHand` is a `Card[]` (includes points) — that
> is allowed (it's the recipient's own hand). The test only forbids *other* seats'
> unique cards and the prohibited keys.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- seatView`
Expected: PASS (2..6 parametrised + dealSeed + legalActions cases).

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/net/seatView.ts CoteccApp/src/net/seatView.test.ts
git commit -m "feat(net): SeatView projection + redaction oracle (Phase 0 T9, SEC-004)"
```

---

## Task 10: Wire protocol v1 — envelope, message union, decode/validate

Implements Foundations §3 (WS-001, API-001/002/003, RC2-API-001). Discriminated TS
unions + a runtime validate helper. (Sequence-reconciliation *behaviour* is exercised
in T12; this task defines the types and frame validation.)

**Files:**
- Create: `CoteccApp/src/net/protocol.ts`
- Test: `CoteccApp/src/net/protocol.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/net/protocol.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- protocol`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// CoteccApp/src/net/protocol.ts
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
  'JoinRequest', 'JoinAccepted', 'JoinRejected', 'SeatAssigned',
  'LobbyUpdated', 'GameStarted', 'ConfigureTable', 'DealRound', 'PlayMove',
  'MoveAccepted', 'MoveRejected', 'SeatSnapshot', 'StateDelta',
  'RoundComplete', 'RequestNextRound', 'GameOver', 'Rematch', 'Heartbeat',
  'Ack', 'SeatExpired', 'Bye', 'Error',
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
  | {ok: false; code: 'BAD_FRAME' | 'UNSUPPORTED_PROTOCOL'; message: string};

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
    return {ok: false, code: 'BAD_FRAME', message: `Unknown type ${String(e.type)}`};
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
```

- [ ] **Step 4: Run test and commit**

Run: `npm test -- protocol`
Expected: PASS.

```bash
git add CoteccApp/src/net/protocol.ts CoteccApp/src/net/protocol.test.ts
git commit -m "feat(net): wire protocol v1 envelope + union + decode (Phase 0 T10, API-002)"
```

---

## Task 11: `StateDelta` + `LobbyUpdated` typed deltas

Implements Foundations §4.1 (RC2-API-003, RC2-API-004). Add the explicit delta union
to `protocol.ts` so a client can apply incremental updates or request a full snapshot.

**Files:**
- Modify: `CoteccApp/src/net/protocol.ts` (append delta types)
- Test: `CoteccApp/src/net/protocol.test.ts` (append a type-shape test)

- [ ] **Step 1: Write the failing test (append)**

```ts
import {StateDeltaEvent} from './protocol';

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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- protocol`
Expected: FAIL — `StateDeltaEvent` not exported.

- [ ] **Step 3: Append the delta types to `protocol.ts`**

```ts
// append to CoteccApp/src/net/protocol.ts
interface DeltaBase {
  serverSeq: number;
  stateVersion: number;
}
export type StateDeltaEvent =
  | (DeltaBase & {kind: 'MoveApplied'; seatId: SeatId; cardRef: CardRef})
  | (DeltaBase & {kind: 'TrickWon'; seatId: SeatId})
  | (DeltaBase & {kind: 'RoundDealt'; roundId: number})
  | (DeltaBase & {kind: 'RoundEnded'; roundId: number});

export interface StateDeltaPayload {
  events: StateDeltaEvent[];
}
```

- [ ] **Step 4: Run and commit**

Run: `npm test -- protocol`
Expected: PASS.

```bash
git add CoteccApp/src/net/protocol.ts CoteccApp/src/net/protocol.test.ts
git commit -m "feat(net): typed StateDelta/LobbyUpdated deltas (Phase 0 T11, RC2-API-004)"
```

---

## Task 12: Transport interfaces, loopback, and `GameSession` (host authority + sequence reconciliation)

Implements Foundations §2.2, §3.1, §3.4. The host applies/validates commands, projects
per-seat `SeatView`s, and enforces the `clientSeq` ordering rule. The loopback transport
proves the seam in-process (no networking). This reproduces today's single-device play.

**Files:**
- Create: `CoteccApp/src/net/transport.ts`
- Create: `CoteccApp/src/net/loopback.ts`
- Create: `CoteccApp/src/net/session.ts`
- Test: `CoteccApp/src/net/session.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// CoteccApp/src/net/session.test.ts
import {GameSession} from './session';
import {Seat} from './seat';
import {newGame} from '../utils/gameLogic';
import {Player} from '../types';

const players: Player[] = [
  {ID: 1, name: 'A', isHuman: true, lifeCount: 3},
  {ID: 2, name: 'B', isHuman: false, lifeCount: 3},
];
const seats: Seat[] = [
  {seatId: 's1', playerId: 1, displayName: 'A', controller: 'local', connection: 'connected', isHostSeat: true},
  {seatId: 's2', playerId: 2, displayName: 'B', controller: 'remote', connection: 'connected', isHostSeat: false},
];

describe('GameSession host authority', () => {
  it('applies a legal move from the seat whose turn it is and bumps serverSeq', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const before = session.viewFor('s1');
    const card = before.localHand[0];
    const res = session.submitMove('s1', {cardRef: {suit: card.suit, rank: card.rank}, clientSeq: 1});
    expect(res.ok).toBe(true);
    expect(session.viewFor('s1').serverSeq).toBeGreaterThan(before.serverSeq);
  });

  it('rejects a duplicate clientSeq as idempotent (no re-apply)', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const card = session.viewFor('s1').localHand[0];
    session.submitMove('s1', {cardRef: {suit: card.suit, rank: card.rank}, clientSeq: 1});
    const handLen = session.viewFor('s1').localHand.length;
    const dup = session.submitMove('s1', {cardRef: {suit: card.suit, rank: card.rank}, clientSeq: 1});
    expect(dup.ok).toBe(true); // idempotent re-ack
    expect(session.viewFor('s1').localHand.length).toBe(handLen); // not re-applied
  });

  it('rejects a clientSeq gap with STALE_STATE', () => {
    const session = new GameSession(newGame(players, 1, 3), seats);
    const card = session.viewFor('s1').localHand[0];
    const res = session.submitMove('s1', {cardRef: {suit: card.suit, rank: card.rank}, clientSeq: 5});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('STALE_STATE');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- net/session`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `transport.ts`**

```ts
// CoteccApp/src/net/transport.ts
import {Envelope} from './protocol';

export interface HostEndpoint {
  onClient(cb: (connId: string) => void): void;
  send(connId: string, env: Envelope): void;
  broadcast(env: Envelope): void;
  close(): void;
}

export interface ClientConnection {
  send(env: Envelope): void;
  onMessage(cb: (env: Envelope) => void): void;
  onClose(cb: () => void): void;
  status: 'open' | 'closed';
}

// Backpressure contract (WS-008): a concrete HostEndpoint MUST bound its per-peer queue,
// coalesce obsolete state updates (prefer the latest snapshot over queued deltas), and
// drop peers exceeding the queue/bufferedAmount threshold. The interface stays
// transport-agnostic; the WebSocket and SSE+POST adapters enforce it (Phase 1A T5).
export interface BackpressureLimits {
  maxQueuedPerPeer: number;
  maxBufferedBytes: number;
}
```

> **SSE+POST parity (WS-007/API-007).** Foundations §3.4 requires an SSE+POST transport
> that uses the **same `Envelope` and sequencing** as WebSocket. It is the SAME protocol,
> so Phase 0 only fixes the **contract** here (these interfaces + the shared `Envelope`/
> `serverSeq`/`clientSeq` rules in T10/T12). The concrete HTTP wiring —
> `GET /session/:id/events?afterSeq=` (SSE, `Last-Event-ID` resume) + `POST
> /session/:id/commands` (idempotent `clientMessageId`) — is implemented in **Phase 1A
> Task 5** alongside the WebSocket adapter, because both need the embedded HTTP server
> that does not exist until 1A. This split is intentional; both adapters share this
> `transport.ts` contract so the fallback is never a second protocol.

- [ ] **Step 4: Write `session.ts`**

```ts
// CoteccApp/src/net/session.ts
import {GameState} from '../types';
import {applyMove} from '../engine/applyMove';
import {Seat, SeatId} from './seat';
import {projectStateForSeat, SeatPhase, SeatView} from './seatView';
import {PlayMovePayload} from './protocol';

export type SubmitResult =
  | {ok: true}
  | {ok: false; code: 'NOT_YOUR_TURN' | 'CARD_NOT_IN_HAND' | 'MUST_FOLLOW_SUIT' | 'ROUND_NOT_ACTIVE' | 'GAME_OVER' | 'STALE_STATE'; message: string};

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
```

- [ ] **Step 5: Write `loopback.ts`**

```ts
// CoteccApp/src/net/loopback.ts
import {Envelope} from './protocol';
import {ClientConnection, HostEndpoint} from './transport';

// In-process transport: a host endpoint and a client connection wired directly to
// each other. Proves the SessionTransport seam with zero networking (offline play).
export const createLoopback = (): {
  host: HostEndpoint;
  client: ClientConnection;
} => {
  let hostMsgCb: ((env: Envelope) => void) | null = null;
  let clientMsgCb: ((env: Envelope) => void) | null = null;
  let clientCloseCb: (() => void) | null = null;
  let onClientCb: ((connId: string) => void) | null = null;
  const CONN = 'loopback-0';

  const host: HostEndpoint = {
    onClient(cb) {
      onClientCb = cb;
    },
    send(_connId, env) {
      clientMsgCb?.(env);
    },
    broadcast(env) {
      clientMsgCb?.(env);
    },
    close() {
      clientCloseCb?.();
    },
  };

  const client: ClientConnection = {
    status: 'open',
    send(env) {
      hostMsgCb?.(env);
    },
    onMessage(cb) {
      clientMsgCb = cb;
    },
    onClose(cb) {
      clientCloseCb = cb;
    },
  };

  // host receives client frames via this hook (used by a host adapter)
  (host as unknown as {_onMessage: (cb: (env: Envelope) => void) => void})._onMessage =
    cb => {
      hostMsgCb = cb;
    };

  queueMicrotask(() => onClientCb?.(CONN));
  return {host, client};
};
```

- [ ] **Step 6: Run tests and full regression**

Run: `npm test -- net/session`
Expected: PASS (3 tests).

Run: `npm test`
Expected: PASS — full suite green, coverage thresholds met.

- [ ] **Step 7: Commit**

```bash
git add CoteccApp/src/net/transport.ts CoteccApp/src/net/loopback.ts CoteccApp/src/net/session.ts CoteccApp/src/net/session.test.ts
git commit -m "feat(net): host session + loopback transport + seq reconciliation (Phase 0 T12, RC2-API-001)"
```

---

## Task 13: Client-only-`SeatView` import guard (CI lint rule)

Implements Foundations §2.3, §5 exit criterion (RC2-ARCH-001). A lint rule that fails
the build if a client component imports engine `GameState`/internal engine types. This
is the automated boundary — not a convention.

> **Scope decision (resolves review finding):** the rule forbids only **`GameState`**
> (the full-state leak the spec cares about). `PlayerHand`/`Round` are legitimately used
> as display-prop types by existing components (`TableComponent`, `PlayerHandComponent`,
> `GameScreen`) and are NOT forbidden — forbidding them would require refactoring
> unrelated UI and is out of Phase 0 scope. The **current `GameState` violators are
> exactly two** (verified): `src/screens/GameScreen.tsx` and `src/components/StateDebug.tsx`.
> Both get a tracked `eslint-disable` + `TODO(phase0-seatview)`; removing those two
> disables is the definition of done for the §2.2 GameScreen/SeatView refactor.

**Files:**
- Modify: `CoteccApp/.eslintrc.js` (confirmed format; see Step 1)
- Modify: `CoteccApp/src/screens/GameScreen.tsx`, `CoteccApp/src/components/StateDebug.tsx` (tracked disables)
- Create (permanent regression test): `CoteccApp/src/net/lintGuard.test.ts` + `CoteccApp/src/net/__lintfixtures__/badClientImport.txt`

- [ ] **Step 1: Inspect the existing ESLint config**

Run: `ls CoteccApp/.eslintrc* CoteccApp/eslint.config.* 2>/dev/null && cat CoteccApp/.eslintrc.js`
Expected: a legacy `.eslintrc.js` extending `expo`, with eslint 8.57 and
`eslint-plugin-import`. Note whether an `@src` path alias is configured (if so, include
it in the `patterns` group below). Apply Step 2 to `.eslintrc.js`.

- [ ] **Step 2: Add a depth/alias-robust `no-restricted-imports` override**

Merge into `module.exports` (use the `patterns` form so it matches `../types`,
`../../types`, deeper relative paths, AND any `@src/types` alias — not just two literal
specifiers):

```js
// merge into module.exports of CoteccApp/.eslintrc.js
overrides: [
  {
    files: ['src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    excludedFiles: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/types', '@src/types'],
              importNames: ['GameState'],
              message:
                'Client UI must consume SeatView (src/net/seatView), never engine GameState. (Foundations RC2-ARCH-001)',
            },
            {
              group: ['**/utils/gameLogic', '**/utils/roundLogic', '**/engine/*'],
              message:
                'Client UI must not import the engine directly; go through a SeatView/session. (RC2-ARCH-001)',
            },
          ],
        },
      ],
    },
  },
],
```

> The `patterns[].importNames` form requires eslint ≥ 8.x (present). It matches the
> imported NAME across every path spelling, closing the relative-depth/alias bypass.

- [ ] **Step 3: Add the two tracked disables (the only current `GameState` violators)**

In `src/screens/GameScreen.tsx` and `src/components/StateDebug.tsx`, on the line that
imports `GameState` from `../types`, add directly above it:

```ts
// eslint-disable-next-line no-restricted-imports -- TODO(phase0-seatview): refactor to SeatView (Foundations §2.2, RC2-ARCH-001)
```

- [ ] **Step 4: Add a PERMANENT regression test that the guard still fires**

The guard itself must be regression-protected (a future config edit must not silently
disable it). Create a fixture as a non-linted `.txt` (so it never breaks `npm run lint`)
and a Jest test that runs ESLint programmatically against it.

Create `CoteccApp/src/net/__lintfixtures__/badClientImport.txt`:
```ts
import {GameState} from '../../types';
export const leak = (s: GameState) => s.players.length;
```

Create `CoteccApp/src/net/lintGuard.test.ts`:
```ts
import {ESLint} from 'eslint';
import * as path from 'path';
import * as fs from 'fs';

// Verifies the client-only-SeatView guard actually flags a GameState import in a
// client folder. Lints the fixture AS IF it lived at src/screens/_guardcheck.tsx.
it('flags a client-component GameState import (RC2-ARCH-001 guard is live)', async () => {
  const code = fs.readFileSync(
    path.join(__dirname, '__lintfixtures__', 'badClientImport.txt'),
    'utf8',
  );
  const eslint = new ESLint({cwd: path.join(__dirname, '..', '..')});
  const results = await eslint.lintText(code, {
    filePath: path.join('src', 'screens', '_guardcheck.tsx'),
  });
  const messages = results[0].messages.map(m => m.ruleId);
  expect(messages).toContain('no-restricted-imports');
});
```

- [ ] **Step 5: Run the guard test + full lint**

Run: `cd CoteccApp && npm test -- lintGuard && npm run lint`
Expected: `lintGuard` PASSES (guard fires on the fixture); `npm run lint` PASSES clean
(the two tracked disables are the only exceptions; no other violators remain).

- [ ] **Step 6: Commit**

```bash
git add CoteccApp/.eslintrc.js CoteccApp/src/screens/GameScreen.tsx CoteccApp/src/components/StateDebug.tsx CoteccApp/src/net/lintGuard.test.ts CoteccApp/src/net/__lintfixtures__/badClientImport.txt
git commit -m "feat(net): client-only-SeatView guard + permanent regression test (Phase 0 T13, RC2-ARCH-001)"
```

---

## Task 14: Golden JSON frame fixtures + compatibility test

Implements Foundations §3.5 (API-008). Freeze one canonical frame per representative
message type so accidental protocol changes break a test.

**Files:**
- Create: `CoteccApp/src/net/__fixtures__/frames.ts`
- Test: `CoteccApp/src/net/protocol.test.ts` (append)

- [ ] **Step 1: Write the failing test (append to `protocol.test.ts`)**

```ts
import {GOLDEN_FRAMES} from './__fixtures__/frames';
import {decodeEnvelope} from './protocol';

describe('golden frames', () => {
  it('every golden frame decodes successfully', () => {
    for (const [name, raw] of Object.entries(GOLDEN_FRAMES)) {
      const res = decodeEnvelope(raw);
      expect(name && res.ok).toBeTruthy();
    }
  });

  it('golden frames match the committed snapshot (change-detector)', () => {
    expect(GOLDEN_FRAMES).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- protocol`
Expected: FAIL — fixtures module not found.

- [ ] **Step 3: Write the fixtures**

> **Build frames from the REAL producers (resolves review finding).** Hand-written JSON
> snapshots are tautological — they only change when the fixture file changes, so a change
> to the actual `Envelope`/payload types or to `makeEnvelope`/`encodeRoundResult` would
> NOT break the snapshot. Generate frames via the real producers so a producer change
> breaks the change-detector. `sentAt` is non-deterministic, so normalise it before
> snapshotting.

```ts
// CoteccApp/src/net/__fixtures__/frames.ts
// Canonical wire frames produced by the REAL encoders, so any change to a producer
// (envelope shape, payload encoder) breaks the change-detector snapshot in T14.
import {makeEnvelope} from '../protocol';
import {encodeRoundResult} from '../codec';
import {RoundOutcome} from '../../types';

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
      // real codec output, proving the Set→array encoding is part of the frame
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
```

- [ ] **Step 4: Run and commit (snapshot is created on first run)**

Run: `npm test -- protocol`
Expected: PASS; a new `__snapshots__/protocol.test.ts.snap` is written.

```bash
git add CoteccApp/src/net/__fixtures__/frames.ts CoteccApp/src/net/protocol.test.ts CoteccApp/src/net/__snapshots__/protocol.test.ts.snap
git commit -m "feat(net): golden wire-frame fixtures + change-detector (Phase 0 T14, API-008)"
```

---

## Task 15: Phase 0 exit-gate verification

Implements Foundations §5. Run every guardrail; this is the single "Phase 0 is done"
check. One small config change (per-directory coverage), then verify the gates pass.

**Files:** Modify: `CoteccApp/jest.config.js` (per-directory coverage threshold).

- [ ] **Step 1: Add a per-directory coverage floor for the new modules**

The existing `coverageThreshold.global` floor cannot catch thinly-tested NEW code (a
large well-tested engine keeps the global average up). Add explicit per-directory floors
so `src/net/**` and `src/engine/**` must themselves be covered. Merge into
`coverageThreshold` in `CoteccApp/jest.config.js`:

```js
coverageThreshold: {
  global: {statements: 88, branches: 77, functions: 85, lines: 88},
  './src/net/': {statements: 90, branches: 80, functions: 90, lines: 90},
  './src/engine/': {statements: 90, branches: 80, functions: 90, lines: 90},
},
```

- [ ] **Step 2: Full test suite + coverage**

Run: `cd CoteccApp && npm test`
Expected: PASS — all suites green; global floor met AND `src/net/`, `src/engine/`
per-directory floors met. If a new module is under-covered, this now fails (intended).

- [ ] **Step 3: Type check**

Run: `cd CoteccApp && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint (boundary guard active)**

Run: `cd CoteccApp && npm run lint`
Expected: PASS — the client-only-`SeatView` rule is enforced.

- [ ] **Step 5: Targeted guardrail confirmation**

Run each and confirm PASS:
```bash
cd CoteccApp
npm test -- prng roundLogic        # seeded deal reproducibility (gate)
npm test -- cardsLogic hydrate     # card-identity / canonical order (gate)
npm test -- codec                  # Set/numeric-key round-trip (gate)
npm test -- seatView               # redaction oracle, dealSeed never leaks (gate)
npm test -- protocol               # golden frames change-detector (gate)
```
Expected: all PASS.

- [ ] **Step 6: Confirm the Phase 0 exit checklist**

Verify each is true (maps to Foundations §5):
1. [ ] Existing Jest suites green; coverage preserved; offline play unchanged (T2, T4, T12 regression).
2. [ ] Seeded deal, `applyMove` result, value-based cards, codec round-trip, hydrator — all tested (T1–T7).
3. [ ] `protocol.ts` + golden fixtures + decode/validate; `StateDelta`/`LobbyUpdated` typed; sequence reconciliation unit-tested (T10–T12, T14).
4. [ ] `SeatView` projection + leakage tests pass for 2–6 seats; `dealSeed` never in any serialized frame (T9).
5. [ ] Client-only-`SeatView` boundary: **lint** rule enforced in CI for all client code + a permanent guard regression test (T13). NOTE: the **type** half (GameScreen holding `SeatView` not `GameState`) is a tracked follow-up via two `eslint-disable`s — do NOT tick this as fully "type + lint" until those disables are removed by the §2.2 refactor.

- [ ] **Step 7: Final commit (if any snapshot/coverage artifacts changed)**

```bash
git add -A CoteccApp
git commit -m "chore(net): Phase 0 exit-gate verification green (Phase 0 T15)" || echo "nothing to commit"
```

---

## Self-review note (for the plan author / reviewer)
- Every new file is created before it is imported by a later task.
- Types referenced across tasks: `CardRef` (T3) → used in T5, T9, T10. `MoveResult`/
  `MoveRejectCode` (T5) mirrored in `protocol.ts` `MoveRejectCode` (T10) and
  `SubmitResult` (T12) — names kept identical on purpose.
- `nextMove`/`endRound` are already exported from `gameLogic.ts` (used by T5).
- The one knowingly-deferred item is the full `GameScreen` → `SeatView` refactor
  (Foundations §2.2); T13 lands the guard + a single tracked `eslint-disable` so the
  boundary is enforced for all new code while the screen refactor is itself a tracked
  follow-up. This is called out explicitly rather than hidden.
