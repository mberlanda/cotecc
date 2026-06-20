# Architect Re-Review (round 2) — Local Multiplayer v2
**Agent #:** 01 · **Role:** Architect · **Date:** 2026-06-20

## Verdict summary
Resolved: 7 · Partially: 2 · Not-addressed: 0 · Won't-fix(deferred): 1

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-01-ARCH-001 | RESOLVED | Foundations §1 (engine hardening) | Corrects the v1 factual error explicitly. Seeded PRNG (§1.1), typed `MoveResult` (§1.2), value-based `CardRef` (§1.3), `WireGameState` codec + hydrator (§1.4), round-trip property tests (§1.5). Master doc §2 / §10 also acknowledge the correction. |
| LMCD-RC-01-ARCH-002 | RESOLVED | Foundations §3 (wire protocol v1) | The blocking seam is now a full concrete contract: envelope schema (§3.1), complete message union with lifecycle, setup, play, state, and liveness messages (§3.2), session state machine (§3.3), `HostEndpoint`/`ClientConnection` capability interfaces (§3.4), SSE+POST parity (§3.4), backpressure (§3.4), `protocol.ts` + golden fixtures (§3.5). |
| LMCD-RC-01-ARCH-003 | RESOLVED | Foundations §2 (seat ownership & client state model) | Seat model with `Controller`, `SeatConnection`, `localSeatId` replacing `isHuman` (§2.1). Client-side state machine covering all connection phases (§2.2). GameScreen refactor onto `SeatView` + loopback session (§2.2). Regression via loopback (§2.3). |
| LMCD-RC-01-ARCH-004 | RESOLVED | Foundations §4 (SeatView redaction) | Exact allowlist schema for `SeatView` and `SeatSummary` (§4.1). Hard prohibitions with test oracle — snapshot tests per outbound message type, fuzz test for foreign-card leakage, `StateDelta` same allowlist (§4.2–4.3). `projectStateForSeat` is the sole host→client state producer. |
| LMCD-RC-01-ARCH-005 | WONT-FIX (deferred) | Master §6, Phase 1B §2.5 | Explicitly deferred as D5 with stated rationale: hidden-hand handoff conflicts with F1 privacy; needs trusted successor or crypto; Phase 1 host-loss ends match. Trigger for revisiting is stated (observed high host-drop rate). The original concern is acknowledged — the doc does not pretend the problem is solved. |
| LMCD-RC-01-ARCH-006 | RESOLVED | Phase 1A §1 (native host runtime & packaging) | A mandatory spike (§1.1) is defined as a gate for all of 1A, covering: LAN-interface binding, web-bundle serving, `/healthz`, WS upgrade, browser same-origin `ws://`, library selection with version/license, `expo prebuild --clean` reproducibility. Cleartext/permissions detailed in §2 (cluster F). Lifecycle (AppState/background) in §1.4. iOS validated on dev-client only, gated on distribution later (D4). |
| LMCD-RC-01-ARCH-007 | RESOLVED | Master §5 (security & trust posture), Foundations §3 (wire protocol v1), Phase 1B §3 (security hardening) | High-entropy admission vs per-seat resume tokens defined (Master §5, Foundations §3.1). Seat-bound connection — host derives seat from bound connection, ignores client-sent ids (Master §5, Foundations §3.2). De-dup by `(seatId, clientMessageId)` (Foundations §3.1). Duplicate-join, single active connection, host-confirmed reclaim (Phase 1B §2.3, §3). QR credential expiry and hotspot cred handling (Phase 1B §3). |
| LMCD-RC-01-ARCH-008 | RESOLVED | Master §4H, Phase 1B §1.1 (local-only diagnostic ladder) | Explicitly fixes the internet-reachability problem. The diagnostic ladder never uses internet reachability — steps are: page load, `/healthz`, WS-upgrade outcome categories, host-side "guest seen", local permission status, local gateway/captive check (Phase 1B §1.1). Master §4H summarises the same fix and cites both ARCH-008 and NET-004. |
| LMCD-RC-01-ARCH-009 | PARTIALLY | Foundations §2.1 (seat model), Phase 1A §3.6 (minimal reconnect), Phase 1B §2 (R1) | The seat model provides the structural foundation (`Controller` flip, reclaim at turn boundary, D2 policy). Minimal reconnect in 1A (§3.6) defines token persistence, snapshot reply, and host-loss terminal path. Full pause/AI/heartbeat policy with exact timeout constants is deferred to 1B (§2.2–2.4). Heartbeat constants are still TBD ("chosen in the spike; defaults proposed N=5s, M=3") — concrete values not yet committed. Rated PARTIALLY because constants and the AI-attribution/stale-command-rejection specifics are still open in 1B rather than pinned now. |
| LMCD-RC-01-ARCH-010 | RESOLVED | Foundations §3.4 (transport capability interfaces) | `HostEndpoint`/`ClientConnection` capability-typed interfaces defined. SSE+POST mapped explicitly to what it provides: `GET /events?afterSeq=` + `POST /commands` with same envelope/sequencing as WebSocket, not a separate protocol. BLE/WebRTC remain deferred transports that would implement the same interfaces. |

