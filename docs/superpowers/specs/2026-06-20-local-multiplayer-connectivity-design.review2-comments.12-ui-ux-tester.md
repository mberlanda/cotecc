# UI/UX Re-Review (round 2) — Local Multiplayer v2
**Agent #:** 12 · **Role:** UI/UX · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 10 |
| PARTIALLY | 2 |
| NOT-ADDRESSED | 0 |
| WONT-FIX (deferred) | 0 |

New issues raised: 5

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-12-UX-001 | RESOLVED | 1A §3.2 | Host and guest journeys are now fully specified screen-by-screen: Home → "Host LAN table" → table settings → Lobby for host; scan QR → `/join?room=<token>` → name entry → connecting → lobby → game for browser guest; same path via in-app scan for native guest. Cancel/back teardown mentioned. |
| LMCD-RC-12-UX-002 | RESOLVED | 1A §3.3 | Pairing descriptor subsection added. Covers join URL contract (`http://<ip>:<port>/join?room=<roomToken>&seat=<seatToken?>`), QR content, optional Wi-Fi QR for two-step join, QR expiry/refresh, SSID/IP/port as visible text, manual-entry fallback without a second scan requirement. |
| LMCD-RC-12-UX-003 | RESOLVED | 1A §3.3, master §4A | Blocking comment addressed directly. The bare short-code path is removed. Manual fallback is now the full `http://<ip>:<port>` + token. Both 1A §3.3 and master §4A explicitly state "no bare short-code lookup (zero-infra has no resolver)" and cite this comment (UX-003, NET-010). |
| LMCD-RC-12-UX-004 | RESOLVED | 1A §2 | Permission UX matrix is specified: per permission (camera, Android NEARBY_WIFI_DEVICES/location, CHANGE_WIFI_STATE, iOS NSLocalNetworkUsageDescription/NSBonjourServices) — trigger point, pre-prompt copy, OS purpose string, denial message, retry/Settings path, fallback. Comment cited as UX-004 in 1A traceability. |
| LMCD-RC-12-UX-005 | PARTIALLY | 1B §1.2 | Failure taxonomy table is specified with detection signal, user-facing message, primary/secondary action, and measurable timeout/retry budget per failure mode (timeout, refused, abnormal close, heartbeat loss, bundle load fail, wrong IP, host suspended, seat full, game already started, permission denied). The doc does not show the actual table rows inline — it names the structure and lists the failure signals, but defers the filled table to implementation. Additionally, the "wrong Wi-Fi" and "stale QR" cases are implicit (wrong IP / expired token) rather than labelled as user-facing scenarios with specific copy. The test-case column is referenced but not populated. Solid structure, minor incompleteness. |
| LMCD-RC-12-UX-006 | RESOLVED | 1B §2.3, §2.4, Foundations §2.2 | R1 UX flow fully specified. `SeatConnection` states (`connected | grace | disconnected`) in Foundations §2.1. Client state machine (`reconnecting | offlinePaused | aiControlled | reclaiming | failed/closed`) in Foundations §2.2. Disconnected badge, pause/countdown indicator, AI-controlled label, reclaim confirmation, duplicate-seat conflict copy all called out in 1B §2.4. Stable seat token storage, host-confirmed reclaim, single-active-connection enforcement in 1B §2.3 (SEC-003). |
| LMCD-RC-12-UX-007 | RESOLVED | 1A §3.6, 1B §2.4, master §2 D5 | Host-loss terminal state is explicit. 1A §3.6: "terminal 'Host disconnected — this game cannot continue' with return-home/start-new." 1B §2.4 adds "browser clients served by the dead host can't refresh — copy says rejoin via a new host's QR." D5 decision in master §2 commits to this as Phase 1 behavior with a clear trigger for revisit. Comment cited as UX-007. |
| LMCD-RC-12-UX-008 | RESOLVED | 1A §3.1 | Role model subsection added. Host = table owner / referee / dealer (holds a seat). Guests = seat owners. Control matrix: start game, lock/open seats, add bot seats, kick, (1B) pause/AI/reconnect = host-only; play a card = seat owner only. |
| LMCD-RC-12-UX-009 | RESOLVED | 1A §3.4 | Lobby and seating contract specified: table name, 2–6 seats, joined players, open/locked seats, bot seats, ready indicators, start-button rules (host-only, min seats), late-join policy (allowed until GameStarted, then rejoin-only via seat token), duplicate-name handling. |
| LMCD-RC-12-UX-010 | RESOLVED | 1A §3.2, §3.3 | Dedicated `/join?room=<token>` route specified (UX-010 cited in 1A). Browser guest enters display name and language, then connecting → lobby → game. Route prevents the browser guest from reaching the local-only Home setup. SPA fallback for `/join`/`/game` on route refresh explicitly required in 1A §1.2. |
| LMCD-RC-12-UX-011 | PARTIALLY | 1B §5 | Accessibility criteria listed: manual join without camera, keyboard-complete browser join, screen-reader announcements for state changes (connecting/your-turn/disconnected/AI-controlled), non-color-only status, scalable text, focus management on errors. However, the criteria are aspirational bullets rather than testable acceptance criteria with pass/fail conditions. No mention of ARIA roles, live-region strategy, or how focus management is validated (e.g., Playwright a11y assertions). The 1B exit criteria reference §5 but do not include any a11y test automation. |
| LMCD-RC-12-UX-012 | RESOLVED | 1A §3.5, Foundations §1.2 | Command-state UX table specified: `idle | myTurn | submitting | accepted | rejected(reason) | resyncing | disconnected | retryDisabled`, driven by `MoveAccepted`/`MoveRejected{code}` from Foundations. Out-of-turn/stale taps disabled, not silently dropped. `MoveRejectCode` values (`NOT_YOUR_TURN | CARD_NOT_IN_HAND | MUST_FOLLOW_SUIT | ROUND_NOT_ACTIVE | GAME_OVER`) map directly to the per-state UI. |

