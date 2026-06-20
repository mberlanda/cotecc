# Review Comments: 10 qa-expert

## Reviewer Scope
Read-only QA strategy review of the local multiplayer connectivity design, focused on testability, acceptance criteria, automation, device/network validation, regression risk, and release gates.

## Overall Verdict
The design is not QA-ready for implementation planning because it defines architecture choices but not measurable acceptance criteria, test matrices, lab coverage, or release gates for the phased rollout.

## Comments
- `Comment ID:` `LMCD-RC-10-QA-001`
  `Severity:` blocking
  `Section:` `## 13. Recommended phased roadmap (one pick per block)`
  `Issue:` Phase outcomes are narrative rather than pass/fail acceptance criteria.
  `Rationale:` Statements like `"two laptops + two Androids" works offline` do not define required seat counts, host platforms, join paths, game completion, failure handling, or observable success conditions.
  `Suggested Change:` Add a `Phase Acceptance Criteria` subsection with Given/When/Then bullets for Phase 0 and Phase 1, including native host, browser join, 2-6 seats, no-internet LAN/hotspot, QR/manual join, legal/illegal move handling, redacted state, disconnect/reconnect or AI takeover, and full match completion.

- `Comment ID:` `LMCD-RC-10-QA-002`
  `Severity:` high
  `Section:` `## 11. Cross-platform capability matrix (the constraint that drives everything)`
  `Issue:` The capability matrix is architectural, not a QA test matrix.
  `Rationale:` It does not map host role, guest role, transport, pairing method, network condition, automation level, and expected result.
  `Suggested Change:` Add a `QA Test Matrix` table with columns: phase, host platform, guest platform, browser/app role, transport, pairing path, network condition, expected result, automated/manual, and release priority.

- `Comment ID:` `LMCD-RC-10-QA-003`
  `Severity:` high
  `Section:` `## 13. Recommended phased roadmap (one pick per block)`
  `Issue:` The automation strategy is missing despite existing Jest coverage thresholds and Playwright smoke tooling.
  `Rationale:` The repo already has Jest coverage gates, component/engine tests, and Playwright web render tooling, but the design does not say what new tests must be added for `GameSession`, `SessionTransport`, redaction, message schemas, or browser join.
  `Suggested Change:` Add an `Automation Plan` subsection requiring unit tests for loopback/session behavior, redacted projections, card rehydration, illegal command rejection, reconnect tokens, and transport mocks, plus Playwright flows for lobby, QR/manual join, and joined-game rendering.

- `Comment ID:` `LMCD-RC-10-QA-004`
  `Severity:` high
  `Section:` `## 14. Open questions / things to validate before Phase 1`
  `Issue:` The real-device and network lab requirements are underspecified.
  `Rationale:` Local multiplayer risk is dominated by device OS behavior, permissions, AP isolation, hotspots, and browser compatibility, none of which can be proven by unit tests alone.
  `Suggested Change:` Add a `Device and Network Lab` subsection listing minimum devices and scenarios: Android host, iOS host, Android app guest, iOS app guest, Chrome/Safari browser guests, two laptop browsers, home router, client-isolated guest Wi-Fi, Android LocalOnlyHotspot, iOS Personal Hotspot, airplane-mode/no-internet LAN, and permission prompt verification.

- `Comment ID:` `LMCD-RC-10-QA-005`
  `Severity:` high
  `Section:` `### F1 — Host-authoritative, **redacted per-seat views** (don't trust the network/peer memory)`
  `Issue:` Redaction lacks a concrete test oracle.
  `Rationale:` The highest-risk privacy regression is leaking another player’s hand in serialized messages, logs, debug views, client state, or reconnect snapshots.
  `Suggested Change:` Define redaction acceptance criteria: each client receives only its own hand plus public state; no other hands appear in transport payloads, persisted logs, debug UI, reconnect snapshots, or browser memory exposed to the renderer; add snapshot-style tests for every outbound message type.

- `Comment ID:` `LMCD-RC-10-QA-006`
  `Severity:` medium
  `Section:` `## 9. Decision block G — Resilience (incremental)`
  `Issue:` Reconnection and AI takeover behavior is not testable as written.
  `Rationale:` The design does not specify timeout values, stable token lifetime, duplicate reconnect handling, whether the game pauses or auto-plays by default, or what state a returning player must see.
  `Suggested Change:` Add explicit R1 criteria covering heartbeat interval, disconnect timeout, pause-vs-AI default, duplicate token rejection, app background/foreground recovery, reconnect after one AI move, and deterministic restoration of the redacted seat view.

- `Comment ID:` `LMCD-RC-10-QA-007`
  `Severity:` high
  `Section:` `## 12. Platform implementation realities (what each choice costs)`
  `Issue:` Release quality gates do not account for native module risk.
  `Rationale:` The recommended Tier 1 path requires leaving Expo Go and adding native socket/server code, but the design does not require Android/iOS prebuild/build validation for networking changes.
  `Suggested Change:` Add a `Release Gates` subsection requiring lint, TypeScript check, Jest coverage thresholds, web export, Playwright web render, Android prebuild/build, iOS prebuild/build, and mandatory native CI or manual artifact validation for PRs touching networking/native modules.

- `Comment ID:` `LMCD-RC-10-QA-008`
  `Severity:` medium
  `Section:` `## 10. Decision block H — Captive / isolated / hostile networks`
  `Issue:` Network failure detection has no measurable thresholds or expected UI states.
  `Rationale:` QA cannot validate “infer isolation” or “surface a clear message” without timeout budgets, retry counts, and distinguishable error states.
  `Suggested Change:` Define timeout/retry criteria for QR load, WebSocket handshake, heartbeat loss, gateway reachability, hotspot fallback prompt, and manual-code fallback, including expected user-facing error text for each failure class.

- `Comment ID:` `LMCD-RC-10-QA-009`
  `Severity:` medium
  `Section:` `**Phase 0 — Session abstraction + loopback (no networking).**`
  `Issue:` Regression protection for existing single-device offline play is too vague.
  `Rationale:` Refactoring `GameScreen` through a session layer could break current guest-only play, AI turns, round end timing, player counts, debug state, language/search params, or web render behavior.
  `Suggested Change:` Add a Phase 0 regression checklist requiring existing Jest tests to remain green, coverage thresholds preserved, single-device games for 2-6 players, AI turn progression, game-over simulation, auth/home/game navigation, and screenshot/render smoke coverage before any network transport ships.

- `Comment ID:` `LMCD-RC-10-QA-010`
  `Severity:` medium
  `Section:` `## 7. Decision block E — Discovery & pairing UX`
  `Issue:` Pairing UX test coverage is not defined.
  `Rationale:` QR, manual IP/code entry, camera-unavailable fallback, invalid/expired room tokens, and permission-denied paths are likely user-facing failure points.
  `Suggested Change:` Add pairing acceptance tests for valid QR join, malformed QR, expired token, wrong subnet IP, manual join success/failure, camera unavailable, iOS Local Network denial, and Android permission denial, with expected recovery actions.

## Consolidation Notes
Likely overlap with security reviewers on redacted state and trust boundaries, platform reviewers on native build and permission risks, and DevOps/release reviewers on CI gates. QA-specific consolidation should keep the measurable acceptance criteria, matrix, lab plan, and release gates in the design doc rather than only in later implementation plans.
