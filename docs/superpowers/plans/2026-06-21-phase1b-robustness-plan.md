# Phase 1B — Robustness & Fallbacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. **Tasks tagged 🚧 LAB GATE require physical devices and a human/strong agent — a weak-model worker stops there.**

**Goal:** make the 1A LAN MVP survive real-world conditions — flaky links, dropped
players, AP isolation, no-router setups — with clear recovery UX and a full test
program. **No new transports or trust model** (those are future, per parent §6).

**Non-Goals (Phase 1B):** no host migration (R2 deferred), no F3 trustless deal, no
WebRTC/BLE, no Tier-2 browser hosting.

**Depends on:** Phase 1A complete (all exit gates green, decision files committed).

**Architecture:** Builds on the 1A `GameSession` and Node harness. Reconnect/heartbeat/
pause-AI is session logic (Jest-testable in CI); diagnostics/hotspot/mDNS and the device
matrix are physical lab gates. The live AI-takeover countdown is driven by the
server-authoritative `SeatSummary.graceUntil` from Phase 0 — clients render it, never
compute the deadline locally.

**Spec:** `docs/superpowers/specs/2026-06-20-local-multiplayer-phase1b-robustness-design.md`.

---

## Task 1: Event-sourced log (F2) + reconnect resume

Implements 1B §2.1 (API-004, WS-002). **Weak-model executable** (session logic, Jest).

**Files:**
- Modify: `CoteccApp/src/net/session.ts` (append-only log keyed by `serverSeq`; `resume(seatToken, fromStateVersion)` → replay or `SeatSnapshot`; stale → `STALE_STATE`)
- Create: `CoteccApp/src/net/moveLog.ts` + test
- Modify: `CoteccApp/src/net/session.test.ts`

- [ ] **Step 1 (TDD):** `moveLog` appends `{serverSeq, event}`; `since(seq)` returns the
  tail. Tests first.
- [ ] **Step 2 (TDD):** `session.resume(seatToken, fromStateVersion)` returns a replay tail
  when in range, a full `SeatSnapshot` when too far behind, and rejects stale commands
  with `STALE_STATE`.
- [ ] **Step 3:** Run `npm test -- moveLog net/session` → PASS.
- [ ] **Step 4: Commit** `feat(net): event-sourced log + reconnect resume (Phase 1B T1, API-004)`.

---

## Task 2: Heartbeats & disconnect detection

Implements 1B §2.2 (WS-006). **Weak-model executable** (use a fake clock in tests).

**Files:**
- Create: `CoteccApp/src/net/heartbeat.ts` + test
- Modify: `CoteccApp/src/net/session.ts` (mark seat `grace` after M missed)

- [ ] **Step 1 (TDD, fake timers):** ping/pong every **N s** (default 5); after **M**
  missed (default 3) the seat flips to `connection: 'grace'`; handle browser
  visibility/resume; half-open detection. Constants live in `CoteccApp/src/utils/constants.ts`
  (`HEARTBEAT_INTERVAL_MS`, `HEARTBEAT_MISS_LIMIT`) so the spike can tune them.
- [ ] **Step 2:** Run `npm test -- heartbeat` → PASS.
- [ ] **Step 3: Commit** `feat(net): heartbeats + grace detection (Phase 1B T2, WS-006)`.

---

## Task 3: Pause-then-AI policy (D2) + seat-token expiry

Implements 1B §2.3 (PROD-006, GAME-006, RC2-UX-003, RC3-UX-001, RC2-SEC-003, SEC-003).
**Weak-model executable** (reuses `aiMoveToPlay`; Jest).

**Files:**
- Create: `CoteccApp/src/net/takeover.ts` + test
- Modify: `CoteccApp/src/net/session.ts` (controller flips, `graceUntil`, token rotation)

- [ ] **Step 1 (TDD):** on `grace→disconnected` the **table pauses**; after a
  host-configurable timeout (**default 30 s**, range **10–120 s** or "never→pause-only")
  the seat `controller` flips `remote→ai` (reusing `aiMoveToPlay` from
  `src/utils/aiPlayerLogic.ts`); the seat stays **owned** by the player.
