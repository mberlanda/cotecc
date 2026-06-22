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

> **GATE — explicit resume rules (no ambiguity):**
> - The decision file MUST be committed before ANY further work.
> - **Once it is committed**, a weak-model worker MAY immediately start **Tasks 5, 6, 9,
>   10** (Node-harness / static-serving / Playwright / CI) — these run against the
>   exported web bundle and are platform-independent, so they are NOT blocked on the
>   native runtime.
> - **Tasks 2, 3, 4, 7, 8, 11** depend on the chosen option. If option (a) (library),
>   proceed normally. If option (b) (custom Expo Module), a human/strong agent must first
>   expand Tasks 3 & 4 with the native-module bundling steps; the weak worker does not
>   start 3/4 until that expansion exists.
> - Tasks may run in either order within those groups, but **Task 11 (exit gate) is last.**

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

> First confirm `dist-embedded/` is gitignored (it must be, so the export tree is never
> committed): `git -C CoteccApp check-ignore dist-embedded` should print the path. If not,
> add `dist-embedded/` to `CoteccApp/.gitignore` before exporting.

Run:
```bash
cd CoteccApp && npx expo export --platform web --output-dir dist-embedded
# DISTINGUISH static from single: "single" ALSO emits _expo/static/js/web/*.js, so an
# ls is not enough. "static" mode populates metadata.json fileMetadata + per-route html.
node -e "const m=require('./dist-embedded/metadata.json'); const n=Object.keys(m.fileMetadata||{}).length; if(!n){console.error('NOT static: empty fileMetadata');process.exit(1)} console.log('static OK, routed outputs:', n)"
```
Expected: `static OK, routed outputs: <n>` with n ≥ 1. (In `"single"` mode `fileMetadata`
is empty `{}` and this exits non-zero.)

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

- [ ] **Step 1: Write `embed-web-bundle.js`** (concrete — load-bearing details: recursive
  walk, exclude the manifest itself, `generatedAt` is OUTSIDE the hash, hex sha256, sort
  by path, `bundleHash = sha256(join of "<path>:<filehash>")`):

```js
// CoteccApp/scripts/embed-web-bundle.js
const {execSync} = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Guard: Metro/expo-export output can differ across Node majors; the repo pins Node 22.
if (parseInt(process.versions.node, 10) < 22) {
  console.error(`requires Node >= 22 (see .nvmrc); running ${process.version}`);
  process.exit(1);
}

const DIST = path.join(__dirname, '..', 'dist-embedded');
const MANIFEST = path.join(DIST, 'embed-manifest.json');

const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

const buildManifest = () => {
  const files = walk(DIST)
    .filter(p => p !== MANIFEST) // never hash the manifest itself
    .map(p => ({path: path.relative(DIST, p).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(p))}))
    .sort((a, b) => a.path.localeCompare(b.path));
  // bundleHash is OVER the files only — generatedAt is excluded so re-runs are stable.
  const bundleHash = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n'));
  return {files, bundleHash};
};

execSync('npx expo export --platform web --output-dir dist-embedded', {stdio: 'inherit', cwd: path.join(__dirname, '..')});
const {files, bundleHash} = buildManifest();
fs.writeFileSync(MANIFEST, JSON.stringify({generatedAt: new Date().toISOString(), bundleHash, files}, null, 2));
console.log(`embed-manifest.json written: ${files.length} files, bundleHash ${bundleHash}`);
```

- [ ] **Step 2: Write `verify-embedded-bundle.js`** — recompute over the EXISTING
  `dist-embedded` (no re-export needed; CI runs `embed:web` first) and exit non-zero on
  missing/stale:

```js
// CoteccApp/scripts/verify-embedded-bundle.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist-embedded');
const MANIFEST = path.join(DIST, 'embed-manifest.json');

if (!fs.existsSync(MANIFEST)) {
  console.error('FAIL: dist-embedded/embed-manifest.json missing — run npm run embed:web');
  process.exit(1);
}
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const recorded = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const files = walk(DIST)
  .filter(p => p !== MANIFEST)
  .map(p => ({path: path.relative(DIST, p).split(path.sep).join('/'), sha256: sha256(fs.readFileSync(p))}))
  .sort((a, b) => a.path.localeCompare(b.path));
const bundleHash = sha256(files.map(f => `${f.path}:${f.sha256}`).join('\n'));
if (bundleHash !== recorded.bundleHash) {
  const recMap = new Map(recorded.files.map(f => [f.path, f.sha256]));
  files.filter(f => recMap.get(f.path) !== f.sha256).forEach(f => console.error(`  changed/new: ${f.path}`));
  recorded.files.filter(f => !files.find(x => x.path === f.path)).forEach(f => console.error(`  removed: ${f.path}`));
  console.error(`FAIL: bundle hash mismatch (recorded ${recorded.bundleHash}, actual ${bundleHash})`);
  process.exit(1);
}
console.log('OK: embedded bundle matches manifest');
```
- [ ] **Step 3: Add scripts** to `package.json`:
```json
"embed:web": "node scripts/embed-web-bundle.js",
"embed:verify": "node scripts/verify-embedded-bundle.js"
```
- [ ] **Step 4: Verify locally**

