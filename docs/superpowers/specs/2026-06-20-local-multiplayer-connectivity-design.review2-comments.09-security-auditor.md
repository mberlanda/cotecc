# Security Auditor Re-Review (round 2) — Local Multiplayer v2

**Agent #:** 09 · **Role:** Security · **Date:** 2026-06-20

---

## Verdict summary

| Verdict | Count |
|---|---|
| RESOLVED | 7 |
| PARTIALLY | 1 |
| NOT-ADDRESSED | 0 |
| WONT-FIX / deferred | 1 |

Remaining items requiring attention before implementation: none at BLOCKER level.
PARTIALLY addressed item (SEC-003 token lifecycle) carries residual MAJOR risk that
must be closed in Phase 1A/1B implementation tickets.

---

## Coverage of round-1 comments

| Comment ID | Verdict | Where addressed (doc §) | Note |
|---|---|---|---|
| LMCD-RC-09-SEC-001 | RESOLVED | Master §5 (D3, first bullet); 1B §3 | §5 explicitly states no confidentiality/integrity on hostile LANs, scopes to cooperative/trusted networks, calls for public/guest-Wi-Fi warning and hotspot fallback. Language matches the suggested change almost verbatim. 1B §3 references this posture as the baseline. |
| LMCD-RC-09-SEC-002 | RESOLVED | Master §5 (third bullet); Foundations §3.2 (PlayMove definition); Foundations §6 traceability | `PlayMove` payload is now `{ cardRef, clientSeq }` only — no seat/player id in payload. Master §5 states "host binds {connection, seat, session} and ignores client-sent seat/player ids." Foundations §3.2 explicit: "host derives it from the bound connection, SEC-002." Traceability line confirms SEC-002 resolved in Foundations. |
| LMCD-RC-09-SEC-003 | PARTIALLY | Master §5 (fourth bullet); Foundations §3.1 (Envelope with `seatToken`); 1B §2.3, §3 | Separate admission vs resume tokens, match-scoped, single active connection, and host-confirmed reclaim are all specified. The `seatToken` field appears in the envelope. However, **token rotation on reconnect and exact expiry/invalidation mechanics are deferred to 1A/1B implementation** — the design says "token lifecycle/hardening in 1A/1B" (Foundations §6 traceability) but 1A does not pin down the rotation protocol steps. The `BAD_SEAT_TOKEN` error code exists; the server-side rotation sequence (issue new token on reconnect, invalidate old) is not spelled out. This is a residual MAJOR gap to close in a 1A implementation note or ticket. |
| LMCD-RC-09-SEC-004 | RESOLVED | Foundations §4 (entire section); Master §5 (second bullet) | `projectStateForSeat` is the only host→client state producer. Hard prohibitions are test-gated (Foundations §4.2): `GameState`, `currentRound.players[].cards` (other seats), `cardsBySuit`, `pastRounds` raw hands, `StateDebug` output are all explicitly forbidden in outbound payloads, persisted logs, debug UI, and reconnect snapshots. Fuzz test and per-seat snapshot oracle required by §4.3 acceptance. This fully meets the suggested change. |
| LMCD-RC-09-SEC-005 | WONT-FIX (acceptably deferred) | Master §6 (R2 row); Master D5; 1B §2.5 | Explicitly deferred as D5. Master §6 states "hidden-hand handoff needs trusted successor or crypto (future)" and cites SEC-005. 1B §2.5 repeats "mirror only the public log; hidden-hand handoff needs a trusted successor or crypto." The trigger condition ("host-drop rate high in real play") is defined. The security note recommended in round-1 is present and correctly frames the privacy conflict. The deferral is acceptably documented. |
| LMCD-RC-09-SEC-006 | RESOLVED | Master §4 §F (F3 note); Master §5 (last bullet); 1B §3 (last bullet) | Master §4 F now explicitly states "F2's audit trail does not stop a malicious host (anti-host begins at F3)." 1B §3 restates "F2 audit trail ≠ anti-host cheating; that's F3 (deferred)." The ambiguity in the "audit trail" wording is corrected. |
| LMCD-RC-09-SEC-007 | RESOLVED | 1B §3 (QR credential rules bullet); 1A §3.3 (pairing descriptor) | 1B §3 lists: Android ephemeral hotspot creds only, stop/rotate after match, don't encode reusable iOS hotspot passwords by default, expire room tokens on lobby close, warn before showing network credentials. 1A §3.3 specifies the optional second Wi-Fi QR is Android `LocalOnlyHotspot` ephemeral creds only. All five points from the suggested change are covered. |
| LMCD-RC-09-SEC-008 | RESOLVED | Master §5 (fifth bullet); 1A §1.2 (static-serving contract, allowlist); 1B §3 (embedded-server abuse resistance) | Master §5 lists bind to LAN/hotspot interface, random high port, allowlist of exported assets, no dir listing/debug, strict schemas, size/rate/connection caps. 1A §1.2 includes "serve an allowlist of exported assets only (no dir listing/debug)." 1B §3 verifies all these controls under reconnect/AI flows. |
| LMCD-RC-09-SEC-009 | RESOLVED | Master §5 (sixth bullet); 1B §1.5 (mDNS minimisation) | Master §5: "mDNS advertises only an opaque room id + protocol version + capabilities — never names/state." 1B §1.5 repeats this verbatim and adds validation of multicast-disabled APs, VLANs, and iOS permission strings. |

---

## New issues (v2)