- [ ] **Step 2 (TDD):** set `SeatSummary.graceUntil = now + timeout` (epoch ms,
  server-authoritative) so all clients render the **same** live countdown (RC3-UX-001).
  Assert it is only present when `connection==='grace'`.
- [ ] **Step 3 (TDD):** on valid resume (single active connection, host-confirmed reclaim)
  `controller` flips back at the **next turn boundary**; duplicate token / duplicate
  connection rejected with `BAD_SEAT_TOKEN`.
- [ ] **Step 4 (TDD, token rotation — pinned, SEC-003):** every successful reconnect
  issues a **new** resume token in `SeatAssigned` and **atomically invalidates** the
  previous one; later use of the old token → `BAD_SEAT_TOKEN`; only one token valid per
  seat at a time. Reclaim window default = AI timeout + grace margin (host-configurable);
  **all seat tokens expire at match end** regardless (RC2-SEC-003).
- [ ] **Step 5:** Run `npm test -- takeover net/session` → PASS.
- [ ] **Step 6: Commit** `feat(net): pause-then-AI + graceUntil + token rotation (Phase 1B T3, RC2-UX-003)`.

---

## Task 4: Reconnect/host-loss UX + command-state surfacing

Implements 1B §2.4 (UX-006, UX-007, FE-004, NET-013). **Weak-model executable** (UI;
Playwright assertions).

**Files:**
- Modify: `CoteccApp/src/screens/LobbyScreen.tsx` / game UI (disconnected badge,
  paused/countdown indicator from `graceUntil`, **AI-controlled** label, reclaim
  confirmation, duplicate-seat conflict copy)
- Add Playwright assertions in `CoteccApp/e2e/`

- [ ] **Step 1:** Render per-seat `connection`/`controller` states + a live countdown
  bound to `SeatSummary.graceUntil`. **Concrete render rule (do not invent):** display
  `Math.max(0, Math.ceil((graceUntil - Date.now()) / 1000))` seconds, refreshed by a
  `setInterval(…, 1000)` started when `connection === 'grace'` and cleared when the seat
  leaves `grace` (test the `clearInterval` on exit). "No local deadline math" means: use
  the server's `graceUntil` epoch as-is — do NOT compute/extend the deadline locally; you
  DO compute the displayed remaining seconds from it. `testID="seat-countdown-<seatId>"`,
  single line (`numberOfLines={1}`, `adjustsFontSizeToFit`), text + number (not color-only).
- [ ] **Step 2:** Host-loss terminal state (R2 deferred, D5): "Host disconnected — game
  cannot continue" with wait/return-home/start-new; browser clients on a dead host can't
  refresh → copy says rejoin via a new host's QR (NET-013).
- [ ] **Step 3:** Playwright: disconnect → countdown visible → AI-controlled label →
  reclaim flow. Run `npm run e2e` → PASS.
- [ ] **Step 4: Commit** `feat(net): reconnect/host-loss UX + countdown (Phase 1B T4, UX-006)`.

---

## Task 5: Local-only diagnostic ladder + failure taxonomy

Implements 1B §1.1, §1.2 (ARCH-008, NET-004, FE-005, WS-009, UX-005, QA-008).
**Weak-model executable** for the classifier + table; the iOS silent-failure inference is
verified in the lab.

**Files:**
- Create: `CoteccApp/src/net/diagnostics.ts` (classifier) + test
- Create: `CoteccApp/src/net/failureTaxonomy.ts` (signal → message/action/budget) + test

- [ ] **Step 1 (TDD):** `classifyConnectivity()` runs the ladder **without internet
  reachability**: page-load → `GET /healthz` → `ws` upgrade categorised
  (`timeout|refused|abnormal-close(1006)|permission-denied|ok`) → host-side "guest seen"
  → permission status → gateway/captive check. It runs **both at connect time and on any
  mid-session disconnect** (`grace`/`disconnected`) (RC2-NET-001).
