# Game Developer Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 03 · **Role:** Game · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 5 |
| PARTIALLY | 2 |
| NOT-ADDRESSED | 0 |
| WON'T-FIX (deferred with rationale) | 1 |

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-03-GAME-001 | RESOLVED | Foundations §1 (engine hardening), §1.1–1.4; master §10 traceability | v2 explicitly corrects the v1 overstatement. §1 opens with a precise list of the real engine defects (Math.random shuffle in `shuffleDeck`/`newPlayersHand`, in-place mutation + swallowed errors in `playCard`, shared card-object identity in `makeMove`/`cardsBySuit`, `RoundResult.roundLosers` is a `Set`). §1.1 mandates seeded PRNG + `dealSeed`; §1.2 typed `MoveResult` / `applyMove`; §1.3 value-based `CardRef` + hydrator; §1.4 `WireGameState` codec with round-trip tests. Engine is declared deterministic only after a canonical dealt state. All code-verified claims are accurate against the source. |
| LMCD-RC-03-GAME-002 | RESOLVED | Foundations §3.2 (message union) | `ConfigureTable`, `StartRound`/`DealRound` (with `roundId`, active seats, `initialPlayerID`, `dealSeed`), `RoundComplete`, and `RequestNextRound` are all listed in the wire-protocol message union. Round-transition events are now first-class protocol messages. |
| LMCD-RC-03-GAME-003 | RESOLVED | Foundations §4, §4.1–4.3 | `SeatView` is now a concrete, fully-typed schema with an explicit allowlist: `localHand` for the owning seat only; `SeatSummary` (with `cardCount` not cards) for all others; `currentTrick`, `pastTricks`, `turn`, `phase`, `legalActions`. §4.2 enumerates hard prohibitions (GameState, other seats' cards, `cardsBySuit`, `pastRounds` raw hands, `StateDebug`) and mandates test-gated snapshot oracles. `projectStateForSeat` is the sole host→client state producer. Network sessions disable debug views. |
| LMCD-RC-03-GAME-004 | RESOLVED | Foundations §3.2, §1.2, §1.3; master §5 | `PlayMove` payload is now `{ cardRef, clientSeq }` only — no seat/player id, no card objects with points. Host derives seat from the bound connection (`SEC-002`). §1.2 adds typed `MoveRejectCode` return from `applyMove`; §1.3 makes card identity value-based so the host rehydrates from authoritative state. `MoveAccepted`/`MoveRejected{code}` are specified. |
| LMCD-RC-03-GAME-005 | RESOLVED | Foundations §1.3 | §1.3 directly addresses the shared-reference invariant: value-based card identity (`CardRef = {suit, rank}`) replaces reference identity in `makeMove` (currently `c === playedCard`); a snapshot hydrator rebuilds `cardsBySuit` from canonical `cards` so a JSON round-trip cannot corrupt the dual-collection invariant. |
| LMCD-RC-03-GAME-006 | RESOLVED | Foundations §2.1 (seat model); 1B §2.3 (pause-then-AI policy) | §2.1 introduces the `Seat` interface with `controller: 'local' | 'remote' | 'ai'`, `connection: 'connected' | 'grace' | 'disconnected'`, stable reclaim token, and `isHostSeat`. AI takeover flips `controller: remote → ai` without changing seat ownership; reclaim flips it back at the next turn boundary. The pause-then-AI default (D2) and host-configurable timeout, duplicate-token/connection rejection are in 1B §2.3. |
| LMCD-RC-03-GAME-007 | WON'T-FIX (deferred with rationale) | master §2 D5, §6, §4 R2; 1B §2.5 | The conflict is explicitly acknowledged. D5 states host migration is deferred; Phase 1 host-loss ends the match. Master §6 documents the rationale: hidden-hand handoff needs a trusted successor or crypto, which conflicts with F1 privacy. 1B §2.5 restates this explicitly. The trade-off is named (mirror only the public log; full-state handoff requires F3-class protocol). The concern is logged as a future trigger (observed host-drop rate). |
| LMCD-RC-03-GAME-008 | PARTIALLY | master §4 F3 note, §6; 1B §3 final bullet | The Phase 1 deferral of F3 is stated clearly and tagged with an appropriate trigger (concrete adversarial/ranked scenario). Master §6 correctly notes the deferred item as "F3 trustless deal (commit-reveal → mental poker)". 1B §3 (security hardening) adds a bullet explicitly restating that F2's audit trail does not stop a malicious host and anti-host begins at F3. However, the specific two-level split requested in round 1 — (a) tamper-evident host deal with commitments, signed transcript, deterministic seed, and post-round reveal vs (b) true host-private play via mental-poker/encrypted-deck — is not developed in v2. The item is deferred as a single block, so the internal distinction between levels (a) and (b) remains unresolved should it ever be revisited. This is acceptable for Phase 1, but the deferred backlog entry does not preserve the distinction. |

---

## New issues (v2)

### LMCD-RC2-03-GAME-001
**Severity:** medium
**Section:** Foundations §1.3 / `cardsLogic.ts` `dealCards`
**Concern: `cards` array built from `cardsBySuit` during dealing — hydrator must replicate exact order.**
The current `dealCards` function populates `cardsBySuit` first, then sorts each suit and concatenates into `cards`. After a JSON round-trip + hydration, if the hydrator rebuilds `cardsBySuit` from `cards` without reproducing this sort, the two collections will disagree in sort order. The Foundations spec mandates a hydrator (§1.3) and a codec round-trip property test (§1.4) but does not pin the canonical sort order or assert that `cards` is always the union of `cardsBySuit` values in suit-then-rank order. If the hydrator uses a different construction order, `validateSuit` and `legalActions` projection could diverge between host and a reconnecting client, producing false `MUST_FOLLOW_SUIT` rejections.
**Recommendation:** Add a sentence to §1.3 and §1.4 pinning the canonical card ordering rule (suit-then-rank, matching `sortCards`), assert it as part of the codec round-trip test, and include it in the hydrator spec.

### LMCD-RC2-03-GAME-002
**Severity:** medium
**Section:** Foundations §3.2, §4.1; 1A §3.5 (command-state UX)
**Concern: `legalActions` in `SeatView` is host-computed but no spec covers how it is projected during non-play phases.**
`SeatView.legalActions: CardRef[]` is declared in the schema (§4.1) but the Foundations spec does not specify what the field should contain outside the `playing` phase (e.g. during `lobby`, `dealing`, `roundEnd`, `gameOver`). An empty list is the natural default, but if the host sends a non-empty `legalActions` during `dealing` or if the client renders move UI before the phase is `playing`, a race between `DealRound` delivery and the phase transition could allow a guest client to attempt a premature move. The 1A command-state UX (§3.5) lists `idle | myTurn | submitting | ...` but the mapping from `SeatView.phase` to those client states is not specified.
**Recommendation:** Add a one-line rule to §4.1: `legalActions` is non-empty only when `phase === 'playing'` and `turn.currentSeatId === localSeatId`; the host MUST send an empty list otherwise. Document the `phase → client-state` mapping in the Foundations §2.2 client state machine or in the 1A UX section.

### LMCD-RC2-03-GAME-003
**Severity:** low
**Section:** Foundations §1.1; 1B §2.3
**Concern: AI takeover after deal-seed generation creates a fairness edge case when AI acts for a seat that has not yet received its `DealRound` snapshot.**
§1.1 specifies that the host generates `dealSeed` and sends per-seat dealt hands via `DealRound`. §2.3 (1B) specifies that on `grace→disconnected` the host flips `controller: remote→ai` and the AI acts using `aiMoveToPlay`. If a guest disconnects between `RoundComplete` and the new `DealRound` being delivered (e.g. during the host-configurable timeout), the AI will act with the hand that was dealt from the seeded deal, which the disconnected player never saw. This is functionally correct but creates a perception-of-fairness issue: a player who reconnects sees that the AI played cards from a hand they never received a snapshot of. The current spec does not clarify whether a `SeatSnapshot` containing the newly dealt hand is sent before any AI move is applied, or whether the reconnect flow delivers it retroactively after some AI moves have been played.
**Recommendation:** Add a rule to 1B §2.3 (or the Foundations reconnect spec): before the AI makes any move on behalf of a disconnected seat, the host must have delivered `DealRound` to that seat's connection (or confirmed delivery via the session log). On reconnect after AI moves, the `SeatSnapshot` must include the current (AI-modified) hand, the moves already made, and a flag indicating AI-controlled turns taken — so the returning player can reconstruct what happened.

---

## Bottom line

The v2 design substantially addresses all eight round-1 game-logic concerns. The engine-reality mismatch (GAME-001/005) is now documented and remediation is designed in detail. The wire protocol (GAME-002/004) and SeatView schema (GAME-003) have become concrete and correct. The seat-controller model (GAME-006) is well-specified. Host migration (GAME-007) is deferred with explicit rationale. The only partially-open item (GAME-008, F3 two-level split) is a deferred design refinement, not a Phase 1 blocker.

The three new issues are medium/low severity and all addressable with one-line clarifications to existing spec sections. None blocks Phase 0 or Phase 1A delivery, but LMCD-RC2-03-GAME-001 (card-order canonicalization) should be resolved before the hydrator and codec tests are written in Phase 0, as it is easier to pin the invariant now than to retrofit it after tests are committed.
