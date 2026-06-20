# Review Comments: 02 product-manager

## Reviewer Scope
This review is limited to product strategy, roadmap coherence, user value, scope control, user journey clarity, and acceptance criteria for the local multiplayer design.

## Overall Verdict
The design has a plausible direction, but it is not yet ready to drive implementation planning because the MVP boundary, launch promise, and validation gates are too ambiguous.

## Comments
- `Comment ID:` `LMCD-RC-02-PROD-001`
  `Severity:` high
  `Section:` `1. Purpose & scope` / `13. Recommended phased roadmap` lines 22-29, 502-507
  `Issue:` Phase 1 does not translate the hard cross-platform goal into a concrete launch matrix.
  `Rationale:` The hard constraints include Android, iOS, browser, and laptops, but the Phase 1 outcome only proves “two laptops + two Androids,” leaving iOS success undefined.
  `Suggested Change:` Add a Phase 1 acceptance matrix covering Android host, iOS host, Android guest, iOS guest, laptop browser guest, phone browser guest, and at least one mixed 4-player scenario.

- `Comment ID:` `LMCD-RC-02-PROD-002`
  `Severity:` high
  `Section:` `13. Recommended phased roadmap` lines 494-510
  `Issue:` The MVP bundles core multiplayer, hotspot fallback, isolation handling, AI takeover, optional mDNS, and redaction into one large milestone.
  `Rationale:` This makes the first releasable scope hard to estimate and creates a risk that fallback/delight features block the core user value.
  `Suggested Change:` Split Phase 1 into “1A LAN MVP” with native host, HTTP+WS, QR join, F1 redaction, and host-loss ends match; then “1B robustness” with hotspot fallback, isolation messaging, AI takeover, SSE fallback, and mDNS.

- `Comment ID:` `LMCD-RC-02-PROD-003`
  `Severity:` high
  `Section:` `14. Open questions / things to validate before Phase 1` lines 526-534
  `Issue:` The validation list is mostly technical and lacks measurable product acceptance criteria.
  `Rationale:` The roadmap cannot answer whether users can successfully start and finish games in realistic conditions.
  `Suggested Change:` Add a “Phase 1 acceptance criteria” subsection with measurable gates: no internet required, 6 seats supported, mixed-device join succeeds within a target time, one full match completes, private hands are not visible to other clients, and failure states show actionable recovery copy.

- `Comment ID:` `LMCD-RC-02-PROD-004`
  `Severity:` medium
  `Section:` `7. Decision block E — Discovery & pairing UX` / `10. Decision block H — Captive / isolated / hostile networks` lines 300-314, 414-435
  `Issue:` The document lists pairing mechanisms but does not describe the end-to-end host and guest user journey.
  `Rationale:` Permissions, Wi-Fi switching, seat assignment, no-camera fallback, reconnect, and start-game flow are where multiplayer UX usually fails.
  `Suggested Change:` Add a “Primary user journey” section covering host creates table, guests scan/join, permissions, seat selection, start game, dropped guest, host loss, failed QR, failed network, and manual IP/code fallback.

- `Comment ID:` `LMCD-RC-02-PROD-005`
  `Severity:` high
  `Section:` `12. Platform implementation realities` / `13. Recommended phased roadmap` lines 466-472, 502-507
  `Issue:` Phase 1 assumes native app hosting on Android and iOS without tying that to the existing native distribution roadmap.
  `Rationale:` Existing project context shows static web today and deferred signed iOS/EAS distribution, so iOS host availability may not be product-shippable when the feature is built.
  `Suggested Change:` Add a roadmap dependency: “Phase 1 dev validation can use dev clients; public iOS host support requires signed internal/TestFlight distribution; Android-only alpha is acceptable only if labeled as such.”

- `Comment ID:` `LMCD-RC-02-PROD-006`
  `Severity:` medium
  `Section:` `9. Decision block G — Resilience` / `14. Open questions` lines 382-390, 534
  `Issue:` AI takeover is recommended early while the player-facing default remains undecided.
  `Rationale:` Pause versus AI substitution changes fairness, table expectations, and game outcome, so it is a product policy decision rather than only a resilience feature.
  `Suggested Change:` Define the MVP rule explicitly, for example: “Dropped seats pause by default; host may enable AI takeover after N seconds; returning players reclaim their seat at the next turn boundary.”

- `Comment ID:` `LMCD-RC-02-PROD-007`
  `Severity:` medium
  `Section:` `13. Recommended phased roadmap` lines 512-517
  `Issue:` Optional native transports and browser-hosting have no decision triggers.
  `Rationale:` Without explicit thresholds, Phase 3 and Phase 4 can become roadmap sprawl disconnected from user demand.
  `Suggested Change:` Add trigger criteria such as observed LAN failure rate, user interviews requesting no-router play, percentage of Apple-only or Android-only sessions, or a validated need for browser-hosting before these phases begin.

## Consolidation Notes
Likely overlaps: engineering reviewers may cover native module feasibility and session architecture; security reviewers may cover redaction and trust wording; QA reviewers may expand the acceptance matrix into test cases.
