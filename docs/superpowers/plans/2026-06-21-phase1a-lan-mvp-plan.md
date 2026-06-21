# Phase 1A — LAN MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. **This plan contains a mandatory GATE (Task 1). A weak-model worker MUST stop at the GATE and hand back to a human/strong agent — do not invent the decision.**

**Goal (per D4 — Android-first alpha):** an **Android** device hosts a table;
**browser (laptop/phone) and native-app guests** join over the LAN and play one full
match **offline, zero-infra**. The host embeds an HTTP+WebSocket server and **serves
the web bundle itself**.

**Non-Goals (Phase 1A):** no reconnect/heartbeat/pause-AI policy (that is 1B), no
mDNS auto-discovery (1B), no host migration (deferred), no OTA of host-served assets
(in-binary only), no WebRTC/BLE. iOS hosting is dev-client-only and not a GA gate.

**Depends on:** Phase 0 (all contracts green). Do not start until
`2026-06-21-phase0-foundations-plan.md` Task 15 passes.

**Architecture:** The embedded server logic is written **once** as a transport-agnostic
module and run by two skins: (a) the **native host** (chosen in Task 1) and (b) a
**headless Node harness** for CI/Playwright. Both share the same protocol module
(Phase 0 `src/net/protocol.ts`), session (`src/net/session.ts`), asset allowlist, and
schema/size caps — divergence fails a shared conformance suite.

**Spec:** `docs/superpowers/specs/2026-06-20-local-multiplayer-phase1a-lan-mvp-design.md`.

---

## Task 1: 🚧 SPIKE GATE — native HTTP+WS server runtime (BLOCKS all of §3/§4)

Implements 1A §1.1 (ARCH-006, EXPO-001, WS-004, RC3-EXPO-002). **This is a decision +
proof task, not codeable from the spec.** A weak-model worker cannot do this; it
requires real device builds and a maintenance/license judgement.

**Exit of this gate = a recorded decision in `docs/superpowers/plans/decisions/2026-06-21-native-server-spike.md`.** Until that file exists with a chosen
option, every later task is blocked.

- [ ] **Step 1: Build the spike on real Android + iOS dev-client.** Prove:
  1. Bind one HTTP server to a LAN-reachable interface on a random high port; serve
     `/healthz`, the exported web bundle at `/`, static assets, and a `/ws` upgrade.
  2. A browser on another device loads `http://<host-ip>:<port>` and opens a
     same-origin `ws://`; a native-app guest connects to `ws://<host-ip>:<port>/ws`.
  3. `expo prebuild --clean` regenerates all native changes from `app.json`/config
     plugins (no hand-edited `ios/`/`android/`).
- [ ] **Step 2: Choose the server approach and RECORD it.** Pick exactly one:
  - **(a)** a named, maintained SDK 56 / RN 0.85-compatible socket library + any
    config plugin — record exact versions, last-release date, license, maintenance
    status; **or**
  - **(b)** commit to a **custom Expo Module** wrapping platform sockets
    (`Network.framework` / `NanoHTTPD`-style). **This expands 1A scope** (Tasks 2–4
    gain a native-module sub-plan) and is the expected fallback given library scarcity.
- [ ] **Step 3: Write the decision file** with: chosen option, versions/licence (or
  module scope), the prebuild-clean proof, screenshots/logs of the cross-device load,
  and the random-port/interface-bind evidence. Commit it.

```bash
git add docs/superpowers/plans/decisions/2026-06-21-native-server-spike.md
git commit -m "docs(net): record native HTTP+WS server spike decision (Phase 1A T1, ARCH-006)"
```

> **GATE:** Do not proceed to Task 2 until this file is committed. If option (b) was
> chosen, a human/strong agent must first expand Tasks 2–4 with the native-module steps;
> the weak-model worker resumes at the Node-harness/web tasks (Tasks 5–9), which are
> platform-independent.

---

## Task 2: Switch `web.output` to `"static"`

Implements 1A §1.3 (RC3-EXPO-001). `"single"` emits no hashed assets/manifest, which
breaks the hashed-serving + hash-guard. Switch to `"static"` and verify routes still load.

