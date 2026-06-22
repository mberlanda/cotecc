# Plan Review — Round 2 (project agent team) findings & resolutions

**Date:** 2026-06-22 · Reviewed by the project agents in `.claude/agents/` (run as their
personas): **cotecc-principal-architect**, **cotecc-senior-gameplay-engineer**,
**cotecc-qa-regression-lead**, **cotecc-release-tooling-engineer**,
**cotecc-ux-accessibility-reviewer**.

Every reviewer's verdict was **FIX-THEN-SHIP** (none BLOCKED). Notably, two reviewers
independently caught that several **round-1 items were marked "resolved" but the
referenced task did not contain the work** — those are corrected here honestly.

## Correction to the round-1 resolutions doc
- **R3-2 (SSE+POST) was NOT actually resolved.** Round 1 claimed it landed in 1A T5, but
  1A T5 only implements `/ws`, and the parent connectivity-design.md §7 assigns SSE+POST
  parity to **Phase 1B**. **Now fixed:** added **Phase 1B Task 5b** (real SSE+POST adapter
  + WS-parity conformance), and corrected the P0 T12 note to point at 1B T5b.
- **T-redaction-allmsgs was NOT actually closed.** Round 1 said "T11 note requires it," but
  T11's test was type-shape only. **Now fixed:** P0 T11 Step 3b adds a structural
  `cardRefsIn` oracle over encoded `StateDelta`/`LobbyUpdated`.

## Fixed inline (this round)

| # | Sev | Reviewer | Finding | Fix |
|---|---|---|---|---|
| A-B1 | BLOCKER | architect | SSE+POST parity had no implementing task; contradicted parent spec phase placement | Added **1B Task 5b** (SSE `GET /events` + `POST /commands`, `Last-Event-ID` resume, idempotent `clientMessageId`, shared-conformance parity); corrected P0 T12 note |
| R-B1 | BLOCKER | release | `dist-embedded/` not gitignored → weak worker would commit the export tree | Added `dist-embedded/` to `CoteccApp/.gitignore`; added a check step to 1A T2 |
| R-B2 | BLOCKER | release | 1A T10 "add build-native job" would duplicate `verify-android` and break the `attach-artifacts` `needs:` chain | T10 rewritten to **augment the existing `verify-android` job** (embed steps before prebuild); keep label gate + needs chain |
| Q-RC1 | MAJOR | qa | `loopback.ts` had no test → fails the `src/net/` 90% per-dir floor | Added `loopback.test.ts` (send both directions, onClient, onClose) to P0 T12 Step 5b |
| A-M1/Q-RC2 | MAJOR | architect, qa | redaction oracle absent for `StateDelta`/`LobbyUpdated` | P0 T11 Step 3b: structural `cardRefsIn` assertion over encoded delta + lobby payloads |
| R-M1 | MAJOR | release | 1A T2 verification couldn't distinguish `static` from `single` (both emit `_expo/static/js/web/*.js`) | T2 now checks `metadata.json fileMetadata` is non-empty |
| R-M3 | MAJOR | release | embed scripts run on whatever Node is active (dev box is 18, repo pins 22) | Added a Node ≥22 guard at the top of `embed-web-bundle.js` |
| R-M4 | MAJOR | release | tamper-case-B `$JS` could be empty → `>> ""` creates junk, test passes | Added `[ -n "$JS" ] || exit 1` guard |
| Q-RC3/T-screenshot | MAJOR | qa | criterion-8 screenshot smoke mapped but not wired into CI | 1A T10 Step 2 now wires the existing `assert:web-render`/screenshot pattern into `web-e2e` |
| G-T5 | MAJOR | gameplay | `applyMove` blanket-mapped all `validateMove` throws to `MUST_FOLLOW_SUIT` | T5 catch now maps by message (`/respect/i` → suit, else turn) |
| Q-N4 | MINOR | qa | idempotency test didn't prove the move wasn't mis-applied to another seat | T12 test now also asserts `s2` hand length unchanged |
| R-m1 | MINOR | release | CI referenced `tsc` but no script exists | 1A T10 Step 0 adds `"typecheck":"tsc --noEmit"` |
| U-F1 | HIGH(ux) | ux | `graceUntil` "no local deadline math" was ambiguous (weak model may not tick the clock) | 1B T4 Step 1: concrete `Math.ceil((graceUntil-Date.now())/1000)` + `setInterval`/`clearInterval` rule |
| U-F4 | MED(ux) | ux | guest view of host-only controls undefined (hide vs disable vs silent-reject) | 1A T8 Step 1: render **disabled (visible)**, `accessibilityState`, no nav on tap |
| U-F5 | MED(ux) | ux | `retryDisabled` state had no transition definition | 1A T8 Step 2: pinned per-`MoveRejected.code` transitions |
| U-F3(part) | MED(ux) | ux | new LAN strings would be hardcoded English | 1A T8 Step 3: enumerated i18n keys (`hostLanTable`/`rematch`/`endTable`/`leaveTable`/`waitingForRematch`/`hostDisconnected`) + dead-socket fallback |

## Tracked (do before the relevant task; not blocking Phase 0 start)

