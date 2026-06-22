# Plan Review — Round 1 findings & resolutions

**Date:** 2026-06-21 · Three focused reviewer agents audited the implementation plans
(engine correctness · executability/ambiguity · guardrails/spec-coverage). This is the
traceable record of every finding and how it was resolved — fixed inline in the plans,
or **TRACKED** as a known follow-up (with the concrete fix noted).

## Verdict after this round
All BLOCKERs and the high-impact MAJORs are **fixed inline**. Remaining items are
**TRACKED** deferrals that do not stop a weak-model worker from executing Phase 0
end-to-end. Re-review (round 2) recommended before execution begins.

## Fixed inline

| # | Severity | Finding | Resolution (plan §) |
|---|---|---|---|
| R1-1 | BLOCKER | Phase 0 T2/T3/T4 test "append" blocks re-imported symbols already imported at the top of existing test files → TS2300 duplicate identifier / `import/no-duplicates`. | Replaced "append import" with explicit **merge-into-existing-imports** instructions naming the only new symbol per file (P0 T2/T3/T4). |
| R2-1 | BLOCKER | Phase 0 T13 lint guard had more `GameState` violators than just `GameScreen` (`StateDebug`); `npm run lint` would fail with no instruction. Also `Round`/`PlayerHand` are legit display props. | Narrowed rule to **`GameState` only**; enumerated **both** violators (`GameScreen`, `StateDebug`) with tracked disables; made the pattern depth/alias-robust; added a **permanent** Jest guard-regression test (P0 T13). |
| R3-1 | BLOCKER | Coverage floor was global-only → can't catch thinly-tested new modules. | Added **per-directory** `coverageThreshold` for `./src/net/` and `./src/engine/` (P0 T15 Step 1). |
| R3-2 | BLOCKER | SSE+POST parity + backpressure (Foundations §3.4, WS-007/008/API-007) had no task though spec says Phase 0 resolves it. | Reconciled: the **contract** (interfaces + shared envelope/sequencing + `BackpressureLimits`) is fixed in P0 T12; the concrete HTTP adapter is implemented in **1A T5** (needs the embedded server). Documented as intentional split (P0 T12 note). |
| R3-3 | MAJOR | Redaction oracle was a fragile substring match, skipped foreign cards coinciding with local, and didn't cover all message types/fuzz. | Replaced with a **structural** `collectCardRefs` walk over the parsed payload + a **fuzz** mid-trick case; cross-ref to apply the same oracle to `StateDelta`/`LobbyUpdated` (P0 T9, T11 note). |
| R3-4 | MAJOR | Missing the spec's "legalActions stable after a wire round-trip" property test. | Added a property test over every lead suit (shuffle→encode→hydrate) (P0 T6). |
| R3-5 | MAJOR | Golden frames were hand-written → snapshot was tautological. | Rebuilt frames from the **real producers** (`makeEnvelope`, `encodeRoundResult`) with normalised `sentAt` (P0 T14). |
| R3-6 | MAJOR | T15 ticked "type + lint" boundary while the type half is deferred. | Reworded exit checklist item 5 to be honest: lint enforced now; type half is a tracked follow-up gated by removing the two disables (P0 T15 Step 6). |
| R2-3 | MAJOR | 1A T3 embed scripts said WHAT not HOW (hash algorithm unstated; `generatedAt`-in-hash bug). | Provided **complete** `embed-web-bundle.js` + `verify-embedded-bundle.js` (recursive walk, manifest excluded, `generatedAt` outside hash, hex sha256, sorted) + 3 tamper cases (HTML/JS/missing) (1A T3). |
| R2-2 | MAJOR | 1A T1 GATE resume condition ambiguous. | Rewrote GATE with explicit per-group resume rules and "exit gate last" (1A T1). |
| R2-4 | MAJOR | 1A T5 drove a `GameSession` lacking join/seat-binding. | Added the `join`/`bind`/`seatForConn` API as an explicit prerequisite sub-step + tests, with payload-derived-seat forbidden (SEC-002) (1A T5 Step 4). |
| R2-5 | MAJOR | 1A T7/T8 hid real decisions (address ranking, min-seats, duplicate-name). | Pinned: minimal address algorithm spelled out (1A T7 Step 2); **min seats = 2**, start rule, **duplicate-name = auto-suffix** (1A T8 Step 1). |
| R2-9 | MINOR | 1A T10 CI-verify had a non-deterministic "or watch the run" branch. | Made `yaml-lint` mandatory (exit 0); moved "watch run" to the lab gate (1A T10 Step 4). |
| R3-min | MINOR | Embed tamper test only covered HTML. | Added JS-asset and missing-manifest tamper cases (1A T3 Step 4). |
| R2-6 | MAJOR | 1B T5 referenced "9 rows from spec" not present in the plan. | **Inlined the 9 taxonomy rows** as a table the test asserts against (1B T5 Step 2). |
| R2-10 | MINOR | 1B T6 trapped a codeable step behind a LAB GATE. | Split into **Part A (pure, non-gated)** address ranking + **Part B (🚧 LAB GATE)** hotspot/mDNS (1B T6). |

## Tracked follow-ups (not blocking Phase 0 execution; fix before the relevant later task)

| # | Severity | Finding | Tracked fix |
|---|---|---|---|
| T-events | MAJOR | P0 `MoveResult` dropped `events: GameEvent[]`, so there's no path from an applied move to a `StateDelta`. | When implementing real `StateDelta` emission (1A/1B), have `applyMove`/`GameSession.submitMove` return the change set (e.g. `{events: StateDeltaEvent[]}`) so deltas can be derived. Phase 0 compiles without it. |
| T-wiregamestate | MINOR | Spec §1.4 names `WireGameState`; plan only codecs `WireRoundResult`+`scoresMap`. | Intentional: full state is **never** wired (SeatView only). Add a one-line note to Foundations §1.4 traceability OR implement `WireGameState` only if a full-state snapshot is ever needed. |
| T-pasttricks | MAJOR | `SeatView` omits `pastTricks: PublicTrick[]` and `turnId` (spec §4.1/§3.2). | Add `pastTricks` (project `round.pastTurns` → revealed cards only) + `turnId` to the `SeatView`/snapshot when the UI needs trick history (1A T8 game UI). Add to the redaction oracle. Until then the schema is a documented subset. |
| T-redaction-allmsgs | MAJOR | Oracle covers the projection; `StateDelta`/`LobbyUpdated` need it too (§4.2/§4.3). | P0 T11 note now requires it; ensure the T11 test actually asserts `collectCardRefs` over encoded `StateDelta`/`LobbyUpdated`. |
| T-screenshot | MINOR | 1A criterion 8 "screenshot smoke" layer is mapped but no task wires it into CI. | Wire the existing `tools/screenshots` into the 1A CI `web-e2e` job (1A T10). |
| T-changelog | MINOR | Foundations §3.5 asks for a protocol changelog + deprecation rules. | Add `CoteccApp/src/net/PROTOCOL_CHANGELOG.md` with the v1 entry when protocol.ts lands (P0 T10). |
| T-codec-property | MINOR | T7 codec tests are example-based, not property-based. | Optional: add a property test (decode∘encode == canonical) for `WireRoundResult`. |
| T-T10-tag | MINOR | P0 T10 header over-claims `RC2-API-001` (that behaviour is T12). | Drop `RC2-API-001` from the T10 header; keep it on T12. |

## How to re-review
Run the same three reviewer scopes against the updated plans; confirm each "Fixed
inline" row holds and that no new BLOCKER was introduced by the edits (notably the
restructured P0 T13, T14, and 1B T6).
