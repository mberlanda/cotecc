# API Designer Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 08 · **Role:** API · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 7 |
| PARTIALLY | 1 |
| NOT-ADDRESSED | 0 |
| WONT-FIX / deferred by design | 0 |

All 8 round-1 comments are addressed; 1 is partially addressed with a residual gap (API-004). No blockers remain from round 1.

New issues in v2: **4** (1 MAJOR, 3 MINOR).

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-08-API-001 | RESOLVED | Foundations §3.1 | Envelope fully specified: `protocolVersion`, `sessionId`, `seatId`, `seatToken`, `type`, `clientMessageId`, `serverSeq`, `stateVersion`, `sentAt`, `payload`. UTF-8 JSON, discriminated union, shared by all transports. The blocking concern is closed. |
| LMCD-RC-08-API-002 | RESOLVED | Foundations §3.2, §3.3 | Full message union: `JoinRequest → JoinAccepted | JoinRejected`, `SeatAssigned`, `LobbyUpdated`, `GameStarted`. State machine: `discovered → joining → seated → lobby → in_game → disconnected/reconnecting → left`. Reconnect path (`seatToken` + `stateVersion` → `SeatSnapshot | SeatExpired`) also covered. |
| LMCD-RC-08-API-003 | RESOLVED | Foundations §1.2, §3.2 | `MoveResult` typed return (`ok: true/false`, `code`). `MoveRejectCode` = `NOT_YOUR_TURN | CARD_NOT_IN_HAND | MUST_FOLLOW_SUIT | ROUND_NOT_ACTIVE | GAME_OVER`. Wire-layer error codes: `BAD_SEAT_TOKEN`, `STALE_STATE`, `SEAT_TAKEN`, `TABLE_FULL`, `GAME_ALREADY_STARTED`, `UNSUPPORTED_PROTOCOL`. `MoveAccepted`/`MoveRejected{code}` messages in the union. |
| LMCD-RC-08-API-004 | PARTIALLY | Foundations §3.1, §3.2, §1B §2.1 | `clientMessageId` on every client command; per-seat monotonic `clientSeq`; host de-dups by `(seatId, clientMessageId)`; monotonic `serverSeq` on applied events; event-sourced log (F2) in 1B keeps the replay basis. **Residual gap:** the spec says the host returns "the same ack for duplicates" but does not state the de-dup window (session-scoped? round-scoped? LRU with a capacity?) nor what happens if a `clientMessageId` arrives after the window expires — retry could be silently applied or silently dropped. Per-seat `clientSeq` is in the envelope but the ordering rule (reject or queue out-of-order?) is not stated. These gaps are small but will surface during 1B F2 implementation. |
| LMCD-RC-08-API-005 | RESOLVED | Foundations §1.4, §4.1 | `WireGameState`/`WireRoundResult` with `Set`→array, numeric-map normalisation, and codec round-trip tests. `SeatView` schema fully specified: `localHand`, `seats` (with `cardCount` only for others), `currentTrick`, `pastTricks`, `turn`, `phase`, `legalActions`, `serverSeq`, `stateVersion`, `roundId`. `StateDelta` also bound to the same allowlist. |
| LMCD-RC-08-API-006 | RESOLVED | Foundations §1.3 | `CardRef = { suit, rank }`. `makeMove` changed to value-match `(suit, rank)`. Points are host-derived; client-sent points ignored. Rejects with `CARD_NOT_IN_HAND` when no match. |
| LMCD-RC-08-API-007 | RESOLVED | Foundations §3.4; master §4-D | SSE+POST parity explicitly specified: `GET /session/:id/events?afterSeq=` (with `serverSeq` on events, resume via `Last-Event-ID`) + `POST /session/:id/commands` (idempotent via `clientMessageId`). **Same envelope and sequencing as WebSocket.** Capability-typed `HostEndpoint`/`ClientConnection` interfaces make SSE a transport plug-in, not a divergent protocol. |
| LMCD-RC-08-API-008 | RESOLVED | Foundations §3.5 | Phase 0 deliverables explicitly listed: `protocol.ts` discriminated TS unions + runtime decode/validate helpers; golden JSON frame fixtures per message type; compatibility tests; protocol changelog with deprecation rules. Loopback transport runs full frames end-to-end. |

---

## New issues (v2)