**Files:**
- Modify: `CoteccApp/app.json` (`expo.web.output`)

- [ ] **Step 1: Read the current web config**

Run: `cd CoteccApp && node -e "console.log(JSON.stringify(require('./app.json').expo.web, null, 2))"`
Expected: shows `"output": "single"` (or no output key).

- [ ] **Step 2: Set `web.output` to `"static"`**

In `CoteccApp/app.json`, under `expo.web`, set:
```json
"output": "static"
```

- [ ] **Step 3: Export and verify hashed assets + manifest exist**

Run:
```bash
cd CoteccApp && npx expo export --platform web --output-dir dist-embedded
ls dist-embedded && ls dist-embedded/_expo/static/js/web 2>/dev/null || find dist-embedded -name '*.js' | head
```
Expected: a multi-file export with hashed JS filenames and `index.html`. (For `"single"`
there would be one bundle and no hashed asset tree.)

- [ ] **Step 4: Smoke-test the static export loads the SPA routes**

Run:
```bash
cd CoteccApp && npx serve dist-embedded -l 8091 &
sleep 2 && curl -sf http://localhost:8091/ >/dev/null && echo "ROOT OK"
curl -sf http://localhost:8091/join >/dev/null && echo "JOIN ROUTE OK (SPA fallback)" || echo "NOTE: /join needs SPA fallback (Task 5)"
kill %1 2>/dev/null || true
```
Expected: `ROOT OK`. `/join` may 404 until the SPA-fallback serving in Task 5 — that's
expected at this step.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/app.json
git commit -m "feat(net): web.output=static for hashed assets/manifest (Phase 1A T2, RC3-EXPO-001)"
```

---

## Task 3: Web-bundle embedding pipeline + build-time hash guard

Implements 1A §1.3 (BUILD-001, EXPO-004, RC2-EXPO-001). Export → copy into the native
asset path → generate a manifest+hash → **fail the build** if the packaged bundle is
missing/stale.

**Files:**
- Create: `CoteccApp/scripts/embed-web-bundle.js` (export + hash manifest)
- Create: `CoteccApp/scripts/verify-embedded-bundle.js` (CI guard)
- Modify: `CoteccApp/package.json` (scripts)

> If Task 1 chose a custom Expo Module (option b), the "copy into native asset path"
> step is replaced by the module's asset bundling — a human/strong agent fills that in
> per the recorded decision. The export + hash-manifest + verify steps below are
> identical regardless.

- [ ] **Step 1: Write `embed-web-bundle.js`** — runs `expo export --platform web
  --output-dir dist-embedded`, then writes `dist-embedded/embed-manifest.json`
  containing `{ generatedAt, files: [{path, sha256}], bundleHash }` (a SHA-256 over the
  sorted per-file hashes). Use Node `crypto` + `fs` only (no new deps).
- [ ] **Step 2: Write `verify-embedded-bundle.js`** — re-exports to a temp dir, recomputes
  `bundleHash`, and **exits non-zero** if `dist-embedded/embed-manifest.json` is missing
  or its `bundleHash` differs. Print the mismatching files.
- [ ] **Step 3: Add scripts** to `package.json`:
```json
"embed:web": "node scripts/embed-web-bundle.js",
"embed:verify": "node scripts/verify-embedded-bundle.js"
```
- [ ] **Step 4: Verify locally**

Run:
```bash
cd CoteccApp && npm run embed:web && npm run embed:verify && echo "EMBED GUARD OK"
# tamper test:
echo " " >> dist-embedded/index.html && (npm run embed:verify && echo "BUG: guard passed on tampered bundle") || echo "GUARD CORRECTLY FAILED ON STALE BUNDLE"
npm run embed:web   # restore
```
Expected: `EMBED GUARD OK`, then `GUARD CORRECTLY FAILED ON STALE BUNDLE`.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/scripts/embed-web-bundle.js CoteccApp/scripts/verify-embedded-bundle.js CoteccApp/package.json
git commit -m "feat(net): web-bundle embed pipeline + build-time hash guard (Phase 1A T3, RC2-EXPO-001)"
```

---