---

## New issues (v2)

### LMCD-RC2-01-ARCH-001 — Loopback transport is the only Phase 0 deliverable validating multi-seat redaction end-to-end
**Severity:** MAJOR
**Section:** Foundations §2.2, §3.5, §4; Phase 0 exit criteria §5

**Concern:** The Phase 0 exit criteria require the loopback transport to run "full frames end-to-end" and the `SeatView` oracle to hold for 2–6 seats, but `GameScreen` currently receives `GameState` directly and renders only the first `isHuman` hand. The loopback refactor (§2.2) requires `GameScreen` to be rebuilt on `SeatView` + a session interface before Phase 0 exits — this is a non-trivial UI refactor, not just adding a codec. If that refactor is deferred or only partially done, the Phase 0 loopback transport would be a fake adapter that bypasses redaction rather than proving it. The exit criteria do not explicitly list "GameScreen consumes only `SeatView`, verified via loopback" as a named deliverable, making it easy to declare Phase 0 green while the actual UI still reads full state.

**Recommendation:** Add an explicit Phase 0 exit criterion: "GameScreen (and all sub-components) consume only `SeatView`; no direct `GameState` import remains in any render path; confirmed via loopback session and a lint/type rule prohibiting `GameState` in presentation files." This also catches `StateDebugComponent` (currently imported in `GameScreen`) which the Foundations §4.2 prohibitions cover for network sessions but whose offline-debug path needs an explicit exception policy.

---

### LMCD-RC2-01-ARCH-002 — `dealSeed` distribution to clients is undefined
**Severity:** MAJOR
**Section:** Foundations §1.1 (canonical seeded deal), §3.2 (message union)

**Concern:** The seeded deal says "the authoritative host generates `dealSeed` per round; the dealt state is then a pure function of `(playerIds, initialPlayerId, dealSeed)`." But the message union in §3.2 says `DealRound` carries "either the `dealSeed` *to the host only*/per-seat dealt hands to clients". This means clients receive their dealt hand directly — which is correct for confidentiality — but the design does not specify: (a) whether clients can independently re-derive/verify anything from `dealSeed`, (b) who receives `dealSeed` in the `DealRound` message (the parenthetical "to the host only" is ambiguous — the host generated it, so sending it back to itself is a no-op), and (c) how reconnecting clients get their hand (a `SeatSnapshot` containing `localHand` suffices for play, but if replay is ever used, the seed needs to be handled carefully). The parenthetical syntax in §3.2 reads as an unresolved design choice rather than a decision.

**Recommendation:** Make the `DealRound` message explicit: the host sends each client only their own dealt `localHand` (not the seed); `dealSeed` is a host-internal value. Document this as the Phase 1 choice and note that F3 (commit-reveal) is the future path for client-verifiable dealing. Remove the ambiguous parenthetical.

---

### LMCD-RC2-01-ARCH-003 — Multi-interface address selection is a 1B item but is needed in 1A
**Severity:** MINOR
**Section:** Phase 1A §1.1 (spike), Phase 1B §1.4 (address selection)

**Concern:** Address selection (choosing a guest-routable address across Wi-Fi/hotspot/VPN/multi-interface) is listed as a Phase 1B deliverable (§1.4, NET-014). However, the Phase 1A spike (§1.1) must already bind "one HTTP server to a LAN-reachable interface" and encode a reachable IP in the QR — which is exactly the address-selection problem. Putting the resolved specification in 1B while requiring it to work in 1A creates a gap: 1A developers will solve it ad hoc (e.g., pick the first non-loopback IPv4), and 1B will then need to undo or re-specify that choice. On Android `LocalOnlyHotspot` the hotspot interface address is obtained via the OS API; on standard Wi-Fi the correct interface is not guaranteed. The 1A spike could silently pass on a simple home router while failing on multi-homed or VPN-active devices.

**Recommendation:** Move the address-selection contract (what heuristic to use, what to fall back to, how to populate QR alternates) to a 1A subsection, even if the edge-case validation lab work stays in 1B. At minimum, the 1A spike acceptance criteria should include a test on a multi-interface device (e.g., Wi-Fi + VPN active) to surface the problem before it is locked in.

---

## Bottom line

All seven originally-high concerns and the original blocker (ARCH-002) are now resolved or formally deferred (ARCH-005) with documented rationale. No round-1 comments were ignored.

**Remaining from round-1:** ARCH-009 is PARTIALLY resolved — the structural model is solid but heartbeat constants and the stale-command/AI-attribution details are explicitly open for 1B, which is acceptable as long as 1B gates ship before R1 reconnect goes live.

**New blockers/majors from round 2:** LMCD-RC2-01-ARCH-001 (MAJOR — loopback redaction gap risks a false Phase 0 green), LMCD-RC2-01-ARCH-002 (MAJOR — `dealSeed` distribution ambiguity). LMCD-RC2-01-ARCH-003 is MINOR.

The design is now substantially implementation-ready at the Foundations and Phase 1A levels. The two new MAJOR issues are specification gaps that should be closed in the Foundations doc before Phase 0 implementation begins; neither requires a structural redesign.
