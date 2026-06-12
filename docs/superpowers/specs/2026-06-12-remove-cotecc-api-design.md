# Remove `cotecc-api` — Design

**Date:** 2026-06-12
**Sub-project:** A (of A→B→C→D structural review)
**Branch:** `chore/remove-cotecc-api`

## Context

`cotecc-api` is an Express service whose only route is `GET /health` returning
`{status:'ok'}`. It has no game logic, auth, or persistence. The `CoteccApp`
client makes zero network calls (no `fetch`/`axios`/websocket references in
`CoteccApp/src`); the game is fully local with AI opponents, and `AuthScreen`
is UI-only (login/register/guest all just navigate, no backend).

The service therefore carries cost (a Docker service, a CI job, a dependency
surface to patch) for zero current value. A future backend, if needed, would be
built fresh — most likely as Expo Router API Routes inside the app — and would
not migrate from this empty Express skeleton. So keeping it as a "placeholder"
buys nothing.

**Decision:** remove it now. Git history preserves it if ever wanted back.

## Changes

1. **Delete** the entire `cotecc-api/` directory (src, tests, `Dockerfile`,
   `package.json`, `package-lock.json`, `dist/`, `coverage/`, `node_modules/`).
2. **`docker-compose.yml`** — remove the `cotecc-api` service block. Only the
   `cotecc-web` service remains.
3. **`.github/workflows/app-build.yml`** — remove the `api-unit-tests` job. The
   `unit-tests` (app) and `web-docker-image` jobs remain unchanged; the web job
   already scopes its compose commands to `cotecc-web`, so it is unaffected.
4. **`doc/DEVELOPMENT.md`** — remove the `### api` scaffolding section that
   documents how `cotecc-api` was bootstrapped.

## Explicitly left alone

- `doc/BASELINE-2026-06-11.md` and
  `docs/superpowers/plans/2026-06-11-baseline-review.md` are dated point-in-time
  snapshots, not living docs. Rewriting them would falsify a historical record,
  so they keep their `cotecc-api` mentions.

## Verification

- `docker compose config` parses successfully and lists only `cotecc-web`.
- `.github/workflows/app-build.yml` is valid YAML and retains exactly two jobs
  (`unit-tests`, `web-docker-image`).
- A repo-wide grep for `cotecc-api` (excluding `node_modules`/`.git`) returns
  only the two intentional historical-doc mentions above.

## Out of scope

Dependency/SDK upgrade (B), Expo Router migration (C), and EAS Build CI (D) are
separate sub-projects with their own specs.
