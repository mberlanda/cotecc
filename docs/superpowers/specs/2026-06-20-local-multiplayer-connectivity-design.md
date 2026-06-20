# Local Multiplayer Connectivity — Design (v2: overview & decision record)

**Date:** 2026-06-20 · **Revision:** v2 (supersedes v1)
**Status:** Design — decision record + index to per-phase specs
**Companion docs:**
- Foundations (Phase 0 contracts): `2026-06-20-local-multiplayer-foundations-design.md`
- Phase 1A LAN MVP: `2026-06-20-local-multiplayer-phase1a-lan-mvp-design.md`
- Phase 1B robustness: `2026-06-20-local-multiplayer-phase1b-robustness-design.md`
- Review consolidation & v2 plan: `…connectivity-design.consolidation-and-v2-plan.md`
- Reviews: `…connectivity-design.review-comments.01..12-*.md`

> **What changed from v1.** v1 was a broad options catalogue. A 12-agent review
> (109 comments) found it overstated how network-ready the engine is and never
> specified the actual contracts. v2 keeps the option analysis here as a decision
> record, **corrects the factual errors**, commits to a security/trust posture and
> a phase split, and moves all implementable detail into the per-phase specs above.
> The v1→v2 corrections and the comment IDs each section resolves are listed in §10.

## 1. Purpose & constraints

Let multiple devices on a local network play one shared Cotecc table — phones,
tablets, laptops — **cross-platform** (Android + iOS + browser), with **no
internet** and **no operator-run infrastructure** ("zero-infra"). One table at a
time, ≤ 6 seats.

**Why this game is easy to network:** it is turn-based and latency-tolerant. A move
is `{ seat, card }` (tens of bytes); a full table state is a few KB; only one human
acts at a time. **Bandwidth/latency are never the deciding factor** — the design is
dominated by *discovery*, *cross-platform reach*, and *zero-infra*. We need no
lockstep or rollback netcode.

## 2. Committed decisions (this revision)

| # | Decision | Choice | Rationale / consequence |
|---|---|---|---|
| D1 | v2 doc structure | Master + 3 sub-specs | Matches the dependency layers (§7). |
| D2 | Dropped-seat default | **Pause, then optional AI** after a host-set timeout; reclaim at next turn boundary | Fairness-preserving; defines protocol & UX in 1B. |
| D3 | Security stance (Phase 1) | **Cooperative/trusted LAN**; enforce SeatView redaction + seat-bound tokens; **no** confidentiality on hostile LANs; anti-host cheating (F3) deferred | See §5. |
| D4 | iOS hosting / rollout | **Android-first alpha**: GA = Android host + all guests (iOS app & browser included); iOS hosting validated on dev-client only, public iOS host gated on signed TestFlight/EAS later | See 1A + §7. |
| D5 | Host migration (R2) | **Deferred**; Phase 1 = host-loss ends the match. Only the *public* log is mirrorable; hidden-hand handoff needs a trusted successor or crypto (future) | §6. |
| D6 | Host-served payload | Serve the **full app web bundle** in 1A, under a binary-size budget; evaluate a slim "join client" export only if the budget is exceeded | 1A + BUILD-008. |

## 3. The architecture in one picture

The engine stays pure; a transport-agnostic session layer wraps it. Every
connectivity option plugs into the same `SessionTransport`. **All contracts
(engine hardening, seat model, wire protocol v1, SeatView redaction) are specified
in the Foundations spec** — this section is only the map.

```
   Game engine (pure)  ──►  GameSession (host authority | client)  ──►  SessionTransport
   playCard/validate/AI      • applies+validates commands               (WebSocket | SSE+POST
   + Phase-0 hardening        • projects per-seat SeatView (redaction)    | WebRTC | BLE | loopback)
   (canonical deal, codec)    • append-only move log (replay/reconnect)
```

The existing single-device mode becomes the **loopback transport** — preserving
offline play and proving the seam with zero networking.

## 4. Decision blocks (corrected summaries)

These are the option analyses from v1, with the review's factual fixes applied.
Depth lives in the sub-specs; this is the rationale of record.

### A. Forming a shared network
- **Same Wi-Fi / LAN (baseline):** requires **routable device-to-device
  reachability** — not necessarily the same subnet (subnet/multicast matters mainly
  for mDNS). TCP/WebSocket is the primary target; **UDP/WebRTC/mDNS each need
  separate validation** because AP isolation, guest VLANs, firewalls, multicast
  suppression and mobile permissions can block specific paths. *(fixes NET-005/006)*
