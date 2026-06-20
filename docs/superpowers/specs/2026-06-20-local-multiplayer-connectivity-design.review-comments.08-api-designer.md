# Review Comments: 08 api-designer

## Reviewer Scope
API/protocol contract review only: wire message schemas, client/server roles, versioning, command acknowledgements, error semantics, idempotency, snapshots/deltas, reconnect contracts, and developer ergonomics.

## Overall Verdict
The transport/topology direction is plausible, but the document is not yet specific enough to implement safely as a client/server contract. The largest gaps are the absence of a canonical wire envelope, version negotiation, command ack/error semantics, idempotency rules, and formal redacted snapshot schemas.

## Comments
- `Comment ID:` `LMCD-RC-08-API-001`
  `Severity:` blocking
  `Section:` §2 "The proposed core abstraction", lines 99-104
  `Issue:` The protocol is described as message names only, with no canonical envelope or payload schemas.
  `Rationale:` A transport abstraction over WebSocket, SSE+POST, BLE, and loopback needs one discriminated wire format so clients, host, tests, and future transports agree on framing and validation.
  `Suggested Change:` Add a "Wire protocol v1" subsection defining UTF-8 JSON frames with fields like `protocolVersion`, `sessionId`, `messageId`, `type`, `sentAt`, `payload`, and a discriminated union for every message type.

- `Comment ID:` `LMCD-RC-08-API-002`
  `Severity:` high
  `Section:` §2 lines 103-104; §7 "Discovery & pairing UX"
  `Issue:` Join, seating, lobby, start-game, and reconnect flows lack request/response contracts and state transitions.
  `Rationale:` `JoinRequest`, `SeatAssigned`, `Lobby`, and `StartGame` need defined payloads for room token, player display name, client capabilities, requested/reclaimed seat, seat token, table settings, and rejection cases.
  `Suggested Change:` Add a "Session lifecycle state machine" with `discovered -> joining -> seated -> lobby -> in_game -> disconnected/reconnecting -> left`, plus schemas for `JoinRequest`, `JoinAccepted`, `JoinRejected`, `SeatAssigned`, `LobbyUpdated`, and `GameStarted`.

- `Comment ID:` `LMCD-RC-08-API-003`
  `Severity:` high
  `Section:` §8 F2, lines 342-352
  `Issue:` Command acknowledgement and rejection semantics are not specified.
  `Rationale:` Current game validation throws local errors, but network clients need correlated `accepted/rejected` responses and stable error codes for UX and retry behavior.
  `Suggested Change:` Define `PlayMoveCommand` with `commandId`, `seatId`, `cardRef`, and `knownStateSeq`, then define `CommandAck` and `CommandError` with codes such as `NOT_YOUR_TURN`, `CARD_NOT_IN_HAND`, `MUST_FOLLOW_SUIT`, `STALE_STATE`, `BAD_SEAT_TOKEN`, and `UNSUPPORTED_PROTOCOL`.

- `Comment ID:` `LMCD-RC-08-API-004`
  `Severity:` high
  `Section:` §8 F2; §13 Phase 2
  `Issue:` Idempotency and ordering are deferred instead of being part of the baseline command contract.
  `Rationale:` Duplicate taps, reconnect retries, and SSE+POST fallback can replay commands even before full event sourcing or host migration exists.
  `Suggested Change:` Require every client command to include a stable `commandId` and per-seat monotonic `clientSeq`; require the host to return the same ack/error for duplicate `commandId`s and assign a monotonic authoritative `serverSeq` to all applied events.

- `Comment ID:` `LMCD-RC-08-API-005`
  `Severity:` high
  `Section:` §8 F1-F2, lines 331-352
  `Issue:` Redacted snapshot and delta schemas are not defined.
  `Rationale:` Sending raw `GameState` is unsafe for hidden hands and is not clean JSON as-is once `RoundResult.roundLosers` is a `Set`; clients need a formal `SeatView` contract rather than inferred engine objects.
  `Suggested Change:` Add `SeatSnapshot` and `StateDelta` schemas with `serverSeq`, `roundId`, `turnId`, public table state, scores/lives, current moves, own hand only, card counts for other seats, and JSON-safe arrays instead of `Set`/noncanonical maps.

- `Comment ID:` `LMCD-RC-08-API-006`
  `Severity:` medium
  `Section:` §2 lines 60-67; §12 lines 483-485
  `Issue:` Card identity is treated as a rehydration implementation detail rather than a wire-contract rule.
  `Rationale:` The client should not send a full mutable `Card` object with `points`; the host should receive a stable card reference and derive authoritative card data from its own hand.
  `Suggested Change:` Define `CardRef` as `{ suit, rank }` for v1 commands, state that `points` is host-derived and ignored from clients, and document that host rehydration must fail with `CARD_NOT_IN_HAND` when no matching card exists.

- `Comment ID:` `LMCD-RC-08-API-007`
  `Severity:` medium
  `Section:` §6 "Decision block D — Application protocol over the chosen transport"
  `Issue:` The SSE+POST fallback is named but not contract-equivalent to WebSocket.
  `Rationale:` Fallback clients need the same command, ack, event, reconnect, and cursor semantics over HTTP or they will become a second protocol.
  `Suggested Change:` Add endpoint-level contracts such as `GET /session/:id/events?afterSeq=...` for SSE and `POST /session/:id/commands` for commands, with the same envelope, status-code mapping, and resume cursor behavior as WebSocket.

- `Comment ID:` `LMCD-RC-08-API-008`
  `Severity:` medium
  `Section:` §13 Phase 0, lines 494-500
  `Issue:` Developer-facing protocol artifacts are not listed as deliverables.
  `Rationale:` A shared multiplayer contract will be hard to evolve without schema validation, examples, and compatibility tests across host, browser client, native client, and loopback transport.
  `Suggested Change:` Add Phase 0 deliverables for `protocol.ts` discriminated TypeScript unions, runtime decode/validate helpers, golden JSON frame fixtures, compatibility tests, and a short protocol changelog with deprecation rules.

## Consolidation Notes
Security reviewers may overlap on seat tokens, redaction, and tamper resistance. Resilience reviewers may overlap on reconnect, host migration, and sequence cursors. Frontend reviewers may overlap on join/lobby/error UX, but API ownership should stay with schemas, lifecycle states, and wire compatibility.