- [ ] **Step 2 (TDD):** `failureTaxonomy` maps each signal to `{message, primary,
  secondary, budget, testId}`. Populate **exactly these 9 rows** (inlined from 1B §1.2 so
  this plan is self-contained):

  | signal (key) | message | primary / secondary | budget |
  |---|---|---|---|
  | `PAGE_LOAD_FAIL` | "Can't reach the table" | Rescan / switch to host hotspot | 5 s |
  | `WS_TIMEOUT` | "Connected to Wi-Fi but not the table" | Try host hotspot / manual IP | 5 s, 2 retries |
  | `WS_REFUSED` | "Host isn't ready" | Retry / rescan | 3 s |
  | `WS_ABNORMAL_1006` | "Lost connection to the host" | Auto-reconnect / leave | N×heartbeat (§2.2) |
  | `STALE_QR` | "This code expired" | Rescan new code | n/a |
  | `SEAT_TAKEN_OR_FULL` | "That seat's taken" / "Table is full" | Pick another / spectate | n/a |
  | `GAME_ALREADY_STARTED` | "Game already started" | Wait for rematch / leave | n/a |
  | `IOS_LOCAL_NET_DENIED` | "Allow local network to find tables" | Open Settings / use QR | n/a |
  | `WRONG_SUBNET_IP` | "That address isn't reachable" | Re-enter / rescan | 5 s |

  The test asserts every key maps to a non-empty message, a primary action, and a budget
  (or explicit `null`), and that each has a unique `testId`.
- [ ] **Step 3:** Run `npm test -- diagnostics failureTaxonomy` → PASS.
- [ ] **Step 4: Commit** `feat(net): diagnostic ladder + failure taxonomy (Phase 1B T5, NET-004)`.

---

## Task 5b: SSE+POST fallback transport (parity with WebSocket)

Implements Foundations §3.4 (WS-007, API-007) and the parent connectivity-design.md §7
"SSE+POST parity". **Resolves the round-1 mis-pointer (R3-2) — this is the task that
actually builds it.** WebSocket (1A) is primary; this is the fallback for
WS-upgrade/proxy failures **after** HTTP reachability is proven. It is the SAME protocol
(same `Envelope`/`serverSeq`/`clientSeq`), not a second one. **Weak-model executable**
(Node + the Phase 0 `transport.ts` contract + the 1A `nodeHost`/`GameSession`).

**Files:**
- Modify: `CoteccApp/harness/nodeHost.ts` (add the two HTTP routes)
- Create: `CoteccApp/src/net/sseClient.ts` (`ClientConnection` over EventSource + fetch POST) + test
- Modify: `CoteccApp/harness/conformance.shared.ts` (add SSE+POST rows so it runs against both transports)

- [ ] **Step 1 (host routes, TDD against nodeHost):** add `GET /session/:id/events?afterSeq=`
  — an SSE stream that replays the move log from `afterSeq` then streams new frames, each
  SSE event id = `serverSeq` so a reconnect resumes via the `Last-Event-ID` header; and
  `POST /session/:id/commands` — accepts one envelope, dedups on `clientMessageId`
  (returns the same ack for a re-sent identical command), routes through
  `seatForConn`/`submitMove` exactly like `/ws`. Assert: an SSE client receives the same
  `serverSeq`-ordered frames as a WS client for the same session; a duplicate
  `clientMessageId` POST returns the same ack and does not re-apply.
- [ ] **Step 2 (client, TDD):** `sseClient.ts` implements `ClientConnection` (Phase 0
  `transport.ts`) using `EventSource` for inbound + `fetch` POST for outbound; resumes
  with `Last-Event-ID`. Same envelope, same `clientSeq` rules.
- [ ] **Step 3 (parity):** extend `conformance.shared.ts` so the shared suite runs over
  BOTH the WS and SSE+POST transports against `nodeHost`; a divergence fails CI. This is
  what makes "the fallback is not a second protocol" enforceable.
- [ ] **Step 4:** Run `npm test -- nodeHost sseClient conformance` → PASS.
- [ ] **Step 5: Commit** `feat(net): SSE+POST fallback transport with WS parity (Phase 1B T5b, WS-007)`.

---

