# Local Multiplayer Connectivity — Reference & archives

Single entry point for the local-multiplayer design history. Working documents are
zipped **by revision** under `archive/`; only the current (v3) specs and this
reference stay loose.

## Current design (v3) — live
- `2026-06-20-local-multiplayer-connectivity-design.md` — master / decision record
- `2026-06-20-local-multiplayer-foundations-design.md` — Phase 0 contracts
- `2026-06-20-local-multiplayer-phase1a-lan-mvp-design.md` — Phase 1A LAN MVP
- `2026-06-20-local-multiplayer-phase1b-robustness-design.md` — Phase 1B robustness

## Latest review (the only one referenced here)
**Round 2** (8 focused reviewers) against the v2 specs. Result: all 109 round-1
comments addressed (0 not-addressed, all 4 blockers resolved); round 2 raised
1 new blocker + a few high/major items, **all folded into v3** (see each spec's
"v3 changes" note and the master §10 v2→v3 change log). The round-2 review files and
their index live in `archive/local-multiplayer-rev2.zip`.

## Archives (by revision)
| Archive | Contents |
|---|---|
| `archive/local-multiplayer-rev1.zip` | v1 master (`…connectivity-design.v1.md`), the 12 round-1 review files + `00-index`, and the consolidation/dependency-graph + v2 plan |
| `archive/local-multiplayer-rev2.zip` | v2 snapshots of all four specs (`*.v2.md`) and the 8 round-2 review files + `review2-comments.00-index` |

Older revisions of any live file are also recoverable from git history (v1 master
commit `78009ca`; v2 specs commit `445abac`).
