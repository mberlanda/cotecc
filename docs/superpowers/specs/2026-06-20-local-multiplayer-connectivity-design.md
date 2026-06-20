# Local Multiplayer Connectivity — Design & Options

**Date:** 2026-06-20
**Status:** Design exploration (no implementation committed)
**Author:** brainstorming session

## 1. Purpose & scope

Cotecc today is a single-device, offline, guest-only game. Up to 6 players, one
table at a time, all seats local (human + AI). The goal of this document is to
explore how to let **multiple physical devices on a local network play one shared
table** — phones, tablets and laptops, **cross-platform** (Android + iOS + browser),
**without internet access and without any server the maintainer operates**.

This is an **options & trade-offs** document, not a single blueprint. It is
organised as a set of **orthogonal decision blocks**. Each block lists the
realistic options, their trade-offs, and a recommendation. Where the user asked
for an *incremental* path (browser participation, resilience/trust) the options
are framed as a ladder. A recommended phased roadmap that combines one choice per
block is given at the end (§11).

### Hard constraints (from the request)
- **No internet dependency.** Must work fully on a local network.
- **No operator-run infrastructure.** "Zero infra" is the *starting* posture: no
  cloud, no signaling server, nothing the maintainer hosts or pays for.
- **Cross-platform.** A match must be playable across, e.g., two laptops + two
  Android devices simultaneously. iOS is in scope as well.
- **One table at a time, ≤ 6 seats.**

### The single most important property of this game (and why it makes life easy)
Cotecc is **turn-based and latency-tolerant**. The wire payload is tiny:

- A move is `{ playerID, card }`, where `card` is `{ suit, rank, points }` — on the
  order of tens of bytes.
- A full `GameState` snapshot for 6 players is a few KB at most.
- There is **no real-time loop**: one human acts at a time, others wait.

Consequence: **bandwidth and latency are essentially never the deciding factor.**
Even Bluetooth LE (a few kB/s) is comfortably enough. The design is therefore
dominated by three things only: **discovery (how peers find each other),
cross-platform reach (which transports actually work on which OS), and
zero-infra (can we avoid a signaling/relay server).** Keep this in mind — it is
why several "exotic" transports remain viable and why we do not need lockstep or
rollback netcode.

## 2. What the codebase already gives us

The existing engine is, in effect, a **deterministic reducer**, which is the ideal
foundation for any networked card game:

| Seam | Where | Why it matters for netcode |
|---|---|---|
| Single move entry point | `playCard(state, playerID, card)` in `src/utils/gameLogic.ts` | One command type to send over the wire. |
| Move validation already exists | `validateMove(turn, hand, card)` in `movesLogic.ts` | The authority can reject illegal/cheating commands cheaply. |
| Pure, serialisable state | `GameState` in `src/types.ts` (plain objects, arrays, maps) | Snapshots and deltas serialise to JSON directly. |
| Hidden state is isolated | each hand is `currentRound.players[].cards` | We can compute per-seat **redacted** views from one source of truth. |
| AI can drive any seat | `aiMoveToPlay(...)` + `simulateGameToEnd(...)` | Dropped/empty seats can be auto-played — key for resilience. |
| State lives in one component | `GameScreen` holds it in `useState` | A single, well-bounded place to swap "local engine" for "session client". |

**Two concrete gotchas the net layer must respect:**

1. **Reference-equality card matching.** `makeMove` does
   `hand.cards.findIndex(c => c === playedCard)`. A card arriving from the wire is a
   *new* object and will not be `===` any card in the hand. The session layer must
   **rehydrate**: look up the real card object in the seat's hand by `(suit, rank)`
   before calling the engine. (Or refactor the engine to match by value — a small,
   well-contained change.)
2. **The deal is the secret.** `newRound` → `newPlayersHand` shuffles and deals.
   Whoever performs the deal knows everyone's cards. This is the crux of the trust
   model (§8): in the cooperative model the host deals; in a trustless model the
   deal itself must be made tamper-evident.

### The proposed core abstraction (shared by every option below)

Introduce a transport-agnostic session layer so that *every* connectivity option
plugs into the same engine without touching game rules:

