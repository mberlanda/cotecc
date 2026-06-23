# Phase 1A — criterion → test-layer map (RC3-QA-002)

**Date:** 2026-06-23 · Decision record for Phase 1A Task 10 (CI release gates).

Each Phase 1A §4.1 acceptance criterion is assigned the concrete layer that proves it,
so **"CI green" maps to "acceptance covered"** and the gaps that need device labs or
not-yet-built UI are explicit rather than implied.

## The map

| § | Criterion | Proving layer | Status |
|---|---|---|---|
| 1 | No-internet full match | Jest (engine/session) + Playwright on harness | ⚙️ harness/session automated; full in-game flow lands with T7/T8 UI |
| 2 | Platform matrix (alpha devices) | **Physical lab (1B §4)** | 🔬 lab gate — not a CI path (Task 11 Step 2) |
| 3 | Pairing (QR / manual / camera-denied) | Playwright on harness | ⏳ specs authored as `fixme` (e2e/join.spec.ts); green when T7 `/join` exists |
| 4 | Seats 2–6 / bots / late-join + rejoin | Jest (session join/bind/seatForConn) + Playwright | ⚙️ session-layer automated (`session.test.ts`); lobby UI = T8 |
| 5 | Rules over the wire (legal applies; illegal/out-of-turn rejected) | Jest (applyMove/session) + Playwright on harness | ⚙️ engine/session + harness reject-code conformance automated; in-game UI = T8 |
| 6 | Privacy / no-leak | Jest redaction oracle + fuzz (`seatView`) | ✅ automated (Phase 0) |
| 7 | Host loss → terminal recovery copy | Playwright on harness | ⏳ `fixme` (needs T8 UI); host-side `SeatExpired`/snapshot is automated (T9) |
| 8 | Offline regression unchanged | existing Jest + the wired Playwright render smoke | ✅ automated — `web-e2e` job runs `e2e/smoke.spec.ts` which asserts the host-served bundle hydrates the SPA shell |

Game-over / rematch (§3.7, RC2-UX-002) shares the Playwright-on-harness layer with
criterion 3/7 and is authored as `fixme` in `e2e/game.spec.ts` pending T8.

## Where each layer runs in CI

- **Jest (unit/integration + coverage floors):** `app-build.yml` → `unit-tests` job
  (`npm run lint`, `npm run typecheck`, `npm run test -- --coverage`). Includes the
  `harness/` Node-host + conformance suites and `src/net/` session/redaction tests.
- **Playwright on the host-served bundle:** `app-build.yml` → `web-e2e` job
  (`npm run embed:web` → `npm run e2e`; the Playwright `webServer` boots the Node host
  harness). This is the device-free acceptance path (QA-002/003). The smoke spec is
  also criterion 8's render layer (wired, not just mapped).
- **Embedded-bundle hash guard:** `build-release.yml` → `verify-android` job runs
  `npm run embed:web && npm run embed:verify` immediately before `expo prebuild`, so a
  native binary can never ship without / with a stale web bundle (BUILD-001).
- **Native build:** `verify-android` (APK) is the enforced native gate; `verify-ios` is
  informational in alpha (D4).

## Explicitly NOT covered by CI (lab gates, Task 11 Step 2 / 1B §4)

- Criterion 2 (real Android host + iOS/Android/laptop/phone guests on a physical net).
- Hotspot / isolated-LAN reachability and real socket-drop host-loss on hardware.
- The native on-device run of `runConformance` (`harness/conformance.shared.ts`) against
  the on-device host — same assertions, lab-driven (`TODO(phase1a-native)`).

These are recorded so a green CI run is never mistaken for device-verified acceptance.
