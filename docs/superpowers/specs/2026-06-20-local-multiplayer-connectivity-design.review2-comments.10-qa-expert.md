# QA Expert Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 10 · **Role:** QA · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 7 |
| PARTIALLY | 2 |
| NOT-ADDRESSED | 0 |
| WONT-FIX / Deferred by design | 1 |

New issues raised: 5 (1 BLOCKER, 2 MAJOR, 2 MEDIUM)

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-10-QA-001 | RESOLVED | 1A §4 (acceptance criteria), 1A §5 (exit criteria), 1B §6 (exit criteria) | 1A §4 gives eight numbered Given/When/Then bullets covering platform matrix, pairing, seat count, legal/illegal moves, privacy, host loss, and offline regression. 1B §6 lists the full post-robustness exit bar. The blocking concern is met. |
| LMCD-RC-10-QA-002 | PARTIALLY | 1B §4 ("QA test matrix" bullet) | The matrix columns are enumerated correctly in prose (phase, host platform, guest platform, browser/app role, transport, pairing path, network condition, expected result, automated/manual, release priority). However, no populated table row exists yet — the spec commits to the shape but leaves the cell values TBD. Sufficient for a design doc; must be filled before implementation starts, or this becomes a tracking blocker at that gate. |
| LMCD-RC-10-QA-003 | RESOLVED | 1A §4.1 (QA subset — automation plan), 1B §4 (automation plan) | 1A §4.1 lists Jest targets (session/loopback, redaction, card rehydration, illegal-command rejection, reconnect-token handling) and Playwright flows (join route, lobby, manual join, joined-game render against the host-served bundle). 1B §4 extends with R1 reconnect-after-AI-move, pause/AI, and error-state Playwright cases. |
| LMCD-RC-10-QA-004 | RESOLVED | 1B §4 ("Device & network lab" bullet) | Minimum device set matches the request exactly: Android host, iOS host, Android app guest, iOS app guest, Chrome/Safari browser guests, two laptop browsers; network scenarios include home router, client-isolated guest Wi-Fi, Android LocalOnlyHotspot, iOS Personal Hotspot, airplane-mode/no-internet LAN; permission-prompt verification listed. |
| LMCD-RC-10-QA-005 | RESOLVED | Foundations §4 (SeatView redaction), §4.2 (hard prohibitions, test-gated), §4.3 (acceptance) | §4.2 explicitly lists prohibited fields (GameState, currentRound.players[].cards from other seats, cardsBySuit, pastRounds raw hands, StateDebug output) across transport payloads, persisted logs, debug UI, and reconnect snapshots. §4.3 mandates snapshot tests per message type and a fuzz test over random states. The test oracle is concrete. |
| LMCD-RC-10-QA-006 | PARTIALLY | 1B §2.2 (heartbeats), 1B §2.3 (pause-then-AI policy), master §2 D2 | Heartbeat constants are proposed (N=5 s ping, M=3 missed → grace) but explicitly marked "tune on-device" with final values deferred to spike. The pause-then-AI policy covers controller flip, reclaim at next turn boundary, duplicate-token rejection, and single active connection. Missing: explicit grace period duration before AI flip; whether game pauses before or only after the grace window; deterministic restoration spec for the returning player's SeatView diff. These are design gaps still open for 1B, though the high-level behaviour is now committed. |
| LMCD-RC-10-QA-007 | RESOLVED | 1A §1.5 (build/CI), 1A §4.1 (release gates), 1B §4 (release gates) | 1A §1.5 mandates path-triggered native build checks for networking/native/config/plugin changes plus expo export before native builds and packaged-asset hash verification. 1A §4.1 lists the 1A gates (lint, tsc, Jest coverage, web export, Playwright, Android prebuild/build; iOS informational in alpha). 1B §4 adds iOS prebuild/build as a hard gate and requires native CI/manual artifact validation for PRs touching networking/native. |
| LMCD-RC-10-QA-008 | RESOLVED | 1B §1.2 (failure taxonomy), 1B §1.1 (diagnostic ladder) | §1.2 explicitly maps each signal to user-facing message + primary/secondary action + measurable timeout/retry budget + test case. §1.1 categorises WS upgrade outcomes as timeout / refused / abnormal-close(1006) / permission-denied / ok. The combination gives QA distinguishable failure classes and expected UI states. |
| LMCD-RC-10-QA-009 | RESOLVED | Foundations §2.3 (acceptance D), Foundations §5 exit criteria item 1, 1B §4 (regression checklist) | Foundations §2.3 explicitly calls out the regression set: offline 2–6 player games, AI turns, round-end timing, game-over simulation, and navigation through the loopback session. §5.1 requires existing Jest suites green and coverage thresholds preserved. 1B §4 lists the full regression checklist (plus screenshot smoke) as a gate before any 1B transport ships. |
| LMCD-RC-10-QA-010 | RESOLVED | 1B §4 (pairing tests bullet) | §4 lists all requested pairing acceptance cases: valid QR join, malformed QR, expired token, wrong-subnet IP, manual success/failure, camera unavailable, iOS Local Network denial, Android permission denial — each with expected recovery. |

