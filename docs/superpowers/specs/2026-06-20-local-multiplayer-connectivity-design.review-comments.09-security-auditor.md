# Review Comments: 09 security-auditor

## Reviewer Scope
Read-only security review of the local multiplayer design, focused on LAN threat model, trust boundaries, cheating, session binding, cleartext transport, permissions, discovery leakage, and abuse resistance.

## Overall Verdict
The design is viable for trusted-friends LAN play, but it needs explicit security invariants before implementation. The largest gaps are cleartext transport assumptions, seat/session binding, enforceable redaction, and host-migration privacy.

## Comments
- `Comment ID:` `LMCD-RC-09-SEC-001`
  `Severity:` high
  `Section:` §5 Tier 1 — Browser join-only / §12 Web same-origin trick
  `Issue:` The design relies on plain `http://` and `ws://` without defining the LAN attacker model or compensating controls.
  `Rationale:` Any local observer, hostile AP, or active MITM can read or alter traffic and potentially inject app code or gameplay messages; F1 redaction does not protect against transport interception.
  `Suggested Change:` Add a “LAN transport security posture” note stating that Phase 1 provides no confidentiality/integrity against hostile LANs, is intended for cooperative/trusted local networks, and requires high-entropy ephemeral tokens plus public/guest-Wi-Fi warnings or hotspot fallback for safer play.

- `Comment ID:` `LMCD-RC-09-SEC-002`
  `Severity:` high
  `Section:` §6 Decision block D / §8 F1-F2
  `Issue:` `PlayMove` examples imply client-supplied `seat`/`playerID`, but the design does not require the host to bind a seat to the connection/session.
  `Rationale:` A malicious peer could submit moves for another seat unless the host derives identity from the accepted connection and treats message identity fields as untrusted.
  `Suggested Change:` Specify that after `SeatAssigned`, the host binds `{connectionId, seatId, sessionId}` and ignores or rejects client-supplied seat/player IDs; `PlayMove` should contain only `{card, clientSeq}` plus protocol metadata, with the host deriving the acting seat.

- `Comment ID:` `LMCD-RC-09-SEC-003`
  `Severity:` high
  `Section:` §9 R1 — Reconnection + AI takeover
  `Issue:` Stable seat tokens are mentioned but their lifecycle, secrecy, replay resistance, and active-seat reclaim behavior are undefined.
  `Rationale:` A stolen or guessed bearer token could let another LAN peer reclaim a seat, interrupt a player, or replay stale moves.
  `Suggested Change:` Define separate room-admission and per-seat resume tokens, both high-entropy and match-scoped; rotate on reconnect, expire at match end, allow only one active connection per seat, require host confirmation for reclaim while the original connection is active, and use monotonic client sequence numbers.

- `Comment ID:` `LMCD-RC-09-SEC-004`
  `Severity:` high
  `Section:` §8 F1 — Redacted per-seat views / §13 Phase 0
  `Issue:` Redaction is recommended but not made an enforceable schema or acceptance criterion.
  `Rationale:` The current code’s `GameState` is directly serializable and contains every hand, so accidental full-state serialization would silently defeat the primary privacy boundary.
  `Suggested Change:` Add a required `SeatView`/`PublicTableView` allowlist schema and tests proving serialized views contain only the recipient’s hand plus public state; explicitly forbid sending `GameState`, `Round.players[].cards`, `cardsBySuit`, `pastRounds`, or debug state over the network.

- `Comment ID:` `LMCD-RC-09-SEC-005`
  `Severity:` high
  `Section:` §9 R2 — Host migration
  `Issue:` Mirroring authoritative state to a successor leaks hidden hands to another peer and contradicts the F1 “don’t trust other clients” model.
  `Rationale:` The public move log can be mirrored safely, but current hidden hands cannot be transferred to a normal client without making that client a co-host who sees all cards.
  `Suggested Change:` Add a security note that R2 is only available in a trusted-successor/co-host mode unless cryptographic escrow is designed; otherwise mirror only public log data and keep host-loss as match-ending for F1 privacy.

- `Comment ID:` `LMCD-RC-09-SEC-006`
  `Severity:` medium
  `Section:` §8 F2-F3
  `Issue:` F2’s “audit trail” wording may overstate anti-cheat value against a malicious host.
  `Rationale:` Event logs and redacted deltas help replay and validation, but they do not prove the host shuffled fairly or did not manipulate hidden state before cards are revealed.
  `Suggested Change:` State explicitly that anti-host cheating begins only at F3, or add an intermediate option where the host commits to a deck/deal hash before play and reveals the seed/deck or all initial hands after the round for tamper evidence.

- `Comment ID:` `LMCD-RC-09-SEC-007`
  `Severity:` medium
  `Section:` §7 Decision block E / §10 captive networks
  `Issue:` QR pairing may expose Wi-Fi credentials and room tokens without leakage rules.
  `Rationale:` Anyone who photographs the QR can join the hotspot/LAN or table; iOS Personal Hotspot credentials may be reusable and broader than the game session.
  `Suggested Change:` Document QR content rules: use Android `LocalOnlyHotspot` ephemeral credentials only, stop and rotate the hotspot after the match, do not encode reusable iOS hotspot passwords by default, expire room tokens when the lobby closes, and warn before displaying network credentials.

- `Comment ID:` `LMCD-RC-09-SEC-008`
  `Severity:` medium
  `Section:` §5 Tier 1 / §12 Platform implementation realities
  `Issue:` The embedded HTTP/WebSocket server lacks abuse-resistance and file-exposure constraints.
  `Rationale:` A LAN-reachable server can be probed, flooded, sent oversized JSON, or tricked into serving unintended local assets if the boundary is not specified.
  `Suggested Change:` Add implementation requirements: bind only to the selected LAN/hotspot interface, use a random high port, serve only allowlisted exported web assets, disable directory listing and debug endpoints, enforce strict schemas, cap body/message sizes, cap connections, rate-limit peers, and reject unknown paths/methods.

- `Comment ID:` `LMCD-RC-09-SEC-009`
  `Severity:` low
  `Section:` §7 Discovery & pairing UX / §12 iOS Local Network permission
  `Issue:` mDNS/Bonjour discovery can leak table metadata on the LAN.
  `Rationale:` Advertising player names, seat counts, or game status would reveal more local activity than needed and may surprise users granting Local Network permission.
  `Suggested Change:` Specify that discovery advertises only an opaque room ID, protocol version, and capability flags; exclude player names, current game state, and seat assignments, and make the iOS permission string accurately describe local table discovery.

## Consolidation Notes
Comments 001-003 likely overlap with protocol/API reviewers. Comments 004-006 overlap with architecture and game-logic reviewers. Comments 007-009 overlap with platform/mobile reviewers, especially around iOS Local Network and Android hotspot permissions.