## Task 6: Address selection + hotspot/isolation fallback + mDNS

Split into a **pure, weak-model-executable Part A** and a **🚧 LAB GATE Part B** so the
codeable work is not blocked behind the device work.

### Task 6 Part A — Full address-selection algorithm (pure, NOT gated)

Implements 1B §1.4 (NET-014). Upgrades the minimal 1A `pickReachableAddress` to full
ranking. **Pure logic, fully TDD-able in Jest.**

**Files:** Modify `CoteccApp/src/net/addressSelect.ts` + `addressSelect.test.ts`.

- [ ] **A1 (TDD):** extend `pickReachableAddress` with full ranking: prefer the bound
  serving interface; then hotspot/AP interfaces; then private-LAN IPv4 (`10/8`,
  `172.16/12`, `192.168/16`) over link-local (`169.254/16`); de-prioritise VPN/`utun`/`tun`
  interfaces; include IPv6 only as `alternates` (IPv4 primary by default). Cover: Wi-Fi+
  hotspot, Wi-Fi+VPN, link-local-only, dual-stack. Run `npm test -- addressSelect` → PASS.
- [ ] **A2: Commit** `feat(net): full address-selection ranking (Phase 1B T6A, NET-014)`.

### Task 6 Part B — 🚧 LAB GATE: hotspot lifecycle + mDNS

Implements 1B §1.3, §1.5 (NET-001/002, EXPO-005, RC2-NET-002/003, NET-009).
**Physical-device work; a human/strong agent owns this** (a weak-model worker stops here).

**Files:**
- Create: `CoteccApp/src/net/hotspot.ts` (Android `LocalOnlyHotspot` lifecycle)
- Create: `CoteccApp/src/net/mdns.ts` (best-effort advertise/browse; opaque room id only)

- [ ] **B1 (LAB):** Android `LocalOnlyHotspot` (ephemeral creds → Wi-Fi QR, guided
  two-step join, handle unsupported-device/failure/stopped); anticipate the iOS
  "no internet — stay connected?" dialog with "Keep trying / Use without internet" copy
  (RC2-NET-002). iOS Personal Hotspot manual.
- [ ] **B2 (LAB):** mDNS best-effort across multicast-disabled APs, guest VLANs, iOS
  denied permission + `NSBonjourServices`, Android OEM behaviour, duplicate service names;
  advertise only opaque room id + protocol version + capabilities (SEC-009). QR/manual
  stays canonical.
- [ ] **B3 (LAB):** iOS Local Network silent-failure inference (advertise/browse
  started + zero results + no system prompt → infer denial → Settings deep-link)
  (RC2-NET-003).
- [ ] **B4: Commit code + record lab evidence** in
  `docs/superpowers/plans/decisions/2026-06-21-hotspot-mdns-lab.md`.

---

## Task 7: Security hardening verification

Implements 1B §3 (SEC-001..009). **Weak-model executable** for the server caps tests;
binding/port behaviour confirmed in the lab.

**Files:**
- Modify: `CoteccApp/harness/nodeHost.ts` (assert caps) + tests
- Create: `docs/superpowers/plans/decisions/2026-06-21-security-hardening-checklist.md`

- [ ] **Step 1 (TDD):** asset allowlist (no dir listing/debug), strict schemas, body/
  message size caps, connection caps, per-peer rate limits — each with a failing-then-
  passing test against the harness.
- [ ] **Step 2 (TDD):** token lifecycle under reconnect/AI (separate admission vs resume
  tokens; rotation; single active connection; host-confirmed reclaim) — confirm the
  Phase 1B T3 rotation invariants hold end-to-end.
- [ ] **Step 3 (LAB):** LAN-interface bind + random high port on device; QR credential
  rules (Android ephemeral creds only, stop/rotate after match, no reusable iOS hotspot
  password by default, expire room tokens on lobby close, warn before showing creds).
- [ ] **Step 4:** Restate in the checklist: F2 audit trail ≠ anti-host cheating (F3
  deferred, SEC-006). Run `npm test -- nodeHost` → PASS.