- **No-router — host hotspot/tethering:** one device's hotspot forms a LAN. Android
  `LocalOnlyHotspot` yields ephemeral SSID/pass we can put in a Wi-Fi QR; **iOS
  Personal Hotspot is manual.** Joining is **OS-mediated**, typically a **two-step**
  flow (join Wi-Fi, then open the game URL) — not silent auto-join. *(fixes
  NET-001, EXPO-005)*
- **Native-only fast paths (not the backbone):** Wi-Fi Direct/Aware (Android-only),
  Apple MultipeerConnectivity (Apple-only), Google Nearby (Android-centric),
  Bluetooth/BLE (tiny payloads fit, but role/MTU/background constraints and no
  Safari). None span Android↔iOS↔browser → enhancements, deferred (§6).
- **QR / room code (universal pairing glue):** primary pairing UX for both browser
  and app. A zero-infra manual fallback must carry the **full** `http://<ip>:<port>`
  + token — a bare short code cannot resolve a host without a lookup service.
  *(fixes NET-010, UX-003)*

### B. Topology
**Star (hub-and-spoke) around the host** — matches host-authoritative play; n
connections; single point of failure handled by D5 (host-loss ends match in P1).
Mesh is only needed for browser-hosting/host-less play (deferred).

### C. Browser participation tier
- **Tier 0 (web not required):** breaks the "laptops play" goal — scaffold only.
- **Tier 1 (browser join-only) — the Phase 1 target.** A **native app hosts**,
  embeds an HTTP+WebSocket server, and **serves the web bundle itself**; a browser
  scans the QR → loads the game from the host over `http` → connects back
  **same-origin** via `ws://`. This avoids HTTPS/mixed-content and needs **no
  signaling server**. (Browsers cannot host; this requires a native runtime — see
  1A.) Note: "reuses the same static web artifact" — **after** adding the
  join/client flow, not "verbatim". *(fixes FE-002)*
- **Tier 2 (browser can host):** needs WebRTC + a signaling exchange; under
  zero-infra, signaling is the hard part. Deferred (§6).

### D. Protocol over the transport
WebSocket (host-served) is primary. SSE+POST is a **fallback only for
WebSocket-upgrade/proxy issues after HTTP reachability is proven** — it does **not**
fix AP isolation or host unreachability. *(fixes NET-008)* Raw TCP/UDP isn't
browser-reachable; WebRTC reserved for Tier 2; BLE for the no-Wi-Fi native path.
Protocol contract (envelope, ids, ack/reject, idempotency, SSE parity) is in
Foundations §wire-protocol.

### E. Discovery & pairing
QR primary (browser + app, zero-infra); mDNS/Bonjour is **best-effort convenience
for native apps only** (multicast/VLAN/permission caveats — validate); manual
full-URL + token is the safety net; offline **custom-scheme** deep links for
installed apps (universal/app links need an HTTPS domain → **not** zero-infra,
listed separately). *(fixes FE-007)* Full pairing-descriptor + UX in 1A.