---

## New issues (v2)

### LMCD-RC2-12-UX-001
**Severity:** medium
**Section:** 1A §3.3 — Pairing descriptor
**Concern:** QR expiry/refresh is referenced ("QR has an expiry/refresh") but no policy is specified: what triggers refresh (time elapsed, first join attempt, host rotation), what the TTL is, whether the on-screen display actively counts down, and whether active guests with a `seatToken` are affected by a QR rotation. A QR that silently expires mid-session without any host-side indicator could leave late-arriving players unable to join while host believes the room is still open.
**Recommendation:** Define a QR/room-token lifecycle table: TTL, refresh trigger, whether refresh requires a new token (invalidating lobby-join attempts in flight), visual countdown or manual refresh button, and that seat tokens already issued survive a room-token rotation.

### LMCD-RC2-12-UX-002
**Severity:** high
**Section:** 1A §3.2 — Host & guest journeys
**Concern:** The host journey specifies "Cancel/back tears down the server" but does not cover the transition from Lobby → game and back to Lobby (between rounds), or the end-of-match flow back to Home. The current app has a round-end podium (per git log: "round-end delay + game-over podium"). Whether the match-over state in multiplayer returns all clients to the Lobby (for a rematch), routes them to Home, or produces different behavior per device (host navigates, guests see a disconnect) is unspecified. This risks clients stranded on a dead connection after the game ends.
**Recommendation:** Extend the host and guest journey flows to include: round-end state (intermediate standings, next-round trigger on host), game-over state (podium display, rematch option, leave option), and what guests experience if the host leaves the lobby or ends the game from the podium.

### LMCD-RC2-12-UX-003
**Severity:** medium
**Section:** 1A §3.4, 1B §2.3 — Lobby/seating and pause/AI
**Concern:** The AI takeover policy (pause-then-AI after a host-configurable timeout) does not specify how the host configures the timeout, when this setting is exposed (at table-setup time or in the lobby), what the default is, or what the minimum/maximum bounds are. Players who disconnect mid-trick will have their seat played by AI after the timeout, but other seated guests have no visibility into what timeout the host has set, making the wait experience unpredictable.
**Recommendation:** Specify the AI-timeout configuration: where it appears in table settings or lobby, default value (e.g., 30 s), min/max range, and whether it is shown to all guests in the lobby. Consider a lobby-visible "AI kicks in after X seconds" indicator.

### LMCD-RC2-12-UX-004
**Severity:** medium
**Section:** 1B §2.4 — Reconnect & host-loss UX
**Concern:** The host-loss terminal state correctly differentiates browser vs native clients (browser can't refresh from a dead host, must use a new QR). However, the specification does not address what happens to a native guest that is in the `reconnecting` state when the host process dies — specifically whether the native guest's reconnect attempts eventually surface the terminal host-loss message, or whether the guest is stuck in a reconnect spinner indefinitely.
**Recommendation:** In the failure taxonomy (1B §1.2), add a "host process gone" signal (e.g., WS close code 1001/1006 with no subsequent reply to a reconnect `JoinRequest` within a deadline), and specify that after N failed reconnect attempts or a deadline T, the client transitions to the terminal host-loss screen. Specify N and T.

### LMCD-RC2-12-UX-005
**Severity:** low
**Section:** 1A §3.2, 1B §5 — Guest journey + accessibility
**Concern:** The browser guest join flow begins with a QR scan from the host's screen, but no guidance is given about what a sighted user on the same device as the host should do (impossible QR self-scan), or what the UX is when the host's device is also the only screen available (single-device local-multiplayer scenario). More practically, the manual-entry fallback requires typing a full URL including IP address and port — a flow that can be unusable for keyboard-only users on mobile without a visible URL bar (e.g., full-screen PWA mode).
**Recommendation:** Add a note in §3.3 or §3.2 clarifying the single-device fallback (host plays locally; no multi-device required). For keyboard-only URL entry, consider a short-token-only manual entry field (token → resolved to full URL by having the user first navigate to the host IP separately, which they can copy-paste), or simply ensure the text-form manual entry is always a split "IP:port" + "room token" pair rather than a single free-text URL.

---

## Bottom line

Round 1's key blocking concern (UX-003: zero-infra room-code cannot resolve a host) is **fully and explicitly resolved** in both master §4A and 1A §3.3, with direct citation of the comment ID. Nine of twelve round-1 comments are fully resolved. Two accessibility and failure-taxonomy comments are partially addressed with correct structure but incomplete acceptance criteria — these are not blockers for Phase 1A but should be hardened before 1B ships.

Five new issues are raised. The highest-priority new issue is **LMCD-RC2-12-UX-002** (game-over/rematch flow unspecified, risk of stranded browser clients after match end) which reaches high severity. The others are medium/low and can be addressed in implementation detail without blocking Phase 1A.