Run:
```bash
cd CoteccApp && npm run embed:web && npm run embed:verify && echo "EMBED GUARD OK"
# tamper case A — HTML:
echo " " >> dist-embedded/index.html && (npm run embed:verify && echo "BUG: passed on tampered HTML") || echo "GUARD OK: HTML tamper caught"
npm run embed:web
# tamper case B — a hashed JS asset (proves the hash covers the whole tree, not just HTML):
JS=$(find dist-embedded -name '*.js' | head -1); [ -n "$JS" ] || { echo "ERROR: no .js in dist-embedded"; exit 1; }
echo "//x" >> "$JS" && (npm run embed:verify && echo "BUG: passed on tampered JS") || echo "GUARD OK: JS tamper caught"
npm run embed:web
# tamper case C — missing manifest:
rm dist-embedded/embed-manifest.json && (npm run embed:verify && echo "BUG: passed with no manifest") || echo "GUARD OK: missing manifest caught"
npm run embed:web   # restore
```
Expected: `EMBED GUARD OK`, then three `GUARD OK:` lines.

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
  > **Prerequisite (resolves review finding):** Phase 0's `GameSession` exposes only
  > `viewFor`/`submitMove` — it has **no join / seat-assignment / connection→seat binding**.
  > Before Step 4, add those to `GameSession` (do this here, in Task 5): `join(connId,
  > {displayName}) → {seatId, seatToken}` (assigns/locks a seat, returns the resume token),
  > `bind(connId, seatId, seatToken)` (validates the token, maps the connection to the
  > seat; rejects bad token with `BAD_SEAT_TOKEN`), and `seatForConn(connId)`. `nodeHost`
  > routes each decoded `PlayMove` through `seatForConn(connId)` so the seat is derived
  > from the bound connection, never from the payload (SEC-002). Add Jest tests for
  > join/bind/duplicate-token in `harness/nodeHost.test.ts` (or extend `net/session.test.ts`).
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
- [ ] **Step 2 (address selection, TDD — minimal, pinned algorithm):**
  `pickReachableAddress(interfaces, opts?)` where `interfaces` has the shape of Node
  `os.networkInterfaces()` (`Record<name, {address, family, internal}[]>`). Minimal rule
  (full Wi-Fi/VPN/IPv6 algorithm deferred to 1B §1.4): (1) drop `internal` and non-`IPv4`
  entries; (2) if `opts.boundInterface` is given, the primary is that interface's IPv4;
  (3) else if any interface name matches `/ap|hotspot|swlan|tether/i`, prefer it (a
  hotspot is the active serving net); (4) else primary = the first remaining IPv4;
  (5) return `{primary, alternates: <all other candidate IPv4s>}`. Test the
  **Wi-Fi + hotspot both active** case explicitly so a one-interface bench can't mask it
  (RC3-ARCH-001).
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

- [ ] **Step 1 (host controller, TDD — pinned decisions):** table name; seat count
  **2–6** (min to start = **2**); open/locked seats; bot seats fill empty seats; ready
  indicators; start rule = **host-only AND ≥2 seats occupied (human or bot)**; late-join
  = allowed until `GameStarted`, then **rejoin only** via seat token. **Duplicate-name
  policy (pinned): auto-suffix** — a second "Ann" becomes "Ann (2)" (deterministic,
  never rejects a join for a name clash; seat identity is the `seatId`, not the name).
  Control matrix (start/lock/add-bot/kick = host-only; play card = seat owner only).
  **Guest view of host-only controls (pinned, UX-012):** render them `disabled` (grayed,
  visible — not hidden), `accessibilityState={{disabled:true}}`; a guest tap does nothing
  and does not navigate (no silent drop, no hidden control).
