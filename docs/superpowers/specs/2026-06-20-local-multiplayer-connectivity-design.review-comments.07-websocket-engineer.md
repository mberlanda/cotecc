# Review Comments: 07 websocket-engineer

## Reviewer Scope
Reviewed only the design’s embedded HTTP/WebSocket hosting model, client lifecycle, message semantics, ordering, reconnection, heartbeat, backpressure, fallback transport parity, and WebSocket-specific failure modes, with light codebase inspection for feasibility.

## Overall Verdict
The direction is viable, but the design needs a protocol contract before Phase 1 is implementable safely. The main gaps are delivery semantics, reconnection state, heartbeat behavior, serialization rules, and embedded server lifecycle details.

## Comments
- `Comment ID:` `LMCD-RC-07-WS-001`
  `Severity:` high
  `Section:` §2 “The proposed core abstraction” / §8 F1-F2 / §13 Phase 1
  `Issue:` The WebSocket message protocol lists message names but does not define an envelope, ids, versions, acknowledgements, or idempotency.
  `Rationale:` WebSocket gives ordered delivery only within a live TCP connection; reconnects, retries, duplicate clicks, and stale snapshots still need application-level semantics.
  `Suggested Change:` Add a “Wire protocol envelope” subsection specifying `protocolVersion`, `matchId`, `seatId`, `seatToken`, `clientMessageId`, `hostEventSeq`, `stateVersion`, `sentAt`, and error/ack frames; require host-side de-duplication of `PlayMove` by `(seatId, clientMessageId)`.

- `Comment ID:` `LMCD-RC-07-WS-002`
  `Severity:` high
  `Section:` §13 “Phase 1 — Cross-platform LAN, browser join-only”
  `Issue:` Phase 1 includes R1 reconnection but defers F2 sequencing/logging to Phase 2.
  `Rationale:` Reconnection can work with snapshots, but clients still need monotonic `stateVersion` and resume semantics to ignore stale updates and recover from a dropped final frame.
  `Suggested Change:` Amend Phase 1 to require a minimal monotonic `stateVersion` and reconnect flow: client reconnects with `seatToken` + last seen `stateVersion`; host replies with either latest redacted snapshot or `SeatExpired`.

- `Comment ID:` `LMCD-RC-07-WS-003`
  `Severity:` high
  `Section:` §2 lines 54-55 / §8 F0-F2
  `Issue:` The document claims `GameState` serializes directly to JSON, but the current types include `Set<PlayerID>` in `RoundResult`.
  `Rationale:` `JSON.stringify(new Set(...))` produces `{}`, so full snapshots or replay checkpoints can silently corrupt round results over WebSocket/SSE.
  `Suggested Change:` Replace the direct-JSON claim with a required canonical wire codec: encode sets as arrays, normalize numeric map keys, define `WireGameState`/`WireRoundResult`, and add serialization round-trip tests before any transport implementation.

- `Comment ID:` `LMCD-RC-07-WS-004`
  `Severity:` medium
  `Section:` §5 Tier 1 / §12 “Host running a socket/HTTP server”
  `Issue:` The embedded HTTP+WS server lifecycle is underspecified.
  `Rationale:` A native-hosted server must bind the right interfaces, choose or recover a port, serve SPA fallbacks/assets, expose a WS upgrade path, and shut down cleanly when the host leaves or the app backgrounds.
  `Suggested Change:` Add text requiring one HTTP server bound to LAN-reachable interfaces, serving `/` and static assets plus `/ws` upgrade, dynamic port selection with QR refresh, SPA route fallback, MIME/cache rules, and explicit host app foreground/background behavior.

- `Comment ID:` `LMCD-RC-07-WS-005`
  `Severity:` medium
  `Section:` §9 “R1 — Reconnection + AI takeover”
  `Issue:` The client connection lifecycle is not modeled as a state machine.
  `Rationale:` Browser tabs, mobile apps, local-network permission prompts, Wi-Fi changes, and server restarts produce different transitions that need different UX and retry behavior.
  `Suggested Change:` Add a lifecycle subsection with states such as `discovering`, `connecting`, `joined`, `seated`, `syncing`, `live`, `reconnecting`, `spectator/ai-taken-over`, and `closed`, including allowed transitions and retry/backoff rules.

- `Comment ID:` `LMCD-RC-07-WS-006`
  `Severity:` medium
  `Section:` §2 line 104 / §9 “Decision block G — Resilience”
  `Issue:` Heartbeat is named but cadence, timeout, and half-open detection behavior are absent.
  `Rationale:` Mobile and LAN failures often leave WebSockets half-open; relying only on close events delays AI takeover and reconnection.
  `Suggested Change:` Specify heartbeat ping/pong every N seconds, timeout after M missed heartbeats, browser visibility/resume behavior, and host policy for marking a seat disconnected before pause or AI takeover.

- `Comment ID:` `LMCD-RC-07-WS-007`
  `Severity:` medium
  `Section:` §6 “HTTP polling / SSE + POST” / §13 Phase 2
  `Issue:` The SSE+POST fallback lacks semantic parity with WebSocket.
  `Rationale:` If fallback uses different ordering, ack, or replay behavior, restrictive-network recovery becomes a separate protocol with new consistency bugs.
  `Suggested Change:` State that SSE+POST uses the same envelope and sequencing as WebSocket; SSE events must carry `hostEventSeq`, clients resume with `Last-Event-ID`, and POST commands must use idempotent `clientMessageId`.

- `Comment ID:` `LMCD-RC-07-WS-008`
  `Severity:` low
  `Section:` §6 “Decision block D — Application protocol”
  `Issue:` Backpressure and slow-client handling are not documented.
  `Rationale:` Payloads are small, but replay bursts, full snapshots, backgrounded browsers, or broken clients can still grow per-peer queues.
  `Suggested Change:` Add a small backpressure policy: bounded per-peer send queue, coalesce obsolete state updates, prefer latest snapshot over queued deltas, and disconnect clients that exceed queue or `bufferedAmount` thresholds.

- `Comment ID:` `LMCD-RC-07-WS-009`
  `Severity:` low
  `Section:` §10 “Decision block H — Captive / isolated / hostile networks”
  `Issue:` WebSocket failure taxonomy is too coarse.
  `Rationale:` Browser WebSocket errors often collapse to generic `onerror`/1006, while likely causes include AP isolation, wrong IP/interface, refused port, local-network permission denial, host app suspended, and firewall.
  `Suggested Change:` Add a troubleshooting matrix mapping handshake timeout, connection refused, abnormal close, repeated heartbeat timeout, and HTTP bundle load failure to user-facing recovery actions.

## Consolidation Notes
Likely overlap with backend/native reviewers on embedded server module choice and with security reviewers on room tokens/origin checks. The serialization and protocol-envelope comments may also overlap with state-sync or architecture reviewers.