```
              ┌────────────────────────────────────────────┐
              │ Game engine (unchanged pure functions)      │
              │ playCard / validateMove / nextRound / AI    │
              └────────────────────────────────────────────┘
                         ▲ commands            │ redacted views
                         │                      ▼
              ┌────────────────────────────────────────────┐
              │ GameSession (authority OR client role)      │
              │  - applies/validates commands               │
              │  - projects per-seat state (redaction)      │
              │  - append-only move log (replay/reconnect)  │
              └────────────────────────────────────────────┘
                         ▲                      │
                         │   SessionTransport   ▼   (interface)
              ┌────────────────────────────────────────────┐
              │ Transport impls: WebSocket / WebRTC / BLE / │
              │ Nearby / Multipeer / loopback (single-dev)  │
              └────────────────────────────────────────────┘
```

- `SessionTransport` is a thin interface: `send(peerId, bytes)`, `onMessage(cb)`,
  `onPeerJoin/Leave`, `broadcast(bytes)`.
- The existing single-device mode becomes a **loopback transport** — proving the
  abstraction without any networking, and keeping offline play intact.
- Messages: `JoinRequest`, `SeatAssigned`, `Lobby`, `StartGame`, `PlayMove`
  (client→host), `StateUpdate`/`StateDelta` (host→client), `Heartbeat`, `Bye`.

This abstraction is the one thing worth building first regardless of which
transports we ultimately ship.

---

## 3. Decision block A — How devices form a shared network

This is the **link/physical layer**: how do devices come to share an addressable
medium at all? Several of these are platform-siloed; that limitation is what
forces the cross-platform baseline in block B.

### A1. Same Wi-Fi / LAN (infrastructure AP) — *baseline*
All devices joined to the same router/access point. Standard IP networking; any
IP transport (WebSocket, WebRTC, raw TCP/UDP) works.
- **Pros:** Universal, no special APIs, highest bandwidth, browser-reachable.
- **Cons:** Requires an AP everyone can join. Fails on **client-isolated**
  networks (corporate/guest/public Wi-Fi that blocks device-to-device traffic —
  see block G). Requires everyone to be on the *same* subnet.
- **Verdict:** The cross-platform backbone. Everything else is either a way to
  *create* such a network without a router, or a platform-specific fast path.

### A2. No-router: one device becomes the access point (hotspot / tethering)
A phone/laptop shares a hotspot; others join it; the result is an ordinary LAN
(then A1 applies). Covers camping/travel/"no Wi-Fi here".
- **Programmatic creation:**
  - Android: `WifiManager.startLocalOnlyHotspot()` creates an app-scoped hotspot
    and returns SSID + passphrase — which we can **encode in the pairing QR** so
    guests auto-join (Wi-Fi QR format `WIFI:S:<ssid>;T:WPA;P:<pass>;;`).
  - iOS: cannot create a hotspot programmatically; user enables Personal Hotspot
    manually. We can still show instructions + the Wi-Fi QR for guests to join.
- **Pros:** No infrastructure at all; one tap (on Android) to a working LAN.
- **Cons:** Host device's hotspot may have no internet (fine for us); some phones
  refuse hotspot while on cellular-only; iOS is manual.
- **Verdict:** Strong **first-class** fallback when no shared AP exists. Pairs
  beautifully with QR (carry both Wi-Fi creds *and* the game URL).

### A3. No-router: Wi-Fi Direct / Wi-Fi Aware (NAN)
Infrastructure-less Wi-Fi links between devices.
- Wi-Fi Direct: **Android only** (`WifiP2pManager`). iOS does not expose it.
- Wi-Fi Aware / NAN: **Android 8+ only**, supports IP sockets over the NAN link.
- **Pros:** No AP, good range/bandwidth.
- **Cons:** **Android-to-Android only**; browsers and iOS cannot participate.
  Cannot be the cross-platform baseline.
- **Verdict:** Optional **Android↔Android fast path**, not the common denominator.

### A4. Apple MultipeerConnectivity (AWDL)
Apple's peer framework over Bluetooth + peer-to-peer Wi-Fi (AWDL), no router.
- **Pros:** Excellent UX on Apple devices, no AP, automatic discovery.
- **Cons:** **iOS/macOS only.** No Android, no browser.
- **Verdict:** Optional **Apple↔Apple fast path** only.

### A5. Google Nearby Connections
Google's abstraction that auto-selects BLE + Bluetooth + Wi-Fi for discovery and
transfer.
- **Pros:** Robust discovery, handles medium switching, no AP needed.
- **Cons:** Android-centric (iOS SDK exists but is limited/separate); **no
  browser**. Adds a Google dependency.