### LMCD-RC2-08-API-001
**Severity:** MAJOR
**Section:** Foundations §3.1 (envelope) + §3.2 `PlayMove`
**Concern:** The `PlayMove` message carries `clientSeq` in the payload but the envelope already has `clientMessageId`. The spec defines two overlapping sequence mechanisms without reconciling them. `clientMessageId` is described as the idempotency key for de-duplication; `clientSeq` is described as a per-seat monotonic counter used for ordering. Neither the relationship between them nor the authoritative ordering rule is stated: should the host reject a `PlayMove` whose `clientSeq` is not exactly `lastSeq + 1`? Is a gap an error or a reconnect artefact? Without a clear ruling, every transport implementation (WebSocket, SSE+POST, BLE) will make a different choice, defeating the "same sequencing" goal.
**Recommendation:** Add a short "sequencing contract" note to §3.1: state that `clientSeq` is per-seat monotonic from 1; that the host rejects (with `STALE_STATE`) any command whose `clientSeq` is not `== lastApplied + 1` (not a replay) and re-acks any command whose `clientSeq == lastApplied` (is a replay with matching `clientMessageId`). State that gaps caused by reconnect are resolved by the host sending a fresh `SeatSnapshot` rather than by accepting out-of-order commands. Confirm `clientMessageId` is simply the de-dup key for the retry-ack cache.

---

### LMCD-RC2-08-API-002
**Severity:** MINOR
**Section:** Foundations §3.2 (`DealRound`) + §1.1 (seeded deal)
**Concern:** `DealRound` carries the `dealSeed` "to the host only" and "per-seat dealt hands to clients". The spec does not state how the host communicates dealt hands: as part of the `DealRound` broadcast (with per-seat filtering), as individual `SeatSnapshot` messages to each seat, or as a combination. If `DealRound` is broadcast with per-seat hand data, the host must produce N different payloads (one per seat) — that is a fan-out, not a broadcast. If `SeatSnapshot` carries the initial hand, `DealRound` is a round-start signal only. Either approach works but they differ in sequencing and reconnect semantics (a reconnecting client during `DealRound` must receive their hand somehow).
**Recommendation:** Clarify in §3.2 that `DealRound` is a host-internal signal only (or sent to host seat) and that each client receives their initial hand exclusively via an immediately-following `SeatSnapshot` (which already carries `localHand`). Document the reconnect path: a client that misses `DealRound` and reconnects within the dealing phase gets their current `SeatSnapshot` which already includes their hand.

---

### LMCD-RC2-08-API-003
**Severity:** MINOR
**Section:** Foundations §3.2 (`LobbyUpdated`) + Phase 1A §3.4 (lobby & seating contract)
**Concern:** `LobbyUpdated` is listed in the message union but its payload schema is not defined in the Foundations spec. Phase 1A §3.4 enumerates the lobby fields (table name, seat list, open/locked/bot status, ready indicators), but these are described in prose for UX purposes rather than as a typed payload. During the 1A implementation there is no canonical source of truth for what `LobbyUpdated.payload` must contain, making cross-client consistency (native app vs browser) depend on the implementer's interpretation.
**Recommendation:** Add a `LobbyUpdated` payload schema to Foundations §3.2 (or a small §3.2-bis): `{ seats: SeatSummary[]; lockedSeats: SeatId[]; botSeats: SeatId[]; tableName: string; hostSeatId: SeatId; readySeatIds: SeatId[]; lateJoinAllowed: boolean }`. Reference `SeatSummary` from §4.1 to avoid duplication.

---

### LMCD-RC2-08-API-004
**Severity:** MINOR
**Section:** Foundations §4.1 (`SeatView`) + §3.2 (`StateDelta`)
**Concern:** `StateDelta` is referenced in §3.2 and §4 as an incremental alternative to `SeatSnapshot`, and §4.2 states it must obey the same allowlist. However, the payload schema for `StateDelta` is never specified — not in §3.2, not in §4.1, not in §3.5 deliverables. The only constraint is that it carries `serverSeq` and `stateVersion`. Without a defined delta structure, implementers must choose between a partial-`SeatView` (sparse fields, hard to validate), a JSON-patch document (RFC 6902, complex), or a custom diff format. This choice has implications for the protocol changelog and for the compatibility tests called out in §3.5.
**Recommendation:** Either (a) define `StateDelta` as a `Partial<SeatView>` with a `deltaFields: (keyof SeatView)[]` discriminator so clients know which fields to merge, or (b) explicitly defer `StateDelta` to 1B and mark `SeatSnapshot` as the only Phase 0/1A state carrier. If (b), remove `StateDelta` from the Phase 0 `protocol.ts` deliverable list to avoid premature implementation.

---

## Bottom line

Round 1's sole blocker (API-001: missing wire envelope) is fully resolved in Foundations §3. All 8 round-1 comments are addressed; API-004 (idempotency window and ordering rules) carries a small residual gap that should be tightened before F2/1B implementation begins. The v2 spec set is substantially more complete and safe to implement against.

The 4 new issues are non-blocking for Phase 0 work. LMCD-RC2-08-API-001 (dual-sequence-mechanism ambiguity) should be resolved before the first cross-transport integration test, as divergent implementations will be hard to reconcile retroactively. The remaining three (API-002, API-003, API-004) are spec-completeness gaps that can be filled in during Phase 0 `protocol.ts` authoring without blocking other workstreams.