| # | Sev | Reviewer | Finding | Concrete fix when reached |
|---|---|---|---|---|
| A-M2/Q-RH4 (was T-events) | MAJOR | architect, qa | `MoveResult`/`submitMove` return no `events`, so `StateDelta` (T11) has no producer and the 1B move-log (T1) would be empty | **Before 1B T1**, change `applyMove` to return `{ok:true; events: StateDeltaEvent[]}` and have `GameSession.submitMove` surface them; update golden frames. Pull into Phase 0 if delta emission is needed earlier. |
| A-M4 (was T-pasttricks) | MAJOR | architect | `SeatView` omits `pastTricks`/`turnId`; `currentTrick` resets at trick end so a client can't render the just-won trick | Add `pastTricks: PublicTrick[]` (project `round.pastTurns` → revealed cards) + `turnId` to the P0 `SeatView` and the redaction oracle, **when the in-game UI is built (1A T8)** — add the oracle step there. |
| A-M3/G | MAJOR | architect, gameplay | no end-to-end `STALE_STATE → snapshot → resumed clientSeq` recovery test | Add the round-trip recovery test in 1A T9 (gap rejected → take `viewFor` snapshot → next `clientSeq` accepted) |
| U-A1 | BLOCKER(ux-scope) | ux | 1B T8 "keyboard-complete (no pointer events)" is a strategy, not assertions | 1B T8 Step 2: enumerate Tab-reachability, focus-not-reset-on-WS-change, modal focus-trap assertions w/ testIDs |
| U-A2 | BLOCKER(ux-scope) | ux | 1B T8 ARIA-live test asserts attribute presence, not announcement | 1B T8 Step 3: assert live-region `textContent` cycles the 5 state strings, not just `aria-live` presence |
| U-A3 | HIGH(ux) | ux | axe (web/DOM) won't catch native color-only status | 1B T8 Step 4: require non-empty `accessibilityLabel` + text/icon on native status indicators (Jest snapshot/Playwright-native) |
| U-A4 | HIGH(ux) | ux | "focus moves to the error" lacks element/mechanism/assertion | 1B T8 Step 4: error `role="alert"` (web)/`accessibilityLiveRegion="assertive"` (native); Playwright `getByRole('alert')` within 500 ms |
| U-A5 | HIGH(ux) | ux | "manual join without a camera" path undefined | 1B T8 Step 1: Playwright `grantPermissions([])` flow with `manual-entry-url-field`/`manual-entry-token-field`/`join-submit-button` testIDs to a seated lobby |
| U-F2 | HIGH(ux) | ux | manual-entry field structure/validation/testIDs unspecified | 1A T7 Step 3: pre-filled display of host's address + editable token field; validate non-loopback IPv4+port and non-empty token; inline error; testIDs |
| U-A6/R1–R4 | MED/LOW(ux) | ux | Podium `accessibilityLabel` (ordinal not emoji); token `selectable`/monospace wrap; lobby `ScrollView` + sticky Start; countdown clip; QR ≥200dp | Address in 1A T7/T8 UI tasks; verify via screenshot smoke |
| Q-N6 | MINOR | qa | 1B T2 heartbeat tests don't pin a fake-timer API | 1B T2 Step 1: `jest.useFakeTimers()` + `jest.advanceTimersByTime()` (avoid real `sleep`) |
| Q-N7 | MINOR | qa | join/bind only tested via harness (1A T5) | Require extending `net/session.test.ts` with isolated join/bind/duplicate-token unit tests |
| R-M2 | MINOR | release | `web.output:"static"` silently changes `tools/build-web.sh` artifact shape | Note in 1A T2 to re-validate `build-web.sh`/Docker/nginx SPA routing |
| R-M6 | MINOR | release | Playwright `webServer` two-step start underspecified | 1A T9 Step 2: pin `command: "npm run embed:web && node harness/nodeHost.js --port 8092"`, `url: /healthz`, `reuseExistingServer:!CI` |
| G-GAMEOVER | MINOR | gameplay | `GAME_OVER` reject code declared but unreachable in Phase 0 | Acceptable for Phase 0; wire a game-over guard in `applyMove`/`submitMove` when rematch/gameOver lands (1A T8) |
| N1-dedup | MINOR | architect, gameplay | `computeLegalActions` (seatView) duplicates `validateSuit` logic — drift risk | Add a property test asserting `legalActions` ⇔ `validateMove` accepts, or derive from one predicate |
| N4-payload | MINOR | architect | `decodeEnvelope` validates envelope but not per-`type` payload shape | Add per-type payload guards in 1A T5 `nodeHost` (untrusted frames) |

## Gameplay sign-off (engine correctness)
The senior-gameplay-engineer verified the high-risk pasted code (T2 seeded deal, T4
value-based `makeMove`, T7 codec) **line-by-line against the real source** and confirmed:
deal is a pure fn of `(players, initialPlayerID, dealSeed)`; default-random preserves
offline regression; T4 preserves exact suit/highest/winner/last-trick behavior and keeps
existing tests green; codec covers `roundLosers` Set (both CAPOT and MAX_SCORE) and
`scoresMap` numeric keys; no other Set/Map/shared-ref hazard missed. Verdict: ship after
the T5 reject-mapping fix (done).

## Verdict
All BLOCKERs fixed inline; engine core independently verified correct. Remaining tracked
items are execution-time details for 1A/1B tasks (UX/a11y enumerations, the events
producer, `pastTricks`) with concrete instructions above. Phase 0 is ready for a
weak-model executor; 1A/1B should fold their tracked rows as each task is reached.