- **Verdict:** Compelling for an Android-heavy crowd; still not browser-capable.

### A6. Bluetooth — Classic SPP and BLE GATT
- Bluetooth Classic (SPP): Android can do arbitrary serial links; **iOS restricts
  it to MFi** hardware → not usable app-to-app cross-platform.
- BLE GATT: both Android and iOS can act as central/peripheral via native modules;
  **Web Bluetooth** exists but is **Chrome/Edge/Android-only, central-role only,
  cannot advertise**, and absent on Safari/iOS.
- **Bandwidth:** a few kB/s — *more than enough* for our tiny move payloads.
- **Pros:** Works with **zero Wi-Fi entirely**; great for "no network of any kind".
- **Cons:** Pairing UX is fiddly; topology is awkward beyond a couple of peers (one
  central, multiple peripherals); browser support is partial and one-directional;
  iOS Classic is a non-starter.
- **Verdict:** Genuinely viable as a **native low-infrastructure** option precisely
  because our payload is tiny, but it cannot include browsers/laptops well. Best
  positioned as an Android(+iOS-native) fallback for the absolute-no-Wi-Fi case.

### A7. Wired & other media (completeness)
- **Ethernet/USB-C dock LAN, USB tethering:** turn laptops/phones into a wired LAN
  → reduces to A1. Niche but rock-solid.
- **WebUSB / adb:** developer-grade, not realistic for players.
- **NFC:** too short-range to carry gameplay, but **excellent for pairing handoff**
  — tap to exchange the connection descriptor, then play over Wi-Fi/BLE (Android;
  iOS read-only-ish). A "tap to join" nicety.
- **Ultrasonic / sound pairing:** gimmick; could exchange a room code via audio
  when cameras can't scan a QR. Mention only; not recommended.

### A8. Out-of-band pairing channel — **QR / room code (universal)**
Not a network medium but the glue that makes all of the above usable without
typing IP addresses. A QR shown by the host can carry: the game URL
(`http://<host-ip>:<port>/#room=<token>`), and/or Wi-Fi join credentials, and/or
a WebRTC offer. Works for **both** browsers and apps, needs no infrastructure.
- **Verdict:** The **primary pairing UX** across every transport. Manual room
  code + IP entry is the fallback when no camera.

**Block A summary:** IP-over-Wi-Fi (A1), optionally bootstrapped by a host hotspot
(A2), with QR pairing (A8), is the only path that spans Android + iOS + browser +
laptop. A3–A6 are valuable *native-only fast paths* but cannot carry the browser,
so they are enhancements, not the backbone.

---

## 4. Decision block B — Connection topology

| Option | Shape | Fits authority model | Pros | Cons |
|---|---|---|---|---|
| **Star / hub-and-spoke** | All guests connect to one host | Host-authoritative (§8) | Simple, n connections, natural fit for "one device deals & rules" | Single point of failure (mitigated by §9 migration) |
| **Full mesh** | Every peer connects to every other (n²) | Peer/replicated authority | No central server; survives any one peer | n² connections; needs distributed move ordering; only justified for browser-hosting / no-host designs |
| **Broker / bus** | All connect to a small message relay | Either | Decouples discovery from authority | The relay is *infrastructure* — violates zero-infra unless it runs on a player's own device on the LAN |

At 6 seats, n² (15 links) is trivially small, so mesh is *technically* fine — but
it only earns its complexity if we need no-single-host operation. **Star is the
right default** because it matches both the game (someone deals) and the simplest
authority model. Mesh is the structural prerequisite for "browser can host" (block
C, Tier 2) and for fully host-less play.

---

## 5. Decision block C — Browser participation tier (incremental)

This is **the** fork, because browsers are the most constrained client: they
**cannot** open raw sockets, run mDNS, accept inbound connections, or host a
server. They can only make **outbound WebSocket** or **WebRTC** connections, plus
partial Web Bluetooth. Laptops in this project are browser clients (there is no
desktop native build today), so this tier directly decides whether "two laptops +
two Androids" is possible.

