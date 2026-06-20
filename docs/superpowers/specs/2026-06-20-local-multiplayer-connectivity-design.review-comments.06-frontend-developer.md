# Review Comments: 06 frontend-developer

## Reviewer Scope
Read-only frontend review of the design doc against the current Expo Router / React Native Web static-export app, browser join behavior, same-origin loading, client session state, reconnection UX, and maintainable React integration.

## Overall Verdict
The Tier 1 direction is plausible for browser join-only LAN play, but the design currently under-specifies the web join contract and frontend state/view-model changes needed to make the static bundle work as a network client.

## Comments
- `Comment ID:` `LMCD-RC-06-FE-001`
  `Severity:` high
  `Section:` `A8. Out-of-band pairing channel — QR / room code (universal)` and `Tier 1 — Browser join-only`
  `Issue:` The example QR URL uses `/#room=<token>` without defining how Expo Router will parse or route that join state.
  `Rationale:` The current app reads route search params via `useLocalSearchParams`, and a hash fragment will not naturally enter the existing `/game` or setup flow.
  `Suggested Change:` Add a concrete join URL contract, e.g. `http://<host-ip>:<port>/join?room=<token>&seatToken=<token>`, or explicitly require a hash parser; also state that the host HTTP server must serve the SPA fallback for `/join` and `/game`.

- `Comment ID:` `LMCD-RC-06-FE-002`
  `Severity:` high
  `Section:` `Tier 1 — Browser join-only`
  `Issue:` “Reuses the existing web bundle verbatim” understates the required React changes.
  `Rationale:` `GameScreen` currently creates a local `newGame(...)`, owns mutable local state, and has no join/session mode, connection lifecycle, or remote state subscription.
  `Suggested Change:` Replace “reuses the existing web bundle verbatim” with “reuses the same static Expo web artifact after adding the multiplayer client flow,” and add required frontend work: `JoinScreen`, `useGameSession`, a presentational game view, and a local loopback implementation.

- `Comment ID:` `LMCD-RC-06-FE-003`
  `Severity:` high
  `Section:` `F1 — Host-authoritative, redacted per-seat views`
  `Issue:` The redacted state shape is not specified in a way the current UI can render safely.
  `Rationale:` Existing components expect `GameState.currentRound.players[].cards` for every seat and use `Player.isHuman` to identify the local hand; sending only one hand will either leak data if reused directly or break card counts/opponent rendering.
  `Suggested Change:` Define a `RedactedGameView` frontend model with `localSeatId`, `localHand`, `seatSummaries` including public `cardCount`, public trick/history data, scores/lives, and connection/control flags; state that React components must not receive full `GameState` on clients.

- `Comment ID:` `LMCD-RC-06-FE-004`
  `Severity:` high
  `Section:` `R1 — Reconnection + AI takeover`
  `Issue:` Reconnection is described at protocol level but not as a client UX/state-machine contract.
  `Rationale:` The web client needs deterministic states for disabling input, showing pending moves, reclaiming a seat, and explaining when AI is controlling a disconnected player.
  `Suggested Change:` Add a frontend state machine such as `joining | connected | submittingMove | reconnecting | offlinePaused | aiControlled | reclaiming | failed`, with stable seat-token persistence, sequence/ack handling, and required UI banners/actions.

- `Comment ID:` `LMCD-RC-06-FE-005`
  `Severity:` high
  `Section:` `Decision block H — Captive / isolated / hostile networks`
  `Issue:` The detection flow assumes the browser app can show an isolation error even when the host-served page may never load.
  `Rationale:` On AP/client isolation, the initial `http://<host-ip>:<port>` request can fail before any React code runs, so the browser client cannot surface the proposed message.
  `Suggested Change:` Split detection into “page failed to load” versus “page loaded but WS failed”; require fallback instructions on the host QR screen, and reserve in-app isolation messaging for native guests or browser cases where HTTP loads but WebSocket upgrade fails.

- `Comment ID:` `LMCD-RC-06-FE-006`
  `Severity:` medium
  `Section:` `Platform implementation realities`
  `Issue:` The native-hosted static bundle serving requirements are too implicit.
  `Rationale:` The current web deployment relies on SPA fallback, correct MIME types, root-relative asset serving, and immutable static assets; the embedded native HTTP server must mirror those behaviors offline.
  `Suggested Change:` Add a “Static web serving contract” bullet requiring `index.html` fallback, correct JS/CSS/image MIME types, serving hashed assets from the Expo `dist` root, no CDN/runtime internet dependencies, and a cache/version strategy for host-served bundles.

- `Comment ID:` `LMCD-RC-06-FE-007`
  `Severity:` medium
  `Section:` `Discovery & pairing UX`
  `Issue:` The deep link row conflates offline custom schemes with universal/app links.
  `Rationale:` `coteccapp://join?...` can work offline for installed apps, but universal links require an HTTPS domain and association files, which conflicts with the zero-infra LAN premise.
  `Suggested Change:` Split the row into “custom scheme, offline, installed app only” and “universal/app link, optional internet-backed convenience,” and avoid presenting universal-link fallback as part of the zero-infra path.

## Consolidation Notes
Likely overlaps with native/mobile reviewers on embedded HTTP server feasibility, iOS local network permissions, and app lifecycle while hosting. Security reviewers may also cover token placement, redaction, and host trust; this review focuses on whether the browser client and React web bundle can actually consume the proposed design.
