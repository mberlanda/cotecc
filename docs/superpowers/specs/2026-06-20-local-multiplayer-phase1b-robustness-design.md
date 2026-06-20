# Local Multiplayer — Phase 1B: Robustness & fallbacks

**Date:** 2026-06-20 · **Phase:** 1B · **Parent:** `…connectivity-design.md` (v2)
**Depends on:** Phase 1A. **Resolves:** G (network diagnostics/caveats),
I-R1 (reconnect + pause/AI), H (security hardening), K-errors (failure/reconnect/
host-loss UX), J-1B (full QA/lab/automation/gates).

**Goal:** make the 1A LAN MVP survive real-world conditions — flaky links, dropped
players, AP isolation, no-router setups — with clear recovery UX and a full test
program. No new transports or trust model (those are future, per parent §6).

---

## 1. Network diagnostics & caveats (cluster G)

### 1.1 Local-only diagnostic ladder *(ARCH-008, NET-004, FE-005, WS-009)*
Replace coarse "isolation" inference with steps that **never** use internet
reachability (offline LANs are valid):
1. Browser: **page load** of `http://<host-ip>:<port>` succeeds? (If not, the React
   app never runs — show fallback on the **host's** QR screen, not in the guest app.)
   *(FE-005)*
2. `GET /healthz` reachable?
3. `ws://…/ws` upgrade — categorise outcome: `timeout | refused | abnormal-close
   (1006) | permission-denied | ok`.
4. Host-side **"guest seen"** telemetry to disambiguate one-way reachability.
5. Local-network **permission status** (where queryable).
6. Gateway/captive-portal check (local only).

### 1.2 Failure taxonomy → recovery *(WS-009, QA-008, UX-005)*
A table mapping each signal (handshake timeout, connection refused, abnormal close,
repeated heartbeat loss, HTTP bundle load failure, wrong-IP/interface, host
suspended, seat full, game already started, permission denied) → user-facing
message + primary/secondary action + **measurable timeout/retry budget** + test
case. *(UX-005, QA-008)*

### 1.3 Hotspot / isolation fallback *(NET-001, NET-002, EXPO-005)*
On detected isolation/unreachability: offer **host hotspot** — Android
`LocalOnlyHotspot` (ephemeral creds → Wi-Fi QR, **guided two-step** join, handle
unsupported-device/failure-code/hotspot-stopped); iOS Personal Hotspot is manual.
Validate: Android `LocalOnlyHotspot` host with Android/iOS/laptop clients; iOS
Personal Hotspot host; screen-lock/background; no-cellular/no-internet; IP
assignment; client auto-disconnect on "no internet" roaming. *(NET-002)*

### 1.4 Address selection *(NET-014)*
Host chooses a guest-routable address across Wi-Fi/hotspot/VPN/multi-interface and
IPv4 vs dual-stack/IPv6; the QR encodes a reachable candidate (offer alternates if
several).

### 1.5 mDNS auto-discovery (best-effort) *(NET-009, SEC-009)*
Native-app convenience to list nearby tables; **QR/manual stays canonical.**
Validate multicast-disabled APs, guest VLANs, iOS denied permission +
`NSBonjourServices`, Android OEM behaviour, duplicate service names. Advertise only
an **opaque** room id + protocol version + capabilities — never names/state.

### 1.6 Doc caveats already folded into parent §4 (NET-005/006/007/008/010/011,
WS-009): subnet vs reachability, transport validation, WebRTC/STUN→TURN, SSE scope,
short-code, BLE constraints.

---

## 2. Resilience R1 — reconnect + pause/AI (cluster I) — per D2

### 2.1 Event-sourced log (F2) *(API-004, WS-002)*
Host keeps an append-only log keyed by `serverSeq`; reconnecting clients get a
`SeatSnapshot` (or replay) and resume from `stateVersion`; stale commands rejected
with `STALE_STATE`.

### 2.2 Heartbeats & disconnect detection *(WS-006)*
Ping/pong every **N s**; mark a seat `grace` after **M** missed; handle browser
visibility/resume; half-open detection. Constants chosen in the spike; defaults
proposed N=5s, M=3 (tune on-device).

### 2.3 Pause-then-AI policy (D2) *(PROD-006, GAME-006, ARCH-009)*
On `grace→disconnected`: **table pauses**; after a **host-configurable timeout**,
the seat's `controller` flips `remote→ai` (reusing `aiMoveToPlay`); the seat stays
owned by the player. On return (valid resume token, single active connection,
host-confirmed reclaim) `controller` flips back at the **next turn boundary**.
Duplicate-token/duplicate-connection rejected. *(SEC-003)*

