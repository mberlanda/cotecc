# Local Multiplayer — Foundations (Phase 0 contracts)

**Date:** 2026-06-20 · **Revision:** v3 · **Phase:** 0 (no networking) · **Parent:** `…connectivity-design.md` (v3)

> **v3 changes (round-2 fixes):** `dealSeed` is host-internal and prohibited on the
> wire (RC2-ARCH-002 / RC2-SEC-002 / RC2-API-002 / RC2-GAME-003); sequence
> reconciliation rule added (RC2-API-001 / API-004); canonical card ordering pinned
> (RC2-GAME-001); `legalActions`/phase mapping defined (RC2-GAME-002); Phase 0 exit
> now enforces clients consume **only** `SeatView` (RC2-ARCH-001).
**Resolves clusters:** A (engine determinism/serialization), D (seat model),
B (wire protocol v1), C (SeatView redaction).

**Goal:** introduce the contracts and engine changes every transport depends on,
with **zero behaviour change to existing offline play** (proven via a loopback
transport). No sockets, no UI redesign. This is the critical path: nothing in
Phase 1 can be built correctly until these exist.

---

## 1. Engine hardening (cluster A)

v1 wrongly called the engine a directly-serializable pure reducer. Reality (from
`src/utils/*`, `src/types.ts`): `newRound` deals with `Math.random`; `playCard`
mutates in place and swallows errors; each card object is shared between `cards`
and `cardsBySuit`; `RoundResult.roundLosers` is a `Set` (→ `JSON.stringify` gives
`{}`). We harden minimally — **wrap, don't rewrite** the rules.

### 1.1 Canonical, seeded deal *(ARCH-001, GAME-001)*
- Replace the implicit `Math.random` shuffle with a **seeded PRNG** (e.g. a small
  xorshift/mulberry32) fed an explicit `dealSeed: string`.
- The authoritative host generates `dealSeed` per round; the dealt state is then a
  pure function of `(playerIds, initialPlayerId, dealSeed)`.
- Enables replay, reconnect snapshots, and (later) commit-reveal verification.
- **The engine is deterministic only after a canonical dealt state** — say so.

### 1.2 Typed command results *(GAME-004, API-003)*
- Add a thin result type so the network layer gets structured outcomes instead of
  `console.log` + silent return:
  ```ts
  type MoveResult =
    | { ok: true; events: GameEvent[] }              // applied
    | { ok: false; code: MoveRejectCode; message: string };
  ```
- `MoveRejectCode` = `NOT_YOUR_TURN | CARD_NOT_IN_HAND | MUST_FOLLOW_SUIT |
  ROUND_NOT_ACTIVE | GAME_OVER`. Existing `validateMove` throws map onto these.
- Keep `playCard` as the in-place applier; add `applyMove(state, cmd): MoveResult`
  as the network-facing wrapper.

### 1.3 Value-based card identity *(GAME-005, API-006)*
- `makeMove` matches by reference (`c === playedCard`); a wire/rehydrated card
  breaks this. Fix at the source: match by value `(suit, rank)`.
- Define `CardRef = { suit: Suit; rank: number }`. **Points are host-derived**;
  client-sent points are ignored.
- A **snapshot hydrator** rebuilds `cardsBySuit` from canonical `cards` so a JSON
  round-trip can't corrupt the duplicate-reference invariant.
- **Canonical card ordering** *(RC2-GAME-001)*: define a total order on cards
  (`suit` then `rank`) and have the codec/hydrator emit `cards` and `cardsBySuit`
  in that order. A non-canonical round-trip must not change suit-following
  evaluation — guard with a property test (a shuffled-then-encoded hand yields the
  same `legalActions` as the original).

### 1.4 Wire codec *(WS-003, API-005)*
- Define `WireGameState`/`WireRoundResult`: `Set` → array, numeric map keys
  normalised, no shared object identity assumed.
- `encode(state): Wire*` / `decode(Wire*): state` with **round-trip property
  tests** (decode∘encode == canonicalised state) added before any transport.

