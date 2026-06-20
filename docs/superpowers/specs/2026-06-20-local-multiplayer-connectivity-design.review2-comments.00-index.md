# Round-2 Review Index — Local Multiplayer v2

**Date:** 2026-06-20
**Reviewed:** v2 specs (master + foundations + phase1a + phase1b)
**Reviewers (8, focused subset):** architect, game, network, expo/RN, api, security, qa, ui/ux
**Round-2 comment IDs:** `LMCD-RC2-<NN>-<ROLE>-<SEQ>`
**Exit criteria (from consolidation §7):** all 4 round-1 blockers resolved · all round-1 high resolved or explicitly deferred · **no new blocking issues**.

## 1. Round-1 coverage — verdicts per reviewer

| Reviewer | Round-1 comments | Resolved | Partially | Not-addressed | Deferred (won't-fix w/ rationale) |
|---|---:|---:|---:|---:|---:|
| 01 architect | 10 | 7 | 2 | 0 | 1 (ARCH-005) |
| 03 game | 8 | 6 | 1 (GAME-008) | 0 | 1 (GAME-007) |
| 04 network | 14 | 11 | 2 | 0 | 1 |
| 05 expo/RN | 7 | 5 | 1 (EXPO-007) | 0 | 1 |
| 08 api | 8 | 7 | 1 (API-004) | 0 | 0 |
| 09 security | 9 | 7 | 1 (SEC-003) | 0 | 1 |
| 10 qa | 10 | 7 | 2 | 0 | 1 |
| 12 ui/ux | 12 | 10 | 2 (UX-005, UX-011) | 0 | 0 |
| **Total** | **109** | **~60** | **~12** | **0** | **~6** |

**Key result:** **0 round-1 comments NOT-ADDRESSED.** All **4 blockers** (ARCH-002,
API-001, QA-001, UX-003) verified **RESOLVED**. Remaining round-1 items are either
**partials** (refinements) or **explicitly deferred** decisions (R2 host migration,
F3 trustless) judged acceptably documented.

### Notable partials to fold into v2.1
- **SEC-003** (token rotation-on-reconnect sequence not pinned).
- **API-004** (idempotency de-dup window / out-of-order rule not stated).
- **GAME-008** (F3 two-level split not carried into the deferred backlog).
- **EXPO-007** (`expo-dev-client` implied, not named; `runtimeVersion` left open).
- **UX-005 / UX-011** (failure-taxonomy rows + a11y criteria are structural, not yet populated/testable).

## 2. New issues raised in round 2

| ID | Sev | Theme |
|---|---|---|
| RC2-10-QA-001 | **BLOCKER** | No CI-runnable harness for the host-served bundle; 1A Playwright gate can't execute in CI without a device/loopback Node server spec |
| RC2-12-UX-002 | HIGH | Game-over / rematch flow unspecified; browser guests stranded after match end |
| RC2-05-EXPO-001 | HIGH | Web-asset embedding not guarded at build time; `expo prebuild --clean` can silently ship a binary without the bundle |
| RC2-01-ARCH-002 | MAJOR | `DealRound` `dealSeed` host-vs-client distribution ambiguous |
| RC2-09-SEC-002 | MAJOR | `dealSeed` delivery ambiguity → opponents' hands reconstructable if it hits the wire/log; must be host-internal + on the §4.2 prohibition list |
| RC2-09-SEC-001 | MAJOR | `seatToken` in the join URL query leaks a bearer credential (history/Referrer/share); deliver post-join over the channel |
| RC2-08-API-001 | MAJOR | Dual sequence mechanisms (`clientMessageId` vs `clientSeq`) with no reconciliation/ordering rule |
| RC2-01-ARCH-001 | MAJOR | Phase 0 exit doesn't require `GameScreen` to consume **only** `SeatView` (no lint/type guard) |
| RC2-10-QA-002 | MAJOR | QR TTL / refresh cadence / expired-token code unspecified → 1B expired-QR test unmeasurable |
| RC2-10-QA-003 | MAJOR | Device lab is an intent statement, not a falsifiable gate (no API floor / evidence standard / inventory) |
| RC2-03-GAME-001 | MED | Canonical card-sort order not pinned in hydrator/codec → false `MUST_FOLLOW_SUIT` after round-trip |
| RC2-03-GAME-002 | MED | `legalActions` behaviour outside `playing` phase + phase→client-state mapping unspecified |
| RC2-05-EXPO-002 | MED | EAS Update vs binary release for embedded bundle still open; OTA/embedded-server interaction unacknowledged |
| RC2-05-EXPO-003 | MED | `expo-dev-client` not a 1A dependency; **all** iOS participants need a dev client once any native module lands |
| RC2-12-UX-001 | MED | QR/token expiry has no TTL/refresh trigger/countdown → silent expiry blocks late joiners |
| RC2-12-UX-003 | MED | Host AI-takeover timeout has no default/range/lobby indicator |
| RC2-08-API-002 / 04-NET-002 / 04-NET-003 / 08-API-003 / 08-API-004 / 03-GAME-003 / 09-SEC-003 | MINOR/LOW | DealRound fan-out; iOS no-internet dialog; iOS Local Network silent Bonjour failure; `LobbyUpdated`/`StateDelta` schemas; AI-before-DealRound reconnect; seat-squatting window |

## 3. Cross-reviewer convergence (highest-confidence fixes)

- **`dealSeed` distribution is the #1 must-fix** — independently flagged by architect
  (RC2-01-ARCH-002), security (RC2-09-SEC-002), api (RC2-08-API-002) and game
  (RC2-03-GAME-003). Root cause: Foundations §3.2 has a sloppy parenthetical. Fix:
  **`dealSeed` is host-internal; the host sends each client only its own `localHand`
  via `SeatSnapshot`; add `dealSeed` to the §4.2 hard-prohibition list.**
- **Bearer-token-in-URL** (RC2-09-SEC-001) directly contradicts the security posture;
  fix the 1A §3.3 join-URL contract to carry only the **room** token, with the
  per-seat resume token issued post-join over the channel.
- **CI testability of the host-served bundle** (RC2-10-QA-001, the new blocker) — the
  1A release gate must define a loopback/Node harness that serves the exported bundle
  so Playwright can run headless in CI; physical-device runs are supplementary.

## 4. Exit-criteria assessment

| Criterion | Status |
|---|---|
| All 4 round-1 blockers resolved | ✅ Met |
| All round-1 high resolved or explicitly deferred | ✅ Met (remainder are partials/deferred-with-rationale) |
| No new blocking issues | ❌ **Not met** — 1 new BLOCKER (RC2-10-QA-001) + 2 HIGH + 7 MAJOR |

**Conclusion:** v2 successfully closed every round-1 concern, but round 2 surfaced a
small, well-scoped set of new gaps (mostly clarifications the deeper contracts
exposed). **A focused v2.1 patch** addressing the new BLOCKER/HIGH/MAJOR items —
plus the §1 partials — should clear the exit criteria. The items are surgical doc
edits, concentrated in Foundations §3–§4 and Phase 1A §1/§3/§4.

## 5. Recommended v2.1 fix list (priority order)
1. **dealSeed host-internal + prohibition** (RC2-01-ARCH-002, RC2-09-SEC-002, RC2-08-API-002, RC2-03-GAME-003) — Foundations §3.2/§4.2.
2. **seatToken out of URL; issued post-join** (RC2-09-SEC-001) — 1A §3.3.
3. **CI harness for host-served bundle** (RC2-10-QA-001) — 1A §4.1.
4. **Game-over/rematch flow + browser-guest exit** (RC2-12-UX-002) — 1A §3.
5. **Build-time embed guard tied to prebuild** (RC2-05-EXPO-001) — 1A §1.3.
6. **Sequence-mechanism reconciliation/ordering rule** (RC2-08-API-001, API-004) — Foundations §3.1.
7. **GameScreen-consumes-only-SeatView as Phase 0 exit + lint/type guard** (RC2-01-ARCH-001) — Foundations §2/§5.
8. **QR/token TTL + refresh + AI-timeout default/indicator** (RC2-10-QA-002, RC2-12-UX-001/003) — 1A §3.3, 1B §2.3.
9. **Falsifiable device lab + canonical card-sort + legalActions/phase mapping + expo-dev-client dep + minor schemas** (RC2-10-QA-003, RC2-03-GAME-001/002, RC2-05-EXPO-003, RC2-08-API-003/04) — across Foundations/1A/1B.
