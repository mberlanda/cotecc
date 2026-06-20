# Review Comments: 12 ui-ux-tester

## Reviewer Scope
Read-only UX/design review of the local multiplayer connectivity design document, with light context from the README, package metadata, and current Auth/Home/Game screens and shared components.

## Overall Verdict
The document makes the transport trade-offs clear, but it is not yet sufficient as a user-flow specification for Phase 1. The largest gaps are around host/guest journeys, pairing fallbacks, permission denial, lobby/seating behavior, reconnection states, and user-facing error recovery.

## Comments
- `Comment ID:` `LMCD-RC-12-UX-001`  
  `Severity:` high  
  `Section:` `## 13. Recommended phased roadmap`  
  `Issue:` Phase 1 promises cross-platform play but does not define the host and guest screen-by-screen journey.  
  `Rationale:` The current app has Auth → Home → Game, while multiplayer needs distinct host, join, lobby, pairing, ready, and game-entry states.  
  `Suggested Change:` Add a “Phase 1 UX flow” subsection with explicit Host path and Guest path steps, including cancel/back behavior and where QR scan/manual join enter the flow.

- `Comment ID:` `LMCD-RC-12-UX-002`  
  `Severity:` high  
  `Section:` `## 7. Decision block E — Discovery & pairing UX`  
  `Issue:` QR pairing is primary, but the document does not define the exact QR payload or the flow differences for browser, native app, same-Wi-Fi, and hotspot joins.  
  `Rationale:` A QR that includes Wi-Fi credentials plus a game URL can require network switching and possibly a second scan; users need a deterministic sequence.  
  `Suggested Change:` Add a “Pairing descriptor” subsection specifying LAN URL/token, Wi-Fi QR, combined display rules, QR expiry/refresh, visible SSID/IP/port, and when a second scan is required.

- `Comment ID:` `LMCD-RC-12-UX-003`  
  `Severity:` blocking  
  `Section:` `### A8. Out-of-band pairing channel — QR / room code (universal)`  
  `Issue:` The manual fallback says a short room code maps to host IP:port, but zero-infra browser clients have no lookup service.  
  `Rationale:` Without infrastructure or successful native discovery, a standalone room code cannot resolve the host address.  
  `Suggested Change:` Replace this with a concrete fallback: show `http://<host-ip>:<port>/#room=<token>` plus a short token for re-entry; only allow short-code-only join after native discovery succeeds.

- `Comment ID:` `LMCD-RC-12-UX-004`  
  `Severity:` high  
  `Section:` `## 12. Platform implementation realities`  
  `Issue:` Permissions are listed as implementation facts, not designed as user-facing flows.  
  `Rationale:` Camera, iOS Local Network, Bonjour, Android location/hotspot, Bluetooth, and Nearby permissions can block pairing before users understand what happened.  
  `Suggested Change:` Add a permission matrix with trigger point, pre-prompt copy, OS prompt purpose string, denial message, retry path, Settings path, and fallback option.

- `Comment ID:` `LMCD-RC-12-UX-005`  
  `Severity:` high  
  `Section:` `## 10. Decision block H — Captive / isolated / hostile networks`  
  `Issue:` Network failure handling is too generic and centers on isolation only.  
  `Rationale:` Same symptoms can come from wrong Wi-Fi, stale QR, host asleep, Local Network permission denial, captive portal, WebSocket block, seat full, or game already started.  
  `Suggested Change:` Add an error-state table with detection signal, user-facing message, primary action, secondary action, and test case for each major join failure.

- `Comment ID:` `LMCD-RC-12-UX-006`  
  `Severity:` high  
  `Section:` `### R1 — Reconnection + AI takeover`  
  `Issue:` Reconnection and AI takeover do not define the player-visible disconnected, paused, AI-controlled, and reclaimed states.  
  `Rationale:` Other players need to know whether to wait or continue, and returning guests need an obvious “resume my seat” path.  
  `Suggested Change:` Add an R1 UX flow covering stable seat token storage, disconnected badge, host default choice, countdown/manual pause, AI label, reclaim confirmation, and duplicate-seat conflict handling.

- `Comment ID:` `LMCD-RC-12-UX-007`  
  `Severity:` medium  
  `Section:` `### R2 — Host migration`  
  `Issue:` Host-loss UX is ambiguous before host migration exists.  
  `Rationale:` In Phase 1 star topology, the host phone locking, dying, or leaving is the most disruptive failure, and users need a clear terminal state.  
  `Suggested Change:` In R0/Phase 1, specify copy and actions for host loss: “Host disconnected. This game cannot continue,” with wait, return home, and start-new-table options.

- `Comment ID:` `LMCD-RC-12-UX-008`  
  `Severity:` high  
  `Section:` `## 8. Decision block F — Authority & state synchronisation`  
  `Issue:` The host-authoritative trust model is not translated into a user mental model.  
  `Rationale:` Guests may assume all devices are equal or that the host cannot inspect hidden state; host-only controls also need clear ownership.  
  `Suggested Change:` Add a “Role model” subsection defining Host as table owner/referee/dealer and Guests as seat owners, with a control matrix for start, pause, seat assignment, kick, AI takeover, and reconnect.

- `Comment ID:` `LMCD-RC-12-UX-009`  
  `Severity:` high  
  `Section:` `## 13. Recommended phased roadmap`  
  `Issue:` Lobby and seating rules are missing.  
  `Rationale:` Multiplayer needs decisions for max seats, host seat, player names, bot seats, late joins, ready state, and start-game eligibility.  
  `Suggested Change:` Add a “Lobby UX contract” listing table name, seat count 2-6, joined players, open/locked seats, bot seats, ready indicators, start button rules, and late join/rejoin policy.

- `Comment ID:` `LMCD-RC-12-UX-010`  
  `Severity:` medium  
  `Section:` `### Tier 1 — Browser join-only (recommended target)`  
  `Issue:` Browser guest onboarding is not specified once the host serves the web bundle.  
  `Rationale:` A laptop guest should not accidentally enter the current local-only Home setup or start a single-device game.  
  `Suggested Change:` Define a dedicated `/join?room=...` route/state that asks for display name and language, then shows connecting, lobby, and game states while hiding host-only setup controls.

- `Comment ID:` `LMCD-RC-12-UX-011`  
  `Severity:` medium  
  `Section:` `## 14. Open questions / things to validate before Phase 1`  
  `Issue:` Accessibility and usability acceptance criteria are absent.  
  `Rationale:` QR-first joining can fail for users without cameras, keyboard-only browser users, screen-reader users, and users needing visible connection feedback.  
  `Suggested Change:` Add validation criteria: manual join without camera, keyboard-complete browser join, screen-reader announcements for state changes, non-color-only status, scalable text, and focus management on errors.

- `Comment ID:` `LMCD-RC-12-UX-012`  
  `Severity:` medium  
  `Section:` `## 6. Decision block D — Application protocol over the chosen transport`  
  `Issue:` Move submission and host rejection states are not designed from the player perspective.  
  `Rationale:` Guests can tap during stale, disconnected, duplicate, or out-of-turn states, and the current app context has no visible error pattern for invalid play.  
  `Suggested Change:` Add a command-state UX table for idle, my turn, submitting, accepted, rejected with reason, resyncing, disconnected, and retry-disabled states.

## Consolidation Notes
Likely overlap with architecture/security reviewers on trust model, host migration, and zero-infra room-code feasibility. This review is limited to how those decisions surface as understandable user flows, prompts, errors, and testable UX states.