- [ ] **Step 5: Commit** `feat(net): security hardening + caps verification (Phase 1B T7, SEC-008)`.

---

## Task 8: Accessibility (testable, CI-gated)

Implements 1B §5 (UX-011). **Weak-model executable** (Playwright + axe).

**Files:**
- Add `CoteccApp/e2e/a11y.spec.ts`; add `@axe-core/playwright` devDep.

- [ ] **Step 1:** Manual join completes **without a camera** (keyboard-only path to a
  seated game).
- [ ] **Step 2:** Keyboard-complete browser join/lobby/play (no pointer events).
- [ ] **Step 3:** Screen-reader announcements (connecting / your-turn / disconnected /
  AI-controlled / reconnected) via ARIA live regions — assert role/`aria-live` presence.
- [ ] **Step 4:** Non-color-only status (text/icon, not just color) — axe audit in CI.
  Scalable text honoured; focus moves to the error on failure (assert).
- [ ] **Step 5:** Run `npm run e2e -- a11y` → PASS. **Commit**
  `test(net): CI-gated accessibility checks (Phase 1B T8, UX-011)`.

---

## Task 9: 🚧 LAB GATE — full QA matrix + falsifiable device lab

Implements 1B §4 (QA-002/003/004/006/008/009/010). **Physical evidence required.**

**Files:**
- Create: `docs/superpowers/plans/decisions/2026-06-21-device-lab-matrix.md`

- [ ] **Step 1:** Build the QA matrix (columns: phase, host platform, guest platform,
  browser/app role, transport, pairing path, network condition, expected result,
  automated/manual, release priority).
- [ ] **Step 2 (LAB, falsifiable):** fixed inventory — **Android host** (≥ API 33),
  **Chrome+Safari laptop** guests, **iOS app guest** (≥ iOS 16), **Android app guest**;
  networks = home router, client-isolated guest Wi-Fi, Android `LocalOnlyHotspot`,
  airplane-mode/no-internet LAN. Each cell records device/OS version, **physical vs
  emulated** (host + hotspot cells MUST be physical), pass/fail, and an artifact
  (recording or log). iOS host = dev-client cell, **informational** in alpha (D4).
  **The gate fails if any required physical cell is missing evidence** (RC2-QA-003).
- [ ] **Step 3:** Pairing tests (valid/malformed QR, expired token, wrong-subnet IP,
  manual success/failure, camera unavailable, iOS Local Network denial, Android
  permission denial) — each with expected recovery (QA-010).
- [ ] **Step 4: Commit the matrix + evidence index.**

---

## Task 10: Phase 1B exit-gate verification

Implements 1B §6.

- [ ] **Step 1 (CI):** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run e2e`
  (incl. a11y), `npm run embed:verify` — all PASS; coverage preserved.
- [ ] **Step 2:** Confirm: diagnostic ladder + taxonomy with measurable budgets (T5);
  R1 reconnect + pause-then-AI + heartbeats (T1–T3); reconnect/host-loss UX (T4);
  security hardening verified (T7); accessibility met (T8).
- [ ] **Step 3 (LAB):** hotspot/isolation validated (T6) and full device matrix evidence
  complete (T9) — no required physical cell missing.
- [ ] **Step 4 (release gates):** lint, tsc, Jest coverage, web export, Playwright,
  Android prebuild/build, **iOS prebuild/build**, native CI/manual artifact validation
  for networking/native PRs (QA-007).
- [ ] **Step 5:** Regression green: offline single-device play, AI turns, round-end
  timing, game-over sim, navigation, screenshot smoke (QA-009).

---

## Notes for reviewers
- CI-coverable tasks (T1–T5, T7, T8) are weak-model executable and gate every PR.
- LAB GATE tasks (T6, T9, plus device cells in T7/T10) require physical hardware and a
  human/strong agent; their definition of done is recorded evidence, not "looks right".
- The 30 s default / 10–120 s range AI-takeover timeout and the N=5s/M=3 heartbeat
  constants are the spec defaults — confirm/tune on-device during T6/T9 and update
  `src/utils/constants.ts` with the chosen values.