---

## New issues (v2)

### LMCD-RC2-10-QA-001

**Severity:** BLOCKER
**Section:** 1A §4 (acceptance criteria) / 1A §4.1 (QA subset)
**Concern: Playwright automation targets the host-served bundle, but no test-environment provisioning spec exists for that setup.**
1A §4.1 requires Playwright flows against the "host-served bundle," but nowhere in the design is there a specification for how that environment is stood up in CI: no loopback-server harness, no mention of how the native HTTP+WS host is mocked or started headlessly, no test double for the embedded server. The existing Playwright tooling (tools/screenshots) works against `npm run web` on port 8090 — a fundamentally different serving path from the embedded native server. Without a CI-runnable host harness, the Playwright acceptance gates in §4.1 cannot execute in automation. This makes the "automated" claim for join-lobby-game Playwright coverage unverifiable and the 1A release gate incomplete.
**Recommendation:** Add a §4.1 sub-item specifying a loopback host harness: a Node.js script or Jest global-setup that starts the same HTTP+WS server (extracted as a pure-Node module from the native module) on a local port, seeds it with a fixed session, and tears it down post-suite. Playwright then targets `http://localhost:<port>/join?...`. The native-embedding config-plugin path is separate. This harness must be reachable from `npm test` / CI without a physical device.

---

### LMCD-RC2-10-QA-002

**Severity:** MAJOR
**Section:** 1A §4 item 3 (pairing acceptance) / Foundations §3.3 (QR expiry)
**Concern: QR expiry and token rotation during active pairing are not defined with measurable bounds for QA.**
1A §4 item 3 states "browser guest joins by scanning the QR within a target time" but does not state what that target time is. Foundations §3.3 mentions "QR has an expiry/refresh" but gives no duration. 1B §3 mentions rotating QR credentials after match end, but not expiry during lobby wait. QA cannot write a test for expired-QR recovery (which is a 1B §4 pairing test) without knowing: (a) the QR TTL in the lobby phase, (b) whether the QR auto-refreshes with a new token while the lobby is open, (c) whether the old token is immediately invalidated or has a grace window, and (d) what the guest UI shows if a scan hits an expired token mid-join.
**Recommendation:** Add a table in 1A §3.3 or 1B §3 specifying: lobby QR TTL (e.g., 10 min), auto-refresh cadence, token invalidation policy on refresh, and the exact `JoinRejected` error code and user-facing copy for an expired-but-otherwise-valid-looking room token. Tie this to a specific test case in 1B §4 pairing tests.

---

### LMCD-RC2-10-QA-003

