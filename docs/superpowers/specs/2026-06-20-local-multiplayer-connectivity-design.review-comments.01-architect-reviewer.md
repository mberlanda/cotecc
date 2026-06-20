# Review Comments: 01 architect-reviewer

## Reviewer Scope
Architecture-only review of the local multiplayer connectivity design against the current Expo/React Native app shape, focusing on system boundaries, sequencing, coupling, and missing architectural decisions.

## Overall Verdict
The recommended LAN WebSocket backbone is plausible, but the document is not yet implementation-ready: it overstates current engine seams and leaves the session, seat, redaction, native-host, and resilience contracts too underspecified for safe Phase 0/1 planning.

## Comments
- `Comment ID:` `LMCD-RC-01-ARCH-001`
  `Severity:` high
  `Section:` `## 2. What the codebase already gives us`
  `Issue:` The document describes the engine as a deterministic serializable reducer, but the current implementation mutates state, uses `Math.random()`, catches validation errors, and includes non-JSON state such as `Set`.
  `Rationale:` Replay, reconnect, host migration, and wire snapshots need an explicit deterministic transition boundary and portable schema, not just current in-memory objects.
  `Suggested Change:` Revise this section to say the engine is a good starting point but needs Phase 0 hardening: `GameCommand -> GameTransitionResult`, structured validation errors, seeded dealing, and `WireGameState` serializers for `Set`, card identity, and duplicated `cards`/`cardsBySuit` data.

- `Comment ID:` `LMCD-RC-01-ARCH-002`
  `Severity:` blocking
  `Section:` `### The proposed core abstraction (shared by every option below)`
  `Issue:` `GameSession` and `SessionTransport` are too thin to serve as the central architecture seam.
  `Rationale:` `send`, `broadcast`, and peer callbacks do not define lobby lifecycle, role separation, message ordering, snapshots, command ack/reject, idempotency, reconnect cursors, or protocol versioning.
  `Suggested Change:` Add a concrete contract subsection defining `HostSession`, `ClientSession`, message envelope fields, session state machines, required delivery semantics, error paths, and transport capability flags.

- `Comment ID:` `LMCD-RC-01-ARCH-003`
  `Severity:` high
  `Section:` `## 13. Recommended phased roadmap`
  `Issue:` Phase 0 underestimates coupling to the current single-local-human model.
  `Rationale:` `GameScreen` renders the first `isHuman` hand, ends when that human is eliminated, runs AI moves in the UI, and `HomeScreen` generates one human plus AI placeholders.
  `Suggested Change:` Add a “seat ownership model” decision before Phase 0: define `localSeatId`, seat assignment, player control mode (`local`, `remote`, `ai`), and a screen-facing `SeatView` rather than passing full `GameState`.

- `Comment ID:` `LMCD-RC-01-ARCH-004`
  `Severity:` high
  `Section:` `### F1 — Host-authoritative, redacted per-seat views`
  `Issue:` The redacted view boundary is not specified enough to prevent accidental hidden-state leakage.
  `Rationale:` Clients cannot safely receive `GameState`, and existing debug/render paths assume full state objects.
  `Suggested Change:` Define the exact `SeatView` schema: own cards, public players/lives/scores/card counts, current trick, past tricks, phase, legal local actions, and explicitly state that client debug/UI components consume only this redacted view.

- `Comment ID:` `LMCD-RC-01-ARCH-005`
  `Severity:` high
  `Section:` `### R2 — Host migration`
  `Issue:` Host migration conflicts with hidden-hand redaction unless a successor receives full unredacted state.
  `Rationale:` A peer holding only its own redacted view cannot become authoritative; mirroring full state leaks all hands to the successor and changes the trust model.
  `Suggested Change:` Add a decision that R2 either requires a trusted hot-standby with full state, is deferred until a cryptographic/escrow design exists, or explicitly accepts the privacy tradeoff.

- `Comment ID:` `LMCD-RC-01-ARCH-006`
  `Severity:` high
  `Section:` `### Tier 1 — Browser join-only` / `## 12. Platform implementation realities`
  `Issue:` The embedded native HTTP+WebSocket host is treated as a module choice, but it is a full native runtime and packaging concern.
  `Rationale:` The host must serve exported web assets, MIME types, route fallback, WS endpoint, LAN address selection, port conflicts, cleartext policies, iOS Local Network permission, Android config, and foreground/background lifecycle.
  `Suggested Change:` Add a Phase 1 spike deliverable proving exported web bundle serving plus WS on real iOS and Android devices, with required `app.json`/native permission/config changes listed.

- `Comment ID:` `LMCD-RC-01-ARCH-007`
  `Severity:` medium
  `Section:` `## 7. Decision block E — Discovery & pairing UX`
  `Issue:` QR and room-code pairing lack a trust and binding model.
  `Rationale:` Plain LAN HTTP allows any local device with the URL/token to attempt joins or replay commands unless tokens and seats are explicitly bound.
  `Suggested Change:` Specify room-token entropy and lifetime, host approval behavior, per-seat reconnect token storage, duplicate-join handling, and command authentication in the protocol envelope.

- `Comment ID:` `LMCD-RC-01-ARCH-008`
  `Severity:` medium
  `Section:` `## 10. Decision block H — Captive / isolated / hostile networks`
  `Issue:` Isolation detection depends on internet/gateway reachability even though offline operation is a hard constraint.
  `Rationale:` Hotspots and routerless LANs may intentionally have no internet, so internet checks can misclassify valid offline networks.
  `Suggested Change:` Define local-only probes: QR carries host address candidates, browser loads `/healthz`, WS upgrade timeout is categorized separately, and hotspot fallback is offered when the host is unreachable without relying on internet status.

- `Comment ID:` `LMCD-RC-01-ARCH-009`
  `Severity:` medium
  `Section:` `### R1 — Reconnection + AI takeover`
  `Issue:` AI takeover is recommended early before the seat lifecycle and ordering rules are defined.
  `Rationale:` Reclaiming a seat after AI plays requires stable seat tokens, timeout policy, command idempotency, and clear rules for pending human moves versus scheduled AI moves.
  `Suggested Change:` Either move polished R1 to Phase 2 or add a minimal Phase 1 contract covering disconnected state, pause/default policy, AI attribution, reconnect snapshots, and stale command rejection.

- `Comment ID:` `LMCD-RC-01-ARCH-010`
  `Severity:` medium
  `Section:` `## 6. Decision block D — Application protocol over the chosen transport`
  `Issue:` SSE+POST does not fit the advertised `SessionTransport` shape.
  `Rationale:` SSE+POST is asymmetric and cursor-based, not peer-addressed `send(peerId, bytes)`.
  `Suggested Change:` Replace the transport API with capability-based interfaces such as `HostEndpoint` and `ClientConnection`, then map WebSocket, SSE+POST, WebRTC, and BLE to the capabilities they actually provide.

## Consolidation Notes
Security reviewers will likely overlap on room tokens, LAN HTTP, redaction, and debug leakage. Frontend or product reviewers may overlap on seat assignment, reconnect UX, and AI takeover behavior. Native/build reviewers should cover the Expo dev-client/CNG and embedded-server feasibility risk.