## Task 4: Permissions, cleartext, dev-client deps, EAS profiles

Implements 1A §1.3, §2 (NET-003, EXPO-003/007, BUILD-003, UX-004). All expressed in
`app.json`/config plugins; `expo prebuild --clean` is the test.

**Files:**
- Modify: `CoteccApp/app.json` (android permissions, iOS usage strings, plugins)
- Create/Modify: `CoteccApp/eas.json` (development + preview profiles, `runtimeVersion.policy: "fingerprint"`)
- Modify: `CoteccApp/package.json` (add `expo-dev-client`, `expo-camera`, `expo-keep-awake`)

- [ ] **Step 1: Add deps** — `expo-dev-client`, `expo-camera`, `expo-keep-awake`
  (`npx expo install expo-dev-client expo-camera expo-keep-awake`).
- [ ] **Step 2: Android** — add `INTERNET`, `NEARBY_WIFI_DEVICES` (API 33+),
  `ACCESS_FINE_LOCATION` (older hotspot), `CHANGE_WIFI_STATE`, camera; add a cleartext
  **network-security-config** scoped to LAN/hotspot endpoints (config plugin).
- [ ] **Step 3: iOS** — `NSLocalNetworkUsageDescription`, `NSCameraUsageDescription`,
  ATS/local-network handling (leave `NSBonjourServices` for 1B mDNS).
- [ ] **Step 4: EAS profiles** — `development` (dev-client) + `preview`, each with
  `runtimeVersion: { policy: "fingerprint" }`.
- [ ] **Step 5: Document the permission UX matrix** (per permission: trigger, pre-prompt
  copy, OS purpose string, denial message, retry/Settings path, fallback) in
  `docs/superpowers/plans/decisions/2026-06-21-permission-ux-matrix.md` (UX-004).
- [ ] **Step 6: Verify prebuild is reproducible**

Run: `cd CoteccApp && npx expo prebuild --clean && echo "PREBUILD OK"`
Expected: regenerates `android/` (+ `ios/` on macOS) with no hand edits; `PREBUILD OK`.

- [ ] **Step 7: Commit** (do not commit generated `android/`/`ios/` — they are CNG output;
  confirm `.gitignore` excludes them).

```bash
git add CoteccApp/app.json CoteccApp/eas.json CoteccApp/package.json CoteccApp/package-lock.json docs/superpowers/plans/decisions/2026-06-21-permission-ux-matrix.md
git commit -m "feat(net): permissions, cleartext, dev-client, EAS profiles (Phase 1A T4, EXPO-003)"
```

---

## Task 5: Headless Node host harness (CI path) + static-serving contract

Implements 1A §4.1 (RC2-QA-001 blocker, RC3-QA-001), §1.2 (FE-006). The embedded server
logic, runnable in CI without a device. **This is fully weak-model executable** (pure
Node + Phase 0 modules).

**Files:**
- Create: `CoteccApp/harness/nodeHost.ts` (HTTP + `ws` server using `src/net/*`)
- Create: `CoteccApp/harness/assetAllowlist.ts` (shared allowlist + MIME + SPA fallback)
- Create: `CoteccApp/harness/nodeHost.test.ts`
- Modify: `CoteccApp/package.json` (add `ws` devDep + `harness:start` script)

- [ ] **Step 1: Write the failing test** — start `nodeHost` serving `dist-embedded`,
  assert: `GET /healthz` → 200; `GET /` → 200 `text/html`; `GET /<hashed>.js` →
  `application/javascript`; `GET /join` → 200 (SPA fallback to index.html); `GET
  /../package.json` (path traversal) → 403/404; a `ws://` upgrade connects and echoes a
  decoded `Heartbeat` envelope.
- [ ] **Step 2: Run to verify it fails** (`npm test -- nodeHost`) — module not found.
- [ ] **Step 3: Implement `assetAllowlist.ts`** — map extension→MIME; only serve files
  under `dist-embedded`; resolve+reject path traversal; SPA fallback (`/join`, `/game`,
  unknown non-asset → `index.html`).
