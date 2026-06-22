# Local Multiplayer — Implementation Plans (index & execution contract)

**Date:** 2026-06-21 · Derived from the v3.1 specs (`docs/superpowers/specs/2026-06-20-local-multiplayer-*.md`).

These plans turn the v3.1 design into **step-by-step work that a low-capability
executor (a less powerful model, or a junior engineer with no domain context) can
run without making design decisions.** Everything ambiguous has been resolved here
or explicitly flagged as a human/strong-agent **GATE**.

## The plans

| Plan | Spec it implements | Status | Executable by weak models? |
|---|---|---|---|
| `2026-06-21-phase0-foundations-plan.md` | Foundations (Phase 0 contracts) | ✅ **DONE** (PR #52, `5e2e7b6`) | **Yes, end-to-end.** Pure TypeScript + Jest in `CoteccApp/`. No devices, no decisions. This is the centerpiece. |
| `2026-06-21-phase1a-lan-mvp-plan.md` | Phase 1A LAN MVP | 🔄 **IN PROGRESS** — platform-independent tasks (T2/T5/T6/T9/T10 web/harness/CI) underway; **SPIKE GATE (T1) still open** (native socket runtime — human/hardware) | **Partly.** The SPIKE GATE must be resolved by a human; the post-gate web/harness tasks are weak-model executable and run against the exported web bundle. |
| `2026-06-21-phase1b-robustness-plan.md` | Phase 1B robustness | ⏳ not started | **Partly.** Logic/UX tasks are weak-model executable; device-lab cells are **manual GATES**. |

Build strictly in order: **Phase 0 → 1A → 1B.** Nothing in 1A is correct until
Phase 0's contracts exist and are green. **Phase 0 is now green on `main`**, so 1A work
has begun — starting with the tasks that do not depend on the native runtime (they run
against `expo export`'s web bundle via the headless Node harness).

## Why this structure (the three goals you asked for)

### 1. Goals are stressed, not implied
Every plan opens with a **Goal** and an explicit **Non-Goals** list, and every task
states the one observable outcome it produces. A task is "done" only when its
**exit command** prints the expected output — never "looks right".

### 2. Guardrails are automated, not trusted to the executor
The executor cannot self-certify. These automated gates run in CI and locally and
are the *only* definition of done:

| Guardrail | What it catches | Command |
|---|---|---|
| **Type boundary** | client code importing engine `GameState` | `npm run lint` (custom `no-restricted-imports` rule, Phase 0 T13) |
| **Redaction oracle** | any seat's payload leaking another seat's cards or `dealSeed` | `npm test -- seatView` (Phase 0 T9) |
| **Codec round-trip** | `Set`/numeric-key serialization corruption | `npm test -- codec` (Phase 0 T7) |
| **Deal reproducibility** | non-deterministic deal | `npm test -- prng deal` (Phase 0 T1–T2) |
| **Card-identity property test** | `cards`/`cardsBySuit` desync after a wire round-trip | `npm test -- hydrate cardsLogic` (Phase 0 T3, T6) |
| **Golden frame fixtures** | accidental wire-protocol changes | `npm test -- protocol` (Phase 0 T10/T14) |
| **Coverage floor** | untested new code | `npm test` (jest threshold: stmts 88 / branch 77 / fn 85 / lines 88 — must not drop) |
| **Offline regression** | behaviour change to existing single-device play | `npm test` (existing suites stay green) |
| **Embed hash guard** | binary shipped without / with stale web bundle | `build-native` CI check (Phase 1A) |

If a guardrail is red, the task is not done. There is no manual override.

### 3. Ambiguity is removed
- Exact file paths on every task (`Create` / `Modify path:line` / `Test`).
- Complete code in steps for the high-risk engine-correctness tasks (where a weak
  model would otherwise guess wrong).
- Every referenced type/function is defined in an earlier task in the same plan.
- Decisions that genuinely require judgement or hardware are isolated as **GATE**
  tasks with a checklist and a recorded decision, not left inline.

## Execution protocol for a weak-model worker

For each task, in order:
1. Read the task's **Files** block — touch only those paths.
2. Do the steps top to bottom. Each step is one action.
3. For a code step, paste the code **exactly**; do not "improve" it.
4. Run the step's **Run:** command and confirm it matches **Expected:**.
5. If a `GATE` task is reached, **stop and hand back to a human/strong agent** — do
   not invent the decision.
6. Commit at the task's commit step with the given message. Small, frequent commits.
7. Never edit a spec or a guardrail to make a test pass. Fix the code.

Recommended driver: `superpowers:subagent-driven-development` (fresh subagent per
task, review between tasks) for Phase 0; same for 1A/1B post-gate tasks.

## Traceability
Each plan task is tagged with the spec section and the original review comment IDs
(`LMCD-RC-*` / `RC2-*` / `RC3-*`) it implements, so a reviewer can map plan → spec →
review without re-deriving context.