### F. Authority & state sync (trust ladder)
- **F0 full-state broadcast** — leaks all hands; spike only.
- **F1 host-authoritative + redacted per-seat `SeatView`** — the **Phase 1
  baseline** (don't trust other clients; host still trusted). Schema + tests in
  Foundations.
- **F2 command/event-sourced log + validation** — reconnection/replay; Phase 1B.
- **F3 trustless deal** — deferred (§6); note F2's audit trail does **not** stop a
  malicious host (anti-host begins at F3). *(SEC-006)*

### G. Resilience (ladder)
R0 host-loss-ends-match (P1, per D5) → **R1 reconnect + pause/AI** (P1B, per D2) →
R2 migration (deferred) → R3 mesh (no). Details in 1B.

### H. Captive / isolated networks
AP/client isolation silently blocks peers on the same SSID. Detection uses a
**local-only diagnostic ladder** (`/healthz` fetch → WS-upgrade timeout categories
→ host-side "guest seen" → permission status → gateway/captive check) — **never**
internet reachability, since offline LANs are legitimate. *(fixes ARCH-008,
NET-004)* Fallback: host hotspot, then native no-Wi-Fi transports, then guidance.
Full taxonomy in 1B.

## 5. Security & trust posture (Phase 1)

Per D3, Phase 1 targets **cooperative, trusted local networks**:
- **No confidentiality/integrity on a hostile LAN.** Plain `http`/`ws` means any
  local observer/MITM can read or alter traffic. This is acceptable for friends on
  a home network/hotspot; **warn** on public/guest Wi-Fi and prefer the host
  hotspot. *(SEC-001)*
- **Enforced redaction:** clients receive only a `SeatView`; sending `GameState`/
  hands is forbidden and test-gated. *(SEC-004, → Foundations §SeatView)*
- **Seat-bound identity:** the host binds `{connection, seat, session}` and
  **ignores client-sent seat/player ids**; commands carry only `{CardRef, clientSeq}`
  + metadata. *(SEC-002, → Foundations §wire-protocol)*
- **Tokens:** separate high-entropy admission vs per-seat resume tokens, match-
  scoped, rotated on reconnect, single active connection per seat, host-confirmed
  reclaim. *(SEC-003)*
- **Embedded-server hardening:** bind only the chosen LAN/hotspot interface, random
  high port, serve an **allowlist** of exported assets (no dir listing/debug),
  strict schemas, size/rate/connection caps. *(SEC-008)*
- **Discovery minimisation:** mDNS advertises only an opaque room id + protocol
  version + capabilities — never names/state. *(SEC-009)*
- **Anti-host cheating (F3) deferred** with explicit rationale (§6).

## 6. Future / deferred (each behind a decision trigger — PROD-007)

| Item | Why deferred | Trigger to revisit |
|---|---|---|
| R2 host migration | Hidden-hand handoff needs trusted successor or crypto; conflicts with F1 privacy (SEC-005, GAME-007, ARCH-005) | Observed host-drop rate high in real play |
| F3 trustless deal (commit-reveal → mental poker) | Overkill for LAN friends (GAME-008, SEC-006) | A concrete adversarial/ranked scenario |
| Tier-2 WebRTC browser hosting | Zero-infra signaling is unsolved (NET-007) | "Host from a laptop, no app" becomes required, or optional signaling accepted |
| Native transports (Wi-Fi Direct / Multipeer / Nearby / BLE) | Single-platform; can't carry browser (NET-011) | Measured LAN-failure rate, or Apple-only/Android-only session demand |

## 7. Phased roadmap (index to sub-specs)

Build in dependency order (critical path: `engine+seats → protocol → SeatView →
native-host+UX → resilience → acceptance`).

- **Phase 0 — Foundations** (`…foundations-design.md`): engine hardening (canonical
  deal, codec, value-based cards), seat-ownership model, **wire protocol v1**,
  **SeatView** redaction, loopback transport, `protocol.ts` + golden fixtures.
  Outcome: zero behaviour change to offline play; contracts + tests in place.
- **Phase 1A — LAN MVP** (`…phase1a-lan-mvp-design.md`): native host (Expo
  CNG/prebuild) embedding HTTP+WS + serving the bundle; permissions/cleartext;
  static-serving contract; host/guest journey + `/join` route + lobby/seating;
  minimal `stateVersion` + reconnect handshake; F1 redaction live; **Android-first**
  (D4); 1A acceptance + QA subset. Outcome: Android host + browser/app guests play
  a full match offline, zero-infra.
- **Phase 1B — Robustness** (`…phase1b-robustness-design.md`): diagnostics ladder +
  failure taxonomy + hotspot/isolation fallback; F2 log; **R1 reconnect + pause/AI**
  (D2); heartbeats; security hardening; error/reconnect/host-loss UX; SSE+POST
  parity; mDNS auto-discovery; full QA matrix/lab/automation/release gates.
- **Phase 3/4 — Future** (§6), each gated by a trigger.

## 8. Cross-platform capability matrix (unchanged conclusion)

Only **IP-over-Wi-Fi carried by WebSocket (host-served), with QR/hotspot
bootstrapping**, spans Android + iOS + browser/laptop. Wi-Fi Direct, Multipeer,
Nearby and BLE are single-platform accelerants behind the same `SessionTransport`.
(Full matrix retained in v1 history / consolidation plan.)

## 9. Open questions resolved + remaining
**Resolved this revision:** D1–D6 (§2). **Remaining (per sub-spec):** exact native
server library + config-plugin (1A spike), APK/IPA size budget number (1A),
heartbeat/timeout constants (1B), device-lab inventory (1B).

## 10. v1→v2 change log & traceability
- **Factual corrections applied** (see consolidation §3): engine determinism/
  serialization (ARCH-001, GAME-001/005, WS-003), "verbatim" bundle (FE-002),
  subnet vs reachability (NET-005), "any IP transport" (NET-006), WebRTC/STUN
  (NET-007), hotspot auto-join (NET-001/EXPO-005), isolation via internet (ARCH-008/
  NET-004), short-code lookup (NET-010/UX-003), SSE scope (NET-008), JSON
  serialization (WS-003), universal links (FE-007).
- **New posture/structure:** security & trust (SEC-001/004/002/003/008/009), phase
  split (PROD-002, QA-001), futures + triggers (PROD-007), decisions D1–D6.
- **Deep contracts moved to** Foundations/1A/1B (clusters A–K) — each sub-spec
  carries its own comment-ID traceability footer.
