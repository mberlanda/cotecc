# Local Multiplayer — Phase 1A: LAN MVP

**Date:** 2026-06-20 · **Revision:** v3 · **Phase:** 1A · **Parent:** `…connectivity-design.md` (v3)

> **v3 changes (round-2 fixes):** CI harness for the host-served bundle added so
> Playwright gates run headless (RC2-QA-001, blocker); `seatToken` removed from the
> join URL and issued post-join (RC2-SEC-001); game-over/rematch + browser-guest
> exit flow added (RC2-UX-002); build-time embed guard tied to `prebuild`
> (RC2-EXPO-001); `expo-dev-client` named as a dependency for all native
> participants (RC2-EXPO-003); QR/token TTL + refresh defined (RC2-QA-002,
> RC2-UX-001).
**Depends on:** Foundations (Phase 0). **Resolves:** E (native host & packaging),
F (permissions/cleartext), K-core (host/guest journey, join route, lobby),
J-1A (acceptance & QA subset).

**Goal (per D4 — Android-first alpha):** an **Android** device hosts a table;
**browser (laptop/phone) and native app guests** join over the LAN and play one
full match **offline, zero-infra**. iOS hosting is validated on dev-client only;
public iOS host is gated on signed distribution (later). The headline mechanism:
the host embeds an HTTP+WebSocket server and **serves the web bundle itself**.

---

## 1. Native host runtime & packaging (cluster E) — highest delivery risk

The embedded HTTP+WS host is a **native-runtime + packaging concern**, not a module
choice. The repo is CNG (no committed `ios/`/`android/`; `app.json` has only
expo-router + splash).

### 1.1 Mandatory spike (gates the rest of 1A) *(ARCH-006, EXPO-001, WS-004)*
Prove on **real Android and iOS dev-client builds**:
1. Bind one HTTP server to a LAN-reachable interface on a random high port; serve
   `/healthz`, the exported web bundle at `/`, static assets, and a `/ws` upgrade.
2. A browser on another device loads `http://<host-ip>:<port>` and opens a
   same-origin `ws://` back; a native app guest connects to `ws://<host-ip>:<port>/ws`.
3. Choose the server approach: a maintained SDK 56 / RN 0.85-compatible socket
   library **or** a local Expo Module, **plus** any config plugin. Record exact
   versions, maintenance/license status. *(BUILD-004)*
4. `expo prebuild --clean` regenerates all native changes from `app.json`/config
   plugins (no hand-edited `ios/`/`android/`). *(BUILD-002)*

### 1.2 Static-serving contract *(FE-006, BUILD-007, WS-004)*
Embedded server must mirror the production web deploy, **offline**: serve
`index.html`, hashed JS/CSS/image assets with correct MIME types, **SPA fallback**
for `/join` and `/game` route refreshes, no CDN/runtime internet dependency, and a
cache/version strategy invalidated on app upgrade. Serve an **allowlist** of
exported assets only (no dir listing/debug) (SEC-008).

### 1.3 Web-bundle embedding pipeline *(BUILD-001, EXPO-004)*
`npm ci` → `npx expo export --platform web --output-dir dist-embedded` → copy into
a native asset/resource path via config plugin/build script → generate an asset
**manifest + hash** → verify the packaged APK/IPA contains it and the hash matches
the exported artifact. Decide web-bundle update channel: **EAS Update vs binary
release** (with `runtimeVersion` policy, e.g. `fingerprint`). *(EAS, EXPO-007)*
Per **D6**, ship the **full app bundle**; track APK/IPA size **before/after**
against a budget and only then consider a slim join-client export. *(BUILD-008)*
- **Build-time embed guard** *(RC2-EXPO-001)*: the config plugin/build script must
  **fail the build** if `dist-embedded` is missing/stale or its hash doesn't match
  the freshly exported web artifact. `expo prebuild --clean` followed by a build
  must never silently produce a binary without the bundle — a packaged-asset +
  hash assertion runs in CI.
- **Update channel decision** *(RC2-EXPO-002)*: the embedded bundle ships **inside
  the binary** for 1A (no EAS Update OTA for the host-served assets), so the served
  bundle version always matches the running native host; OTA of host-served assets
  is explicitly out of scope until the runtime/version interaction is designed.
- **Dependency** *(RC2-EXPO-003, EXPO-007)*: add `expo-dev-client`; **every** native
  participant (host and native guests, iOS and Android) runs a dev/preview build,
  not Expo Go, once the server/native module lands. `eas.json` gains development +
  preview profiles with a `runtimeVersion: { policy: "fingerprint" }`.