- [ ] **Step 4: Implement `nodeHost.ts`** — Node `http` + `ws`; route `/healthz`, static
  via allowlist, `/ws` upgrade → wrap each socket as a `ClientConnection`, decode frames
  with `decodeEnvelope` (Phase 0 T10), drive a `GameSession` (Phase 0 T12); enforce body/
  message size caps and a per-peer connection cap.
- [ ] **Step 5: Run tests** (`npm test -- nodeHost`) → PASS.
- [ ] **Step 6: Commit**

```bash
git add CoteccApp/harness CoteccApp/package.json CoteccApp/package-lock.json
git commit -m "feat(net): headless Node host harness + static-serving contract (Phase 1A T5, RC2-QA-001)"
```

---

## Task 6: Harness↔native fidelity conformance suite

Implements 1A §4.1 (RC3-QA-001). A shared conformance suite that both the Node harness
and (when available) the native host must pass, so divergence fails CI.

**Files:**
- Create: `CoteccApp/harness/conformance.shared.ts` (assertions: protocol handshake,
  asset allowlist behaviour, size caps, reject codes)
- Create: `CoteccApp/harness/conformance.node.test.ts` (runs the shared suite vs `nodeHost`)

- [ ] **Step 1:** Write `conformance.shared.ts` exporting `runConformance(baseUrl, wsUrl)`
  asserting the same protocol/allowlist/caps behaviour described in T5.
- [ ] **Step 2:** Write `conformance.node.test.ts` that boots `nodeHost` and calls
  `runConformance`. Run → PASS.
- [ ] **Step 3:** Add a `// TODO(phase1a-native): conformance.native.e2e.ts runs the same
  suite against the on-device host` marker (the native run is a lab gate, not CI).
- [ ] **Step 4: Commit**

```bash
git add CoteccApp/harness/conformance.shared.ts CoteccApp/harness/conformance.node.test.ts
git commit -m "test(net): harness↔native fidelity conformance suite (Phase 1A T6, RC3-QA-001)"
```

---

## Task 7: `/join` route, pairing descriptor, minimal address selection

Implements 1A §3.2, §3.3 (UX-001/002/010, FE-001, RC2-SEC-001, RC3-ARCH-001/UX-003).
Join URL carries **only** the room token; the resume `seatToken` is issued post-join
inside `SeatAssigned`. **Weak-model executable** (expo-router + UI).

**Files:**
- Create: `CoteccApp/app/join.tsx` (expo-router route → `JoinScreen`)
- Create: `CoteccApp/src/screens/JoinScreen.tsx` + test
- Create: `CoteccApp/src/net/pairing.ts` (`buildJoinUrl`, `parseJoinUrl`, room-token TTL) + test
- Create: `CoteccApp/src/net/addressSelect.ts` (minimal single-correct-candidate) + test

- [ ] **Step 1 (pairing, TDD):** `buildJoinUrl({ip, port, roomToken})` →
  `http://<ip>:<port>/join?room=<roomToken>`; `parseJoinUrl` round-trips; **assert the
  `seatToken` is never present in the URL** (RC2-SEC-001); room token TTL default
  **15 min**, expired → `ROOM_TOKEN_EXPIRED`. Tests first, then implement.
- [ ] **Step 2 (address selection, TDD):** `pickReachableAddress(interfaces)` prefers the
  active serving interface when **Wi-Fi + hotspot are both active**, returns one primary
  + `alternates[]` for manual entry. Cover the dual-interface case so a one-interface
  bench can't mask it (RC3-ARCH-001). Full Wi-Fi/VPN/IPv6 algorithm is 1B §1.4.
- [ ] **Step 3 (`/join` route):** `JoinScreen` reads `?room=` (via existing
  `src/utils/searchParams.ts`), collects display name/language, shows connecting →
  lobby; a dedicated route so a guest never falls into the local-only Home setup
  (UX-010). Manual-entry fallback shows full `http://<ip>:<port>` + room token (no bare
  short code) and a **re-enter** action for camera-less guests (RC3-UX-003).
- [ ] **Step 4:** Tests for `JoinScreen` (renders join form, shows manual fallback, blocks
  empty name). Run all → PASS.