### 1.5 Acceptance (A)
- All existing Jest suites stay green; coverage thresholds preserved.
- New tests: seeded deal reproducibility; `applyMove` reject codes; value-based
  card removal; codec round-trip; hydrator rebuilds `cardsBySuit`.

---

## 2. Seat ownership & client state model (cluster D)

v1 is coupled to one local `isHuman` player (`GameScreen` renders the first human,
ends when that human is out, runs AI in the UI; `HomeScreen` makes one human + AI
placeholders). Networking needs seats decoupled from "the local human".

### 2.1 Seat model *(ARCH-003, GAME-006)*
```ts
type Controller = 'local' | 'remote' | 'ai';
type SeatConnection = 'connected' | 'grace' | 'disconnected';
interface Seat {
  seatId: SeatId;          // stable for the match (not the engine PlayerID alias)
  playerId: PlayerID;      // engine id
  displayName: string;
  controller: Controller;  // who acts for this seat now
  connection: SeatConnection;
  isHostSeat: boolean;
}
```
- `localSeatId` identifies *this device's* seat (replaces `isHuman` for rendering).
- AI takeover (Phase 1B) flips `controller: remote → ai` without changing seat
  ownership; reclaim flips it back. The **pause-then-AI** default (D2) is policy
  layered on this model, specified in 1B.

### 2.2 Client view-model & state machine *(FE-002, FE-004, WS-005)*
- The client never holds `GameState`. It holds a `SeatView` (§4) + a connection
  state machine:
  `joining → connecting → seated → lobby → live → submittingMove →
   reconnecting → offlinePaused → aiControlled → reclaiming → failed/closed`.
- `GameScreen` is refactored to consume a session + `SeatView` (presentational),
  with the **loopback** session reproducing today's single-device play.

### 2.3 Acceptance (D)
- Offline 2–6 player games, AI turns, round-end timing, game-over simulation, and
  navigation behave identically through the loopback session (regression set,
  QA-009).