### 1.4 Host lifecycle *(EXPO-002, NET-012)*
Phase 1A hosting is **foreground-only**: use `expo-keep-awake`, warn the host to
keep the app open/unlocked, handle `AppState` transitions (background/lock →
pause/host-loss path), and treat process death as host loss (D5: match ends).

### 1.5 Build/CI & dev workflow *(BUILD-005, BUILD-006, QA-007)*
Path-triggered/mandatory `build-native` checks for native/config/plugin changes;
`expo export` before native builds; packaged-asset existence + hash check.
Dev loop: `npm run android` / `npm run ios` (dev client); Expo Go remains valid
only for non-networking screens. `eas.json` development/preview profiles added.

### 1.6 Acceptance (E)
Spike (§1.1) green on both platforms; `expo prebuild --clean` reproducible;
embedded bundle served + hash-verified; foreground lifecycle handled; native CI
gate active.

---

## 2. Permissions & cleartext (cluster F)

The same-origin `http`/`ws` trick solves the **browser**; **native app clients**
still need transport policy. *(NET-003, EXPO-003, BUILD-003)*
- **Android:** `INTERNET`; **cleartext network-security-config** scoped to LAN/
  hotspot endpoints; `NEARBY_WIFI_DEVICES` (API 33+) / location (older) for hotspot;
  `CHANGE_WIFI_STATE` for `LocalOnlyHotspot`.
- **iOS:** `NSLocalNetworkUsageDescription` (+ `NSBonjourServices` when mDNS lands
  in 1B); ATS/local-network handling for native cleartext clients.
- **Camera (in-app QR):** `expo-camera` + `NSCameraUsageDescription` + Android
  camera permission; manual entry is the no-camera fallback. *(EXPO-006)*
- All represented in `app.json`/config plugins; `expo prebuild --clean` is the test.
- **Permission UX matrix** *(UX-004)*: per permission — trigger point, pre-prompt
  copy, OS purpose string, denial message, retry/Settings path, fallback.

---

## 3. User experience (cluster K, core)

### 3.1 Role model *(UX-008)*
**Host** = table owner / referee / dealer (also occupies a seat). **Guests** = seat
owners. Control matrix: start game, lock/open seats, add bot seats, kick,
(1B) pause/AI/reconnect — host-only; play a card — seat owner only.

### 3.2 Host & guest journeys *(UX-001, PROD-004)*
- **Host:** Home → "Host LAN table" → table settings (name, seat count 2–6,
  language) → **Lobby** showing a **QR + visible SSID/IP/port + short token** →
  start when ready. Cancel/back tears down the server.
- **Guest (browser):** scan QR → loads `http://<host-ip>:<port>/join?room=<token>`
  **from the host** → enter display name/language → connecting → lobby → game.
  A dedicated `/join` route prevents falling into the local-only Home setup.
  *(UX-010)*
- **Guest (native app):** scan in-app (expo-camera) or enter full URL/token →
  same lobby → game.

### 3.3 Pairing descriptor *(UX-002, FE-001, UX-003🚫)*
- Join URL contract: `http://<host-ip>:<port>/join?room=<roomToken>` — **only the
  room-admission token is in the URL.** *(FE-001)*
- **No bearer credential in the URL** *(RC2-SEC-001)*: the per-seat **resume
  (`seatToken`) is issued post-join** by the host inside `SeatAssigned`, over the
  WS/SSE channel, and stored client-side (not in the address bar). Rationale: a
  URL token leaks into browser history, `Referer` headers, and share sheets; the
  room token is short-lived admission only, the resume token is the long-lived
  bearer and must never transit the URL.
- The manual fallback shows the **full** `http://<ip>:<port>` + room token — **no**
  bare short-code lookup (zero-infra has no resolver). *(UX-003, NET-010)*
- QR carries the join URL; an **optional second** Wi-Fi QR (Android
  `LocalOnlyHotspot` ephemeral creds) for the no-router two-step join.
- **Token/QR lifetime** *(RC2-QA-002, RC2-UX-001)*: the room token has a TTL
  (default **15 min**) and is auto-refreshed while the lobby is open; the QR shows a
  visible expiry/refresh indicator. An expired token returns `Error{code:
  ROOM_TOKEN_EXPIRED}` with a "rescan" action. SSID/IP/port shown as text for
  manual entry.

### 3.4 Lobby & seating contract *(UX-009)*
Table name; 2–6 seats; joined players; open/locked seats; bot seats; ready
indicators; start-button rules (host-only, min seats); late-join policy =
allowed until `GameStarted`, then **rejoin only** (via seat token). Duplicate-name
handling.