- [ ] **Step 5: Commit**

```bash
git add CoteccApp/app/join.tsx CoteccApp/src/screens/JoinScreen.tsx CoteccApp/src/screens/JoinScreen.test.tsx CoteccApp/src/net/pairing.ts CoteccApp/src/net/pairing.test.ts CoteccApp/src/net/addressSelect.ts CoteccApp/src/net/addressSelect.test.ts
git commit -m "feat(net): /join route, pairing descriptor, minimal address selection (Phase 1A T7, RC2-SEC-001)"
```

---

## Task 8: Lobby & seating, command-state UX, game-over/rematch

Implements 1A §3.1, §3.4, §3.5, §3.7 (UX-008/009/012, RC2-UX-002). **Weak-model
executable** (UI + session wiring; reuses the existing `Podium`).

**Files:**
- Create: `CoteccApp/src/screens/LobbyScreen.tsx` + test
- Modify: `CoteccApp/src/screens/HomeScreen.tsx` ("Host LAN table" entry → table settings)
- Create: `CoteccApp/src/net/hostController.ts` (lobby state: open/lock seats, bots, kick, start) + test

- [ ] **Step 1 (host controller, TDD):** table name; 2–6 seats; open/locked seats; bot
  seats fill empty seats; ready indicators; start rule (host-only, min seats); late-join
  = allowed until `GameStarted`, then **rejoin only** via seat token; duplicate-name
  handling. Control matrix (start/lock/add-bot/kick = host-only; play card = seat owner).
- [ ] **Step 2 (command-state UX, TDD):** a `MoveSubmitState` machine
  `idle|myTurn|submitting|accepted|rejected(reason)|resyncing|disconnected|retryDisabled`
  driven by `MoveAccepted`/`MoveRejected{code}`; out-of-turn/stale taps **disabled**, not
  silently dropped (UX-012).
- [ ] **Step 3 (game-over/rematch, TDD):** on `phase==='gameOver'` show podium + final
  standings (reuse `Podium`); host lobby offers **Rematch** (same seats/settings, host
  re-issues seat tokens, clients `gameOver → lobby → live`) and **End table** (teardown);
  browser guest sees podium + "Waiting for host…" + explicit **Leave table**, never a
  dead socket; late scan during `gameOver` → `GAME_ALREADY_STARTED` + rematch hint
  (RC2-UX-002).
- [ ] **Step 4:** Tests for lobby render, seat lock/bot/kick, start-button rule,
  game-over/rematch transitions. Run all → PASS.
- [ ] **Step 5: Commit**

```bash
git add CoteccApp/src/screens/LobbyScreen.tsx CoteccApp/src/screens/LobbyScreen.test.tsx CoteccApp/src/screens/HomeScreen.tsx CoteccApp/src/net/hostController.ts CoteccApp/src/net/hostController.test.ts
git commit -m "feat(net): lobby/seating, command-state UX, game-over/rematch (Phase 1A T8, RC2-UX-002)"
```

---

## Task 9: Playwright E2E against the host-served bundle + minimal 1A reconnect

Implements 1A §4.1, §3.6 (QA-002/003, WS-002). Playwright drives a browser against the
**Node harness** serving the real exported bundle. **Weak-model executable.**

**Files:**
- Create: `CoteccApp/e2e/playwright.config.ts`
- Create: `CoteccApp/e2e/join.spec.ts`, `e2e/lobby.spec.ts`, `e2e/game.spec.ts`
- Modify: `CoteccApp/package.json` (add `@playwright/test` devDep + `e2e` script)
- Modify: `CoteccApp/src/net/session.ts` (add `snapshotForResume(seatToken)` → `SeatSnapshot | SeatExpired`)

- [ ] **Step 1 (minimal reconnect, TDD in Jest):** session persists `seatToken` + last
  `stateVersion`; on a transient drop the client reconnects and the host replies with a
  fresh `SeatSnapshot` or `SeatExpired`. Host loss → terminal "Host disconnected" state
  (UX-007). Full pause/AI/heartbeat is 1B.
- [ ] **Step 2 (Playwright config):** webServer = `expo export --platform web` then start
  the Node harness on a fixed port; baseURL points at it.
