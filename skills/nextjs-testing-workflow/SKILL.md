---
name: nextjs-testing-workflow
description: "Trigger: Next.js test strategy, Vitest, RTL, async Server Component tests. Select behavior tests and verify isolated production journeys."
license: Apache-2.0
metadata:
  author: "miguelgcd"
  version: "1.0"
---

## Activation Contract

Use for testing, alongside `nextjs-16-production-workflow` for delivery. Load global `playwright` for browser mechanics.

## Hard Rules

- Check package, lockfile, resolved Next.js version, and version-matched official testing docs.
- Require behavior RED before implementation and GREEN afterward where tests run.
- Use deterministic DB fixtures; never share mutable users or touch production data.
- Report missing Mongo credentials as unavailable integration/E2E evidence, never a pass. Never expose secrets.
- Do not install runners or browsers without approval.

## Decision Gates

| Behavior | Runner |
| --- | --- |
| Synchronous units/components, integration seams | Vitest; React Testing Library for rendered behavior. |
| Async Server Components, full journeys | Playwright against the running app. |
| Missing runner or database access | Propose setup; report skipped/unavailable checks. |

## Execution Steps

1. Read the strategy; inspect scripts, fixtures, and dependencies, never credential files.
2. Map acceptance criteria to minimal behavior tests and expected failures.
3. Capture RED, implement, then GREEN; add invalid-input, anonymous, unauthorized, and cross-user cases.
4. Isolate fixtures per test/worker; check persistence and cache isolation.
5. Run focused tests; prefer production build/start E2E. Disclose development-server fallback limits.
6. Keep checks green during refactoring; report evidence before expanding scope.

## Output Contract

Return coverage, runner/version evidence, RED/GREEN, commands/results, fixture isolation, server mode, and failed/skipped/unavailable checks.

## References

- [Testing strategy](references/testing-strategy.md) — official support boundaries, project decisions, and global Playwright skill.