### 3.5 Command-state UX (move submission) *(UX-012)*
Per-state UI: `idle | myTurn | submitting | accepted | rejected(reason) | resyncing
| disconnected | retryDisabled`, driven by `MoveAccepted`/`MoveRejected{code}` from
Foundations. Out-of-turn/stale taps are disabled, not silently dropped.

### 3.6 Minimal reconnect (1A scope) *(WS-002, ARCH-009)*
Even in 1A, the client persists its `seatToken` and last `stateVersion`; on a
transient drop it reconnects and the host replies with a fresh `SeatSnapshot` or
`SeatExpired`. Full pause/AI/heartbeat policy is **1B**. Host loss in 1A → terminal
"Host disconnected — this game cannot continue" with return-home/start-new. *(UX-007)*

### 3.7 Game-over & rematch *(RC2-UX-002)*
When `phase === 'gameOver'`, the host broadcasts a `GameOver` event and all clients
show the podium/final standings (reusing the existing `Podium`). The host lobby
offers **Rematch** (same seats/settings → new match, host re-issues seat tokens,
clients transition `gameOver → lobby → live`) and **End table** (tears down the
server). **Guests are never stranded:** a browser guest on `gameOver` sees the
podium plus "Waiting for host to start a rematch…" and an explicit "Leave table"
action; if the host ends the table, guests get a clean terminal state with
return-home, not a dead socket. Late scans during `gameOver` get
`GAME_ALREADY_STARTED` with the rematch hint.

---

## 4. Phase 1A acceptance criteria (cluster J, 1A) *(QA-001🚫, PROD-001/002/003/005)*

Given/When/Then, all **offline (no internet)**:

1. **No internet:** with the host on an isolated LAN/hotspot, a full match starts
   and completes; no request leaves the LAN.
2. **Platform matrix (alpha):** Android host; guests = Android app, iOS app, laptop
   browser (Chrome + Safari), phone browser; **≥1 mixed 4-player** match. iOS host
   passes on **dev-client** only (not a GA gate).
3. **Pairing:** browser guest joins by scanning the QR within a target time; manual
   full-URL/token join succeeds; camera-denied falls back to manual.
4. **Seats:** 2–6 seats; bots fill empty seats; late join blocked after start,
   rejoin via token works.
5. **Rules over the wire:** legal moves apply; illegal/out-of-turn moves get the
   correct `MoveRejected{code}` and clear UI.
6. **Privacy:** no client receives another seat's cards in any payload (Foundations
   §4 oracle holds end-to-end).
7. **Host loss:** terminal state with actionable recovery copy.
8. **Regression:** existing single-device offline play unchanged (QA-009).

### 4.1 QA subset (1A) *(QA-002, QA-003, QA-007)*
- **Automation:** Jest for session/loopback, redaction, card rehydration, illegal-
  command rejection, reconnect-token handling; **Playwright** for `/join`, lobby,
  manual join, joined-game render against the **host-served** bundle.
- **CI harness for the host-served bundle** *(RC2-QA-001, blocker)*: the embedded
  HTTP+WS server logic is factored to run as a **headless Node host harness** that
  serves the same exported `dist-embedded` bundle and speaks the same protocol, so
  Playwright runs in CI **without a physical device**. CI flow: `expo export
  --platform web` → start the Node harness → Playwright drives a browser against it.
  On-device runs (real Android host) are a **supplementary** lab gate (§/1B lab),
  not the CI path. Without this harness the Playwright gate is not runnable in CI.
- **Release gates:** lint, tsc, Jest coverage, web export, Playwright, **Android
  prebuild/build**; iOS prebuild/build informational in alpha.
- Full device/network lab, failure taxonomy, and broader matrix are **1B**.

## 5. Phase 1A exit criteria
§1.6 (native host) + all §4 acceptance criteria pass on the alpha matrix, with the
1A QA subset automated and the native CI gate enforced.

## 6. Traceability
Resolves: ARCH-006, ARCH-009(reconnect-minimal); EXPO-001..007; BUILD-001..008;
WS-004; FE-001, FE-005(load-vs-WS split, with 1B), FE-006; NET-003, NET-012(host
lifecycle); UX-001, UX-002, UX-003🚫, UX-004, UX-007(1A host-loss), UX-008, UX-009,
UX-010, UX-012; PROD-001, PROD-002(1A half), PROD-003(1A criteria), PROD-005;
QA-001🚫(1A), QA-002(subset), QA-003(subset), QA-007.
**Round-2:** RC2-QA-001🚫 (CI harness), RC2-SEC-001 (token out of URL), RC2-UX-002
(game-over/rematch), RC2-EXPO-001/002/003 (embed guard, update channel, dev-client),
RC2-QA-002 & RC2-UX-001 (QR/token TTL).
