# Cotecc Agent Index

Project agents live in `.claude/agents/`. Use this page as a routing table; open the full prompt only when you are about to delegate work.

## Model Routing

- `opus`: ambiguous, high-risk architecture or game-engine correctness.
- `sonnet`: senior specialist implementation, review, QA, UX, and release work.
- `haiku`: bounded tasks with exact files, expected behavior, and objective checks.

## Agents

| Agent | Model | Use for |
| --- | --- | --- |
| `cotecc-principal-architect` | `opus` | Architecture, multiplayer phase boundaries, redaction, protocol, and plan/spec reviews. |
| `cotecc-senior-gameplay-engineer` | `opus` | Game-rule correctness, deterministic replay, serialization, card identity, and risky engine changes. |
| `cotecc-senior-expo-engineer` | `sonnet` | Expo/React Native screens, components, navigation, state boundaries, and platform-safe UI changes. |
| `cotecc-qa-regression-lead` | `sonnet` | Regression strategy, guardrails, coverage risk, Jest focus areas, and PR verification plans. |
| `cotecc-ux-accessibility-reviewer` | `sonnet` | Gameplay readability, accessibility, touch targets, localization, responsive layout, and screenshot review. |
| `cotecc-release-tooling-engineer` | `sonnet` | CI, build scripts, Docker web packaging, screenshot tooling, EAS/native automation, and release safety. |
| `cotecc-bounded-task-executor` | `haiku` | Exact-file tasks, simple docs/config updates, repo searches, narrow test fixes, and objective verification. |