- [ ] **Step 2 (command-state UX, TDD):** a `MoveSubmitState` machine
  `idle|myTurn|submitting|accepted|rejected(reason)|resyncing|disconnected|retryDisabled`
  driven by `MoveAccepted`/`MoveRejected{code}`. **Transitions (pinned):** `myTurn`→
  `submitting` on tap; →`accepted` on `MoveAccepted`; on `MoveRejected{code}`: if
  `code==='MUST_FOLLOW_SUIT'|'CARD_NOT_IN_HAND'` →`rejected(reason)` then back to `myTurn`
  (player can pick a legal card); if `code==='STALE_STATE'` →`resyncing`; if
  `code==='NOT_YOUR_TURN'|'GAME_OVER'` →`retryDisabled` (retrying can't help — input
  locked until next `SeatSnapshot`/turn); on socket drop →`disconnected`. Out-of-turn/stale
  taps are **disabled, not silently dropped**.
- [ ] **Step 3 (game-over/rematch, TDD):** on `phase==='gameOver'` show podium + final
  standings (reuse `Podium`); host lobby offers **Rematch** (same seats/settings, host
  re-issues seat tokens, clients `gameOver → lobby → live`) and **End table** (teardown);
  browser guest sees podium + a "waiting for rematch" message + explicit **Leave table**,
  never a dead socket; late scan during `gameOver` → `GAME_ALREADY_STARTED` + rematch hint
  (RC2-UX-002). **i18n (pinned):** add keys to `en.ts`/`es.ts`/`it.ts` — `hostLanTable`,
  `rematch`, `endTable`, `leaveTable`, `waitingForRematch`, `hostDisconnected`; no hardcoded
  copy in components. If the WS closes while in gameOver/waiting, fall to the §3.6 terminal
  "Host disconnected" state (do not leave a spinner). Add `testID`s for Playwright.
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

> **Do NOT add a new parallel Android job (resolves review BLOCKER).** `build-release.yml`
> already has a `verify-android` job gated by the `build-native` PR label and an
> `attach-artifacts` job with `needs: [release-please, verify-android, verify-web]`. Adding
> a second `build-native` job would duplicate native logic and break that `needs:` chain.
> **Augment the existing `verify-android` job instead.** Read `.github/workflows/build-release.yml`
> and `app-build.yml` before editing.

**Files:**
- Modify: `.github/workflows/build-release.yml` (augment `verify-android`), `app-build.yml` (web-e2e)
- Modify: `CoteccApp/package.json` (add `"typecheck": "tsc --noEmit"`)
- Create: `docs/superpowers/plans/decisions/2026-06-21-criterion-test-layer-map.md`

- [ ] **Step 0:** Add `"typecheck": "tsc --noEmit"` to `CoteccApp/package.json` scripts (no
  such script exists today; CI steps must use it or `npx tsc --noEmit` directly).
- [ ] **Step 1:** **Augment the existing `verify-android` job** in `build-release.yml`: insert
  two steps immediately before its `Prebuild android` step — (a) `npx expo export --platform
  web --output-dir dist-embedded`, (b) `npm run embed:verify` (packaged-asset + hash
  assertion). Do not create a new job; keep the `build-native` label gate and the
  `attach-artifacts` `needs:` chain intact. iOS prebuild/build informational in alpha (D4).
- [ ] **Step 2:** Add a `web-e2e` job (in `app-build.yml`, alongside the existing
  `web-docker-image` smoke): `npm run embed:web` → start Node harness → Playwright. This is
  the CI acceptance path (no device). Reuse the existing screenshot-smoke pattern from
  `web-docker-image` (or add an `assert:web-render` step) so **criterion 8's screenshot
  layer is actually wired**, not just mapped (closes tracked T-screenshot).
- [ ] **Step 3:** Record the **criterion → test-layer map** (1A §4.1 table) so "CI green"
  maps to "acceptance covered": criteria 1/4/5/6 = Jest + Playwright-on-harness; 3/7 +
  game-over/rematch = Playwright-on-harness; 2 + hotspot + real host-loss = physical lab
  (1B §4); 8 = existing Jest + the wired screenshot smoke (Step 2).
- [ ] **Step 4: Verify CI config parses (deterministic)**

Run: `cd CoteccApp && npx --yes yaml-lint ../.github/workflows/*.yml && echo "YAML OK"`
Expected: exit 0, `YAML OK`. (Watching the actual job run on a draft PR is a human check
deferred to Task 11, not this step.)

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