### 2.4 Reconnect & host-loss UX *(UX-006, UX-007, FE-004)*
Player-visible states: disconnected badge on a seat, paused/countdown indicator,
**AI-controlled** label, reclaim confirmation, duplicate-seat conflict copy. Host
loss (R2 deferred, D5): terminal "Host disconnected — game cannot continue" with
wait/return-home/start-new; **browser clients** served by the dead host can't
refresh — copy says rejoin via a new host's QR. *(NET-013)*

### 2.5 R2 host migration — explicitly out of scope
Deferred (parent §6, D5): mirror only the **public** log; hidden-hand handoff needs
a trusted successor or crypto. *(ARCH-005, GAME-007, SEC-005)*

---

## 3. Security hardening (cluster H)

Builds on the 1A baseline (parent §5). *(SEC-001..009)*
- Confirm seat→connection binding and token lifecycle under reconnect/AI flows
  (separate admission vs resume tokens, rotation, single active connection,
  host-confirmed reclaim). *(SEC-002, SEC-003)*
- Embedded-server abuse resistance verified: LAN-interface bind, random port, asset
  allowlist, no dir listing/debug, strict schemas, body/message size caps,
  connection caps, per-peer rate limits. *(SEC-008)*
- QR credential rules: Android ephemeral hotspot creds only, stop/rotate after the
  match, don't encode reusable iOS hotspot passwords by default, expire room tokens
  on lobby close, warn before showing network credentials. *(SEC-007)*
- mDNS metadata minimisation (§1.5). *(SEC-009)*
- Restate: F2 audit trail ≠ anti-host cheating; that's F3 (deferred). *(SEC-006)*

---

## 4. Full QA program (cluster J, 1B)

*(QA-002, QA-003, QA-004, QA-006, QA-008, QA-009, QA-010)*
- **QA test matrix:** columns = phase, host platform, guest platform, browser/app
  role, transport, pairing path, network condition, expected result, automated/
  manual, release priority.
- **Device & network lab:** Android host, iOS host, Android app guest, iOS app
  guest, Chrome/Safari browser guests, two laptop browsers; home router,
  client-isolated guest Wi-Fi, Android `LocalOnlyHotspot`, iOS Personal Hotspot,
  airplane-mode/no-internet LAN; permission-prompt verification.
- **Automation plan:** Jest (session, redaction, rehydration, illegal-command
  rejection, reconnect tokens, transport mocks, **R1 reconnect-after-one-AI-move**,
  pause/AI default); Playwright (lobby, QR/manual join, joined-game render, error
  states). *(QA-006)*
- **Pairing tests:** valid/malformed QR, expired token, wrong-subnet IP, manual
  success/failure, camera unavailable, iOS Local Network denial, Android permission
  denial — each with expected recovery. *(QA-010)*
- **Release gates:** lint, tsc, Jest coverage, web export, Playwright, Android
  prebuild/build, **iOS prebuild/build**, native CI/manual artifact validation for
  PRs touching networking/native. *(QA-007)*
- **Regression:** offline single-device play, AI turns, round-end timing, game-over
  sim, navigation, screenshot smoke — green before any 1B transport ships. *(QA-009)*

---

## 5. Accessibility (cluster K) *(UX-011)*
Manual join without a camera; keyboard-complete browser join; screen-reader
announcements for state changes (connecting/your-turn/disconnected/AI-controlled);
non-color-only status; scalable text; focus management on errors.

## 6. Phase 1B exit criteria
Diagnostic ladder + failure taxonomy implemented with measurable budgets; hotspot/
isolation fallback validated in the lab; R1 reconnect + pause-then-AI working with
heartbeats; security hardening verified; full QA matrix/lab/automation/gates in
place; accessibility criteria met.

## 7. Traceability
Resolves: ARCH-005(defer note), ARCH-008; NET-001, NET-002, NET-004, NET-008,
NET-009, NET-011(caveat), NET-013, NET-014; EXPO-002(lifecycle in 1A, reconnect
here); WS-002(reconnect), WS-006, WS-009; SEC-001, SEC-003, SEC-005, SEC-006,
SEC-007, SEC-008, SEC-009; PROD-006; FE-004, FE-005; UX-005, UX-006, UX-007,
UX-011; GAME-006(AI policy), GAME-007(defer); QA-002, QA-003, QA-004, QA-006,
QA-008, QA-009, QA-010.