### LMCD-RC2-09-SEC-001

**Severity:** MAJOR
**Section:** Foundations §3.1 (Envelope); 1A §3.3 (pairing descriptor)
**Concern: `seatToken` exposed in the URL query string**
The join URL is `http://<ip>:<port>/join?room=<roomToken>&seat=<seatToken?>`. Per
Foundations §3.1 the `seatToken` is the per-seat resume token used for host-confirmed
reclaim — a bearer credential. Embedding it in a URL query parameter means it appears
in:
- browser history and bookmarks on the guest device,
- server-side access logs if any (even the embedded server's request log),
- the Referrer header on any outbound request the `/join` page triggers (fonts, analytics,
  any third-party asset accidentally bundled),
- shareable link previews on mobile OS share sheets.

For Phase 1 (trusted LAN) the risk is limited but non-trivial: a guest could
inadvertently share the seat token, allowing another LAN participant to reclaim the seat.
**Recommendation:** Deliver the `seatToken` only over the authenticated WebSocket/SSE
channel after the host verifies the `roomToken`-based `JoinRequest`. The QR/URL should
carry only the `roomToken` (room admission); the per-seat resume token is issued by the
host post-authentication and stored in client-side session storage (not the URL). If a
pre-encoded seat URL is genuinely needed (e.g. reserved seat), rotate the token
immediately on first use.

---

### LMCD-RC2-09-SEC-002

**Severity:** MAJOR
**Section:** Foundations §3.2 (`DealRound`); §1.1 seeded deal
**Concern: `dealSeed` delivery channel and confidentiality**
Foundations §3.2 specifies that `DealRound` carries "the `dealSeed` to the host only /
per-seat dealt hands to clients." This is the right intent, but the mechanism is
ambiguous: if `DealRound` is a broadcast message with a conditional payload, a
client-side bug or a logging path that serializes the full envelope could expose
`dealSeed` to all clients. Knowing `dealSeed` + the PRNG algorithm allows a client to
reconstruct every other player's hand before cards are played.

Additionally, §1.1 notes that the seeded deal "enables (later) commit-reveal
verification," which implies the seed will eventually be disclosed post-round — but
there is no protocol message for seed reveal, and the spec does not distinguish
"seed confidential during play" vs "seed disclosed at round end." If the seed leaks
during play (e.g. through a debug log, error payload, or SSE replay), hand secrecy is
fully defeated.

**Recommendation:**
1. Define `DealRound` as two distinct messages: `DealRoundHost` (host-internal, carries
   `dealSeed`) and `DealRoundClient` (broadcast, carries only the recipient's dealt
   hand as `localHand: Card[]`). The host never sends `dealSeed` over the wire.
2. Add `dealSeed` to the hard-prohibition list in Foundations §4.2 alongside `GameState`
   and raw hands.
3. If commit-reveal is added in a future phase, define a separate `RoundSeedReveal`
   message sent only after all hands are complete.

---

### LMCD-RC2-09-SEC-003

**Severity:** LOW
**Section:** 1B §2.2 (heartbeats); 1B §1.2 (failure taxonomy)
**Concern: Heartbeat constants and grace period create a seat-squatting window**
The proposed defaults (N=5 s ping interval, M=3 missed pings → `grace` state) mean a
disconnected seat can remain in the `grace` state for up to 15 seconds before the
host considers it `disconnected`, and then a further "host-configurable timeout" before
AI takeover. The spec does not bound this second timeout. During the combined window
a malicious or misbehaving peer could:
- hold a seat open without participating (denial of progress),
- after eventual AI takeover, attempt a reconnect with the original `seatToken` to
  reclaim the seat mid-hand (the reclaim happens at "next turn boundary," which is
  reasonable, but the token expiry relative to the grace+timeout window is unspecified).

This is low severity for trusted LAN play, but the absence of an upper bound on the
host-configurable pause timeout means a host could (accidentally or deliberately) freeze
a game indefinitely.

**Recommendation:** Document a maximum permissible pause timeout (e.g. 120 s) and
specify that `seatToken` validity is bounded by `match end` plus a short buffer (e.g.
60 s), not indefinite. Add these as implementation constants with rationale in the 1B
heartbeat section, and include a test case for token rejection after match end.

---

## Bottom line

The v2 docs represent a substantial and largely complete response to the round-1 security
review. Seven of nine comments are fully resolved, with concrete schema, test-gated
enforcement, and explicit deferral documentation where applicable. The design is
acceptable to proceed to implementation under the following conditions:

1. **SEC-003 token rotation** (PARTIALLY resolved): the 1A implementation ticket must
   specify the precise server-side rotation sequence — issue new `seatToken` on
   reconnect, invalidate the previous one — before the reconnect handshake is coded.

2. **LMCD-RC2-09-SEC-001** (MAJOR — new): the `seatToken` must not travel in the URL
   query string; deliver it post-authentication over the WebSocket/SSE channel only.

3. **LMCD-RC2-09-SEC-002** (MAJOR — new): `dealSeed` must never leave the host process
   over any wire path; add it to the §4.2 hard-prohibition list and split `DealRound`
   into host-internal vs client-facing messages.

4. **LMCD-RC2-09-SEC-003** (LOW — new): bound the pause timeout and `seatToken`
   validity window; add implementation constants and a post-match token rejection test.

No new BLOCKERs are identified. The deferred items (R2 host migration, F3 trustless
deal) are documented with acceptably clear rationale and explicit triggers.