**Severity:** MAJOR
**Section:** 1B §4 (QA test matrix) / 1A §4 item 2 (platform matrix)
**Concern: The QA matrix column "automated/manual" has no traceability to a physical device inventory — it is unverifiable whether the lab commitments can be met.**
1B §4 lists the device and network lab requirements but does not specify: (a) who owns these devices, (b) whether they exist today, (c) which lab scenarios are covered by emulators vs real hardware, (d) what minimum Android API level and iOS version constitute the supported floor, or (e) how lab runs are recorded (screenshot evidence, logs, CI artifact). Without this, "device & network lab" is an intent statement, not a testable gate. The 1B exit criteria (§6) says "validated in the lab" but gives no evidence standard.
**Recommendation:** Add a one-paragraph lab inventory note to 1B §4 or §6 naming: minimum Android API (e.g., API 30), minimum iOS version (e.g., iOS 16), which scenarios require physical hardware vs emulators, the artifact standard for a manual lab pass (e.g., screen recording + logcat excerpt committed to a test-evidence folder), and a named responsible party or CI matrix entry for each hardware scenario. This converts "validated" into a falsifiable claim.

---

### LMCD-RC2-10-QA-004

**Severity:** MEDIUM
**Section:** Foundations §4.2 (hard prohibitions)
**Concern: The redaction test oracle covers outbound message serialization but does not address in-memory client state after hydration.**
Foundations §4.2 prohibits foreign cards in "transport payloads, persisted logs, debug UI, and reconnect snapshots" and mandates snapshot tests per message type. However, it does not require asserting that the client-side in-memory `SeatView` object (after `decode`) also contains no foreign cards — meaning a bug where `decode` re-expands a field from an index or a shared reference would pass the wire-payload snapshot test but still expose another seat's hand to the rendering layer or debug tools. The `StateDebug` component test (`src/components/StateDebug.test.tsx`) exists but its scope for the networked path is undefined.
**Recommendation:** Extend Foundations §4.3 acceptance to include: after calling `decode(encodedSeatView)`, the resulting in-memory object for seat X must contain no `Card` instances belonging to other seats, verified by a post-hydration property check. Also specify that the `StateDebug` component must be disabled (not just hidden) in any session where `controller !== 'local'`.

---

### LMCD-RC2-10-QA-005

**Severity:** MEDIUM
**Section:** 1A §5 (exit criteria) / 1B §6 (exit criteria)
**Concern: Exit criteria have no sign-off or evidence standard — they read as checklists, not gates.**
Both 1A §5 and 1B §6 list criteria in prose but specify no: (a) who signs off that each criterion is met, (b) what constitutes passing evidence (CI green badge, test report artifact, manual test log, screenshot), (c) whether all criteria must be met simultaneously or whether partial passes gate partial merges, or (d) what happens to open defects — are they blocking, or tracked separately. Without this, "exit criteria pass" is ambiguous and cannot be audited after the fact.
**Recommendation:** Append a short evidence table to 1A §5 and 1B §6 with columns: criterion ref, evidence type (CI artifact / Jest report / Playwright HTML report / manual test log / screenshot), minimum pass bar, and gate category (blocking / informational). This aligns with the release-gate spirit already present in §4.1/§4 but makes it auditable at sign-off time.

---

## Bottom line

Round 1's ten comments are substantially addressed in v2. The blocking QA-001 (phase outcomes not pass/fail) is RESOLVED: 1A §4 provides concrete Given/When/Then acceptance criteria across all dimensions requested, and 1B §4/§6 deliver the full QA matrix structure, device lab, automation plan, release gates, and regression checklist.

Two comments remain PARTIALLY addressed (QA-002: matrix has column names but no rows; QA-006: heartbeat/grace/AI-flip timing still under-specified for 1B). Neither re-blocks the design, but QA-002 must produce a populated table before implementation begins and QA-006 must resolve the grace-period / SeatView-diff gaps before 1B implementation.

The single new BLOCKER (LMCD-RC2-10-QA-001) is a test-infrastructure gap: Playwright gates in 1A claim to run against the host-served bundle but no CI-runnable harness for that server exists, making the automation commitment unverifiable without a physical device. This must be resolved before the 1A automation suite can be considered a real release gate.