### Tier 0 — Web not required (native-only multiplayer)
Web build stays single-player guest mode; LAN play is iOS/Android apps only.
- **Pros:** Least work; can use native-only transports (A3–A6).
- **Cons:** **Breaks the stated goal** ("two laptops"). Laptops can't join.
- **Verdict:** Acceptable only as a temporary scaffolding step, not an end state.

### Tier 1 — Browser **join-only** (recommended target)
A **native app hosts**; browsers (and other apps) **join**. The elegant move that
makes this zero-infra and install-free for laptops:

> The host app embeds an **HTTP + WebSocket server** and **serves the React web
> bundle itself**. A laptop scans the QR → loads `http://<host-ip>:<port>` (the
> game, served by the host) → opens a **same-origin** `ws://` back to the host.

This sidesteps the two classic browser blockers at once:
- **Mixed-content:** because the page is served over plain `http` *from the host*,
  a `ws://` to the same origin is allowed (no HTTPS/`wss` cert needed on a LAN).
- **No install:** laptops/guests run the current web bundle with zero setup.

- **Pros:** True cross-play (Android/iOS app hosts; laptops + any phone join via
  browser); **zero infra**; one transport (WebSocket); reuses the existing web
  build verbatim; the host is the natural authority.
- **Cons:** Host must be a **native app** that can run a socket server (browsers
  can't host) → requires a custom native module and leaving Expo Go (see §10).
  iOS shows a Local Network permission prompt.
- **Verdict:** **The recommended first networked milestone.** It delivers the full
  cross-platform promise with the least moving parts and no signaling server.

### Tier 2 — Browser **full peer** (browser can also host)
A browser tab can host a table too.
- Browsers can't accept inbound connections, so hosting from a browser requires
  **WebRTC DataChannels** (peer-to-peer) — and WebRTC needs a **signaling
  exchange** (SDP + ICE candidates) to connect.
- On a LAN, the media path itself needs **no STUN/TURN** (host ICE candidates
  reach each other directly). But the *signaling handshake* still must travel some
  channel. Zero-infra options for signaling:
  - **Manual / QR signaling:** copy-paste or QR the offer/answer. Fine for 1↔1,
    **painful for up to 6 peers** (each pair needs an exchange).
  - **Bundled LAN signaling helper:** a tiny rendezvous that runs on *a player's
    own device* (e.g., the same native host app) — no cloud, but now you've
    reintroduced a host-as-server, so you might as well use Tier 1's WebSocket.
  - **Optional cloud signaling:** trivial and reliable, but **breaks zero-infra**.
- **Pros:** No native app needed to host; pure-browser games; works across
  subnets/NAT with STUN.
- **Cons:** Signaling is the Achilles' heel under zero-infra; WebRTC adds
  significant complexity (ICE, data-channel reliability config, mesh ordering).
- **Verdict:** **Defer.** Revisit if "host from a laptop with no app installed"
  becomes a real requirement, or if you later accept an optional free signaling
  endpoint.

**Incremental path for block C:** Tier 0 (scaffold/loopback) → **Tier 1
(ship this)** → Tier 2 (only if browser-hosting is genuinely needed).

---

## 6. Decision block D — Application protocol over the chosen transport

| Protocol | Browser-reachable? | Zero-infra LAN? | Notes |
|---|---|---|---|
| **WebSocket (host serves it)** | ✅ | ✅ | Recommended. Full-duplex, simple framing, same-origin trick avoids HTTPS. Host needs a native socket server. |
| **WebRTC DataChannel** | ✅ | ⚠️ (signaling) | Needed for Tier 2 / mesh / cross-subnet. Configurable reliable/ordered (use reliable+ordered for us). |
| **HTTP polling / SSE + POST** | ✅ | ✅ | Fallback when WS is blocked by a network. SSE = server→client stream, POST = client→host. Higher latency, fine for turn-based. |
| **Raw TCP / UDP** | ❌ | ✅ | Not reachable by browsers → only a native↔native fast path. UDP pointless given turn-based reliability needs. |
| **BLE GATT messages** | ⚠️ (Chrome central only) | ✅ | The transport for block A6; tiny MTU but our payloads fit. |

**Recommendation:** WebSocket as the primary protocol, with SSE+POST as a
graceful fallback for restrictive networks, and WebRTC reserved for Tier 2.

---

## 7. Decision block E — Discovery & pairing UX

How a guest goes from "app open" to "seated at the host's table".

| Mechanism | Works for browser? | Works for app? | Infra | Notes |
|---|---|---|---|---|
| **QR code** (host shows, guest scans) | ✅ | ✅ | none | Primary. Encodes URL + room token (+ optional Wi-Fi creds / WebRTC offer). |
| **mDNS / Bonjour** auto-list | ❌ | ✅ | none | Native apps can auto-discover nearby tables (`react-native-zeroconf`). iOS needs `NSBonjourServices` + Local Network permission. |
| **Manual room code + IP** | ✅ | ✅ | none | Fallback when no camera. Short code maps to host IP:port. |
| **Deep link / app link** | ✅→app | ✅ | none | `coteccapp://join?...`; universal link can open the app or fall back to the web join page. |
| **NFC tap-to-join** | ❌ | ✅ (Android) | none | Bonus convenience; hand off the descriptor by tap. |

**Recommendation:** QR is primary (covers browser + app, zero infra). Add mDNS
auto-discovery for installed apps as a delight feature. Manual code is the safety
net.

---

## 8. Decision block F — Authority & state synchronisation (incremental, toward no-trust)

How the shared truth is maintained and how much each peer is trusted. Framed as a
ladder; each rung builds on the previous and reuses the existing engine.

### F0 — Host-authoritative, **full-state broadcast** (cooperative)
Host runs the engine; after each applied move it broadcasts the entire
`GameState`; clients render it; clients send `PlayMove` intents.
- **Pros:** Trivial to build on top of the current engine; one source of truth.
- **Cons:** **Leaks every hand** to every client (the whole state, including other
  players' cards, is on the wire and in memory). Trivially cheatable. Fine only
  for trusted friends.

### F1 — Host-authoritative, **redacted per-seat views** (don't trust the network/peer memory)
Host keeps the full state but sends each client a **projection**: only that seat's
hand + public table state (current trick, scores, lives, whose turn). Add
`projectStateForSeat(state, seat)`.
- **Pros:** Casual peeking impossible; small per-client payloads; minimal extra
  code given hands are already isolated in `currentRound.players[]`.
- **Cons:** Still trusts the **host** (who deals and sees all). Clients can still
  *send* illegal moves — handled by `validateMove` on the host.
- **Verdict:** The **baseline worth shipping**. "No-trust" of *other clients* with
  a still-trusted host.

### F2 — **Command/event-sourced** log + server-side validation
Clients send commands (`{seat, card}`); host validates with `validateMove`,
applies via `playCard`, appends to an **authoritative append-only move log**, and
broadcasts redacted deltas (or re-projected snapshots).
- **Pros:** Enables **reconnection & replay** (a returning client gets a snapshot
  or replays the log), **host migration** (§9), and an audit trail. Deltas shrink
  traffic. Foundation for determinism checks.
- **Cons:** More plumbing (log, sequence numbers, delta application). Clients may
  optionally re-run the engine on their redacted view for prediction, but must
  respect the **card-rehydration** rule.
- **Verdict:** The structural target once reconnection/migration matter.

### F3 — **Trustless deal integrity** (don't even trust the host)
The remaining trust hole is the deal: the host knows everyone's cards. To remove
it, make the shuffle tamper-evident:
- **Commit–reveal:** each peer contributes entropy and a hash commitment; combined
  after reveal to seed a **deterministic shuffle**; the deal is then verifiable and
  not chosen by any single party.
- **Mental-poker / encrypted-deck protocols:** full cryptographic card hiding so no
  one (host included) sees others' cards until legally revealed.
- **Pros:** Genuine no-trust play.
- **Cons:** Significant cryptographic complexity and per-move overhead; almost
  certainly **overkill for LAN friends**. Document it; don't build it unless a
  concrete adversarial scenario appears.

**Incremental path for block F:** F0 (spike only) → **F1 (ship)** → F2 (when
reconnection/migration needed) → F3 (only if true no-trust is required).
Note the design *enables* climbing this ladder without re-architecting: the
`GameSession` + log + projection seams are the same throughout.

---

## 9. Decision block G — Resilience (incremental)

What happens when a device drops, the host leaves, or the network hiccups.

### R0 — Best-effort, host loss ends the match
A drop pauses/ends the game.
- **Verdict:** Acceptable for a first cut; pair with AI takeover (below) to soften.

### R1 — **Reconnection + AI takeover**
Each seat has a stable token. If a guest drops, the host either **pauses** or lets
`aiMoveToPlay` play that seat (the engine already supports AI seats); on return,
the client gets a fresh redacted snapshot (or replays the log under F2) and
reclaims the seat.
- **Pros:** Big robustness win for little cost; reuses existing AI; turn-based game
  tolerates a paused seat gracefully.
- **Verdict:** **Recommended early.** It directly leverages a feature the game
  already has.

### R2 — **Host migration**
The authoritative log/state is mirrored to a designated successor peer; if the host
dies, the successor promotes and guests reconnect to it (QR/code re-broadcast or
mDNS re-discovery).
- **Pros:** Match survives the host leaving — important if the host is someone's
  phone that rings/leaves.
- **Cons:** Needs leader election, state replication, and re-pointing clients;
  awkward in a pure star (everyone was connected only to the host) — mitigated by
  pre-sharing the log with the successor under F2.
- **Verdict:** Worth it once F2 exists; the log makes handoff tractable.

### R3 — **No single point (replicated/mesh)**
Every peer holds the log; moves are ordered by consensus; any peer can drop.
- **Cons:** Distributed-systems complexity (ordering, conflict resolution) far
  beyond a 6-friend card game.
- **Verdict:** Overkill; document as the theoretical ceiling.

**Incremental path for block G:** R0 → **R1 (recommended early)** → R2 (with F2) →
R3 (don't).

---

## 10. Decision block H — Captive / isolated / hostile networks

Even on the "same Wi-Fi", **AP/client isolation** (common on guest, hotel, office,
and some home networks) silently blocks device-to-device traffic — discovery and
WS both fail despite full bars.

**Detection:** host advertises and waits; if a guest scans the QR but the `ws://`
handshake times out while internet (or gateway) is reachable, infer isolation and
surface a clear message rather than a generic failure.

**Fallbacks, in order:**
1. **Host-created hotspot (A2):** switch the table onto the host's own
   `LocalOnlyHotspot` (Android) / Personal Hotspot (iOS, manual); the QR then also
   carries Wi-Fi join creds so guests hop networks and reconnect automatically.
2. **Native no-Wi-Fi transports (A4/A5/A6):** for app users on Apple↔Apple or
   Android↔Android, fall to MultipeerConnectivity / Nearby / BLE.
3. **Guidance:** if all else fails (e.g., a locked corporate network with no
   hotspot allowed), instruct players to form a hotspot from any one device.

**Verdict:** Treat isolation as a first-class failure mode with the hotspot
fallback as the primary escape hatch. This is what makes the feature feel robust
"in the wild" rather than only on a friendly home router.

---

## 11. Cross-platform capability matrix (the constraint that drives everything)

Legend: ✅ full · ⚠️ partial/conditional · ❌ no.

| Transport / medium | Browser (laptop/phone) | Android app | iOS app | Spans Android↔iOS↔Browser? |
|---|---|---|---|---|
| Wi-Fi LAN + WebSocket (host serves bundle) | ✅ (join) | ✅ host/join | ✅ host/join | ✅ **yes — the backbone** |
| Wi-Fi LAN + WebRTC (signaling needed) | ✅ | ✅ | ✅ | ✅ (but signaling cost) |
| Host hotspot → LAN (A2) | ✅ join | ✅ (auto on Android) | ⚠️ manual | ✅ |
| mDNS discovery | ❌ | ✅ | ✅ | n/a (discovery only) |
| Wi-Fi Direct / Aware (A3) | ❌ | ✅ | ❌ | ❌ Android-only |
| MultipeerConnectivity (A4) | ❌ | ❌ | ✅ | ❌ Apple-only |
| Nearby Connections (A5) | ❌ | ✅ | ⚠️ | ❌ mostly Android |
| BLE GATT (A6) | ⚠️ Chrome central-only | ✅ | ✅ | ⚠️ excludes Safari/most browsers |
| Bluetooth Classic | ❌ | ✅ | ❌ (MFi) | ❌ |
| QR pairing (A8) | ✅ | ✅ | ✅ | ✅ (pairing only) |

**The unavoidable conclusion:** only **IP-over-Wi-Fi carried by WebSocket (or
WebRTC), with QR/hotspot bootstrapping**, spans all four targets. Every other
medium is a single-platform enhancement. Therefore the cross-platform baseline is
fixed; the "creative" transports (Wi-Fi Direct, Multipeer, Nearby, BLE) are
opt-in accelerants layered behind the same `SessionTransport` interface.

---

## 12. Platform implementation realities (what each choice costs)

- **Host running a socket/HTTP server (Tier 1):** Browsers can't; a native app
  must. In Expo this means a **custom native module** (e.g.
  `react-native-tcp-socket` + a WebSocket layer, or a small embedded HTTP server)
  and therefore **leaving Expo Go** for a dev client / prebuild (CNG). This aligns
  with the project's existing direction (per the structural-review roadmap: SDK
  upgrade + CNG, then EAS Build). The web bundle is exported and **shipped as an
  asset** the host serves.
- **iOS Local Network permission:** First LAN access triggers a system prompt;
  Bonjour/mDNS requires declaring `NSBonjourServices` + a usage string.
- **Android hotspot:** `LocalOnlyHotspot` needs location permission and returns
  ephemeral SSID/pass (perfect for the QR). Wi-Fi Direct/Aware need their own
  permissions and feature checks.
- **Web same-origin trick:** serving the page from the host over `http` is what
  keeps `ws://` legal without certificates — but it means the host must serve the
  bundle, not just data.
- **WebRTC (if Tier 2):** add a data-channel lib; configure reliable+ordered;
  solve signaling without infra (the hard part, §5 Tier 2).
- **Determinism / card rehydration:** the `c === playedCard` reference check
  (§2) must be handled in the session layer or refactored in the engine — either
  way, a small, contained change with test coverage.

---

## 13. Recommended phased roadmap (one pick per block)

A concrete, incremental path that satisfies the constraints and keeps each step
shippable. Each phase would get its own spec → plan → implementation cycle.

**Phase 0 — Session abstraction + loopback (no networking).**
Extract `GameSession` (authority + client roles), the `SessionTransport`
interface, command/state message types, per-seat **projection** (F1), and a
**loopback transport** that reproduces today's single-device play through the new
seams. Refactor `GameScreen` to consume a session instead of calling `playCard`
directly. Handle card rehydration. *Outcome: zero behaviour change, fully
test-covered seam to build on.*

**Phase 1 — Cross-platform LAN, browser join-only (the headline feature).**
Blocks: A1 (+A2 hotspot fallback) · B star · **C Tier 1** · D WebSocket · E QR
(+ optional mDNS) · **F1** redacted host-authoritative · **R0→R1** AI takeover ·
H isolation detection + hotspot escape. Host = native app embedding HTTP+WS,
serving the web bundle; laptops/phones join by scanning a QR. *Outcome: "two
laptops + two Androids" works offline with zero infra.*

**Phase 2 — Robustness.** F2 event-sourced log → reconnection/replay; R1 polished;
R2 host migration; SSE+POST fallback for restrictive networks; mDNS auto-lobby.

**Phase 3 — Native accelerants (optional).** Behind the same interface: Android
Wi-Fi Direct/Aware (A3) and Apple MultipeerConnectivity (A4) for no-router native
play; BLE (A6) for the absolute-no-Wi-Fi case. Browser stays on WS/WebRTC.

**Phase 4 — Beyond (only if needed).** C Tier 2 browser-hosting via WebRTC (accept
an optional signaling helper); F3 trustless deal integrity.

### Why this ordering
It front-loads the one thing that satisfies *all* hard constraints at once (Phase
1), keeps the offline single-device game working throughout (loopback), and defers
every expensive choice (WebRTC signaling, host migration, cryptographic dealing)
until a concrete need justifies it — while the architecture is deliberately shaped
so each later rung snaps onto the same seams.

## 14. Open questions / things to validate before Phase 1
- Confirm the project's native-runtime status (dev client / prebuild / EAS) so a
  host socket server is feasible (ties to the existing CNG/EAS roadmap).
- Decide whether the host **embeds and serves the web bundle** (enables install-
  free laptop join — recommended) or whether laptops must load the public web
  build and connect to a LAN IP (reintroduces HTTPS/mixed-content friction).
- Pick the WS/server native module and verify it builds on both iOS and Android.
- Validate the iOS Local Network permission + Bonjour flow on a real device.
- Decide pause-vs-AI-takeover default for a dropped seat (R1).
```