- [ ] **Step 3 (specs):** `join.spec` (scan-equivalent deep link + manual entry +
  camera-denied fallback), `lobby.spec` (seat/lock/start), `game.spec` (legal move
  applies; illegal/out-of-turn → correct `MoveRejected` + clear UI; game-over/rematch).
- [ ] **Step 4: Run**

Run: `cd CoteccApp && npm run e2e`
Expected: all specs PASS against the host-served bundle.

- [ ] **Step 5: Commit**

```bash
git add CoteccApp/e2e CoteccApp/package.json CoteccApp/package-lock.json CoteccApp/src/net/session.ts
git commit -m "test(net): Playwright E2E on host-served bundle + minimal reconnect (Phase 1A T9, QA-002)"
```

---

## Task 10: CI release gates + criterion→layer mapping

Implements 1A §4.1, §1.5 (QA-007, BUILD-005/006, RC3-QA-002). Wire the guardrails into CI.

**Files:**
- Modify: `.github/workflows/*` (add jobs: lint, tsc, jest+coverage, `embed:verify`,
  web export, Playwright, **Android prebuild/build**; iOS prebuild/build informational)
- Create: `docs/superpowers/plans/decisions/2026-06-21-criterion-test-layer-map.md`

- [ ] **Step 1:** Add a `build-native` job triggered on changes to native/config/plugin
  paths: runs `expo export` → `embed:verify` (packaged-asset + hash assertion) → Android
  prebuild/build. iOS prebuild/build informational in alpha (D4).
- [ ] **Step 2:** Add a `web-e2e` job: `expo export --platform web` → start Node harness →
  Playwright. This is the CI acceptance path (no device).
- [ ] **Step 3:** Record the **criterion → test-layer map** (1A §4.1 table) so "CI green"
  maps to "acceptance covered": criteria 1/4/5/6 = Jest + Playwright-on-harness; 3/7 +
  game-over/rematch = Playwright-on-harness; 2 + hotspot + real host-loss = physical lab
  (1B §4); 8 = existing Jest + screenshot smoke.
- [ ] **Step 4: Verify CI config parses**

Run: `git add -A && git status` and confirm the workflow YAML is valid (e.g. `npx
yaml-lint .github/workflows/*.yml` or push to a draft PR and watch the run).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows docs/superpowers/plans/decisions/2026-06-21-criterion-test-layer-map.md
git commit -m "ci(net): release gates + criterion→layer map (Phase 1A T10, RC3-QA-002)"
```

---

## Task 11: Phase 1A exit-gate verification

Implements 1A §5. Confirm §1.6 + all §4 acceptance criteria on the alpha matrix.

- [ ] **Step 1 (CI-coverable):** `npm test` (incl. reconnect/redaction/illegal-command),
  `npm run lint`, `npx tsc --noEmit`, `npm run embed:verify`, `npm run e2e` — all PASS.
- [ ] **Step 2 (lab GATE — human):** on the **physical** alpha matrix (Android host;
  guests = Android app, iOS app, Chrome+Safari laptop, phone browser; ≥1 mixed 4-player
  match; iOS host on dev-client only): no-internet match completes; QR scan + manual join
  succeed; privacy oracle holds end-to-end; host-loss shows actionable copy. Record
  pass/fail evidence per cell (this feeds the 1B falsifiable lab).
- [ ] **Step 3:** Confirm the §4 checklist (1–8) each maps to a passing layer per Task 10.
- [ ] **Step 4: Commit any artifacts**

```bash
git add -A && git commit -m "chore(net): Phase 1A exit-gate verification (Phase 1A T11)" || echo "nothing to commit"
```

---

## Notes for reviewers
- Task 1 is a hard GATE; Tasks 5–10 (Node harness, web, CI) are platform-independent and
  weak-model executable even before the native runtime exists — they run against the
  exported bundle, so progress is not fully blocked on the spike.
- The native on-device run (real Android host) is a **lab gate** (Task 11 Step 2 / 1B §4),
  not a CI path — called out so "CI green" is never mistaken for "device-verified".