- **Clients consume only `SeatView`** *(RC2-ARCH-001)*: `GameScreen` and every
  client component receive a `SeatView`, never `GameState`. Enforced by a typed
  boundary (the client store's type is `SeatView`) **plus** a lint/architecture
  rule forbidding imports of engine state types into client components — verified
  in CI, not by convention.

---

## 3. Wire protocol v1 (cluster B) — contains blockers ARCH-002, API-001

UTF-8 JSON frames, one discriminated union, shared by WebSocket / SSE+POST /
loopback (and later BLE/WebRTC).

### 3.1 Envelope *(WS-001, API-001)*
```ts
interface Envelope<T extends MsgType, P> {
  protocolVersion: 1;
  sessionId: string;        // match/session id
  seatId?: SeatId;          // set after SeatAssigned
  seatToken?: string;       // per-seat resume token (client→host auth)
  type: T;
  clientMessageId?: string; // client→host, for idempotency/dedup
  serverSeq?: number;       // host→client, monotonic authoritative order
  stateVersion?: number;    // host→client, monotonic snapshot/delta version
  sentAt: string;           // ISO; diagnostics only, never trusted for ordering
  payload: P;
}
```
- **Ordering/idempotency** *(WS-002, API-004, RC2-API-001)*: host assigns monotonic
  `serverSeq` to applied events and `stateVersion` to snapshots/deltas; clients
  ignore stale `stateVersion`. The two client-side counters have **distinct,
  non-overlapping roles**:
  - `clientSeq` — per-seat **ordering**. The host accepts only the strictly-next
    `clientSeq`; a lower-or-equal value is a duplicate (idempotent re-ack, no
    re-apply); a gap means the client is out of sync → host replies `STALE_STATE`
    and the client must reconnect/resync from the latest `SeatSnapshot`. The host
    does **not** buffer out-of-order commands.
  - `clientMessageId` — opaque **retry de-dup** key, used only to return the same
    ack for a re-sent identical command (e.g. WS reconnect mid-flight). De-dup
    window = the match lifetime (bounded by the move log).

### 3.2 Message union *(API-002, GAME-002)*
- **Lifecycle:** `JoinRequest → JoinAccepted | JoinRejected`, `SeatAssigned`,
  `LobbyUpdated`, `GameStarted`.
- **Setup / round transitions** *(GAME-002, RC2-ARCH-002, RC2-API-002)*:
  `ConfigureTable`, `StartRound`/`DealRound`, `RoundComplete`, `RequestNextRound`.
  - **`dealSeed` is host-internal and NEVER sent on the wire** *(RC2-SEC-002)*. The
    host deals locally with the seed, then distributes hands by sending **each
    client its own `SeatSnapshot`** (containing only `localHand`); there is no
    broadcast carrying any hand. `DealRound` to clients carries `roundId`, active
    seats, and `initialPlayerID` only.
  - The seed is retained host-side solely for replay/host-internal verification
    (and, in a future F3, for post-round reveal).
- **Play:** `PlayMove` (client→host: `{ cardRef, clientSeq }` + envelope — **no
  seat/player id in payload**, host derives it from the bound connection, SEC-002),
  `MoveAccepted` / `MoveRejected{code}`.
- **State:** `SeatSnapshot` (full redacted view) / `StateDelta` (incremental), both
  carrying `serverSeq`, `stateVersion`, `roundId`, `turnId`.
- **Liveness/control:** `Heartbeat`/`Ack`, `SeatExpired`, `Bye`, `Error{code}`.
- **Error codes:** the `MoveRejectCode` set plus `BAD_SEAT_TOKEN`, `STALE_STATE`,
  `SEAT_TAKEN`, `TABLE_FULL`, `GAME_ALREADY_STARTED`, `UNSUPPORTED_PROTOCOL`.
  *(API-003)*

### 3.3 Session lifecycle state machine *(API-002)*
`discovered → joining → seated → lobby → in_game → disconnected/reconnecting →
left`. Reconnect: client sends `JoinRequest` with `seatToken` + last `stateVersion`;
host replies `SeatSnapshot` (latest) or `SeatExpired`. *(WS-002)*

### 3.4 Transport capability interfaces *(ARCH-010, WS-007, API-007)*
Replace the thin `send/broadcast` seam with capability-typed endpoints so
asymmetric transports fit:
```ts
interface HostEndpoint { onClient(cb); send(connId, Envelope); broadcast(Envelope); close(); }
interface ClientConnection { send(Envelope); onMessage(cb); onClose(cb); status; }
```
- **SSE+POST parity** *(WS-007, API-007)*: `GET /session/:id/events?afterSeq=` (SSE,
  events carry `serverSeq`, resume via `Last-Event-ID`) + `POST /session/:id/commands`
  (idempotent `clientMessageId`) — **same envelope and sequencing as WebSocket**, so
  the fallback is not a second protocol.
- **Backpressure** *(WS-008)*: bounded per-peer queue; coalesce obsolete state
  updates (prefer latest snapshot over queued deltas); drop clients exceeding queue/
  `bufferedAmount` thresholds.

### 3.5 Deliverables & acceptance (B) *(API-008)*
- `protocol.ts`: discriminated TS unions + runtime decode/validate helpers.
- **Golden JSON frame fixtures** per message type + compatibility tests; a short
  protocol changelog with deprecation rules.
- Loopback transport implements the interfaces end-to-end with these frames.

---

## 4. SeatView redaction (cluster C) — security-critical

The primary privacy boundary. `GameState` contains every hand; accidental full-
state serialization silently defeats it. Redaction is an **allowlist schema with a
test oracle**, not a convention. *(ARCH-004, GAME-003, SEC-004, QA-005)*

### 4.1 Schema *(FE-003, API-005)*
```ts
interface SeatSummary {
  seatId: SeatId; displayName: string;
  cardCount: number;            // public count only — never the cards
  lives: number; roundScore: number;
  controller: Controller; connection: SeatConnection;
}
interface SeatView {
  localSeatId: SeatId;
  localHand: Card[];            // ONLY the recipient's hand
  seats: SeatSummary[];
  currentTrick: { seatId: SeatId; card: Card }[];
  pastTricks: PublicTrick[];    // revealed cards only
  turn: { currentSeatId: SeatId; suit: Suit | null };
  phase: 'lobby' | 'dealing' | 'playing' | 'roundEnd' | 'gameOver';
  legalActions: CardRef[];      // host-computed for the local seat
  serverSeq: number; stateVersion: number; roundId: number;
}
```
- `projectStateForSeat(state, seatId): SeatView` is the **only** host→client state
  producer.
- **`legalActions` & phase semantics** *(RC2-GAME-002)*: `legalActions` is
  non-empty **only** when `phase === 'playing'` AND `turn.currentSeatId ===
  localSeatId`; it is `[]` in every other phase/turn. The client connection-state
  machine (§2.2) maps `phase` → UI: `lobby→lobby`, `dealing→syncing`,
  `playing→live` (input enabled only when `legalActions` non-empty),
  `roundEnd→round summary`, `gameOver→podium/rematch`.
- **`LobbyUpdated` / `StateDelta` schemas** *(RC2-API-003, RC2-API-004)*:
  `LobbyUpdated` carries `{ tableName, seats: SeatSummary[], canStart, hostSeatId }`.
  `StateDelta` is an explicit Phase 0 deliverable typed as a discriminated set of
  events (`MoveApplied`, `TrickWon`, `RoundDealt`, `RoundEnded`) each with
  `serverSeq`/`stateVersion`; a client unable to apply a delta requests a full
  `SeatSnapshot`.

### 4.2 Hard prohibitions (test-gated) *(SEC-004, QA-005)*
Outbound payloads, persisted logs, debug UI, and reconnect snapshots MUST NOT
contain: `GameState`, `currentRound.players[].cards` (other seats), `cardsBySuit`,
`pastRounds` raw hands, `StateDebug` output, or **`dealSeed` / any RNG state**
*(RC2-SEC-002)* — the seed reconstructs every hand and must never leave the host. Add **snapshot tests asserting
serialized `SeatView` for seat X contains no other seat's cards** for every
outbound message type. Network sessions disable the debug state view.

### 4.3 Acceptance (C)
- For a dealt 6-seat game, `projectStateForSeat` for each seat serializes with only
  that seat's hand; a fuzz test over random states finds no foreign-card leakage;
  `StateDelta` obeys the same allowlist.

---

## 5. Phase 0 exit criteria
1. Existing Jest suites green; coverage thresholds preserved; offline play
   unchanged through loopback (QA-009).
2. Seeded deal, `applyMove` result type, value-based cards, codec round-trip,
   hydrator — all tested.
3. `protocol.ts` + golden fixtures + decode/validate; loopback runs full frames;
   `StateDelta`/`LobbyUpdated` typed; sequence reconciliation (§3.1) unit-tested.
4. `SeatView` projection + leakage tests pass for 2–6 seats; **`dealSeed` never
   appears in any serialized frame/log** (leakage oracle includes seed/RNG state).
5. **Client-only-`SeatView`** boundary enforced by type + lint rule in CI
   (RC2-ARCH-001).

## 6. Traceability
Resolves: ARCH-001, ARCH-002🚫, ARCH-003, ARCH-004, ARCH-009(partial→1B),
ARCH-010; GAME-001..006; WS-001, WS-002, WS-003, WS-005, WS-007, WS-008; API-001🚫,
API-002, API-003, API-004, API-005, API-006, API-007, API-008; SEC-002, SEC-003
(token shape; lifecycle/hardening in 1A/1B), SEC-004; FE-002, FE-003, FE-004;
QA-005, QA-009.
**Round-2:** RC2-ARCH-001, RC2-ARCH-002; RC2-API-001, RC2-API-002, RC2-API-003,
RC2-API-004; RC2-SEC-002; RC2-GAME-001, RC2-GAME-002.
