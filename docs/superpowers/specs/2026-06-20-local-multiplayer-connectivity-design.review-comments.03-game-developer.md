# Review Comments: 03 game-developer

## Reviewer Scope
Reviewed only game-state, deterministic engine assumptions, turn-based multiplayer flow, player experience, reconnect/AI takeover, and cheat/fairness mechanics, validating claims against the current TypeScript game logic where useful.

## Overall Verdict
The direction is viable, but the design currently overstates how network-ready the existing engine is. Before Phase 0/1 is actionable, the doc should tighten the state/event model around deterministic deals, round transitions, redacted view schemas, typed validation failures, and seat-controller state for reconnect and AI takeover.

## Comments
- `Comment ID:` `LMCD-RC-03-GAME-001`
  `Severity:` high
  `Section:` `## 2. What the codebase already gives us`
  `Issue:` The doc overstates the existing engine as a deterministic, pure, directly JSON-serializable reducer.
  `Rationale:` `newRound` deals via `Math.random`, `playCard` mutates state in place and catches errors, and `RoundResult.roundLosers` is a `Set`, so replay/reconnect/host migration need more than a raw `GameState` snapshot.
  `Suggested Change:` Reword this section to say the engine is deterministic only after a canonical dealt state, then add requirements for seeded/canonical deal generation, typed command results, and explicit snapshot serialization/deserialization.

- `Comment ID:` `LMCD-RC-03-GAME-002`
  `Severity:` high
  `Section:` `### The proposed core abstraction (shared by every option below)`
  `Issue:` The message list lacks setup and round-transition commands.
  `Rationale:` Current gameplay has host-selected setup and a separate `nextRound` deal step after each completed round; if only `StartGame` and `PlayMove` are modeled, clients can diverge or stall between rounds.
  `Suggested Change:` Add protocol events such as `ConfigureTable`, `StartRound`/`DealRound`, `RoundComplete`, and `RequestNextRound`, including `roundId`, active seat IDs, initial player ID, and either deterministic deal seed/commitment or redacted dealt hands.

- `Comment ID:` `LMCD-RC-03-GAME-003`
  `Severity:` high
  `Section:` `### F1 — Host-authoritative, redacted per-seat views`
  `Issue:` Redaction is described conceptually but not as a concrete client view contract.
  `Rationale:` The current UI works from full `currentRound.players` hand structures, and debug/state props can accidentally preserve full-hand-shaped data even if rendering hides it.
  `Suggested Change:` Define a `SeatView` schema explicitly: local hand cards only for the owning seat, public moves/past tricks/scores/lives/card counts for all seats, no other hands, and debug views disabled or redacted in network sessions.

- `Comment ID:` `LMCD-RC-03-GAME-004`
  `Severity:` high
  `Section:` `### F2 — Command/event-sourced log + server-side validation`
  `Issue:` The cheat-prevention path relies too loosely on `validateMove`.
  `Rationale:` `validateMove` checks turn and suit-following, while ownership is enforced later through reference identity; network commands must not trust client-sent card objects or points.
  `Suggested Change:` Specify that `PlayMove` carries a canonical card ID or `{suit, rank}` only, the host rehydrates from authoritative hand state, recomputes card data, checks seat token plus sequence number, and returns `MoveAccepted` or `MoveRejected` with a reason.

- `Comment ID:` `LMCD-RC-03-GAME-005`
  `Severity:` medium
  `Section:` `## 2. What the codebase already gives us`, gotcha 1
  `Issue:` Card rehydration is broader than inbound wire cards.
  `Rationale:` The engine stores the same card objects in both `cards` and `cardsBySuit`; a JSON round-trip can break that internal identity and make later removals corrupt unless snapshots are canonicalized.
  `Suggested Change:` Extend the gotcha to require a snapshot hydrator that rebuilds `cardsBySuit` from canonical `cards`, or refactor move/removal logic to value-based card identity before networking.

- `Comment ID:` `LMCD-RC-03-GAME-006`
  `Severity:` high
  `Section:` `### R1 — Reconnection + AI takeover`
  `Issue:` AI takeover needs a seat-controller model, not just reuse of existing AI helpers.
  `Rationale:` Current `isHuman` drives identity and UI autoplay behavior; a disconnected remote human seat should remain that player’s seat while temporarily controlled by AI.
  `Suggested Change:` Add a seat state model with fields like `controller: local | remote | ai`, `connection: connected | grace | disconnected`, stable reclaim token, timeout policy, and clear rules for whether AI acts immediately, after a timer, or only with host approval.

- `Comment ID:` `LMCD-RC-03-GAME-007`
  `Severity:` medium
  `Section:` `### R2 — Host migration`
  `Issue:` Mirroring full authoritative state to a successor conflicts with F1’s host-only hidden-state trust model.
  `Rationale:` A successor that can take over must know all hands and deal state, which makes that peer a trusted co-host; a redacted successor cannot perform migration safely.
  `Suggested Change:` State this trade-off explicitly: host migration either designates a trusted successor that receives full hidden state, or it is deferred until encrypted/sealed state or a stronger F3-style protocol exists.

- `Comment ID:` `LMCD-RC-03-GAME-008`
  `Severity:` medium
  `Section:` `### F3 — Trustless deal integrity`
  `Issue:` Commit-reveal is presented as removing host trust without addressing abort/redeal and hidden-hand verification limits.
  `Rationale:` A deterministic shuffle seed proves the deck order only if the transcript is committed before hands are distributed and peers can audit it; it does not hide hands from the host, and a bad host can still abort unfavorable deals unless the protocol handles that.
  `Suggested Change:` Split F3 into two levels: tamper-evident host deal with commitments, signed transcript, deterministic seed, and post-round reveal; and true host-private play via mental-poker/encrypted-deck protocols.

## Consolidation Notes
Likely overlaps with backend/network reviewers on protocol message shapes, serialization, and host migration. Security reviewers may cover the same fairness items more deeply; this review frames them only where they affect game rules, player state, and playable multiplayer flow.
