---
name: nextjs-16-production-workflow
description: "Trigger: production Next.js feature, ship App Router change. Execute version-aware discovery, security, caching, tests, and review."
license: Apache-2.0
metadata:
  author: "miguelgcd"
  version: "1.0"
---

## Activation Contract

Use for authorized feature delivery, not learning audits. Load applicable generic Next.js, Zod, TypeScript, and React skills through the reference.

## Hard Rules

- Check package, lockfile, and resolved installed Next.js versions; use version-matched official docs, not assumed bundled docs.
- Keep the DAL server-only; expose minimal DTOs.
- Validate input and enforce authentication/authorization at every Server Action and Route Handler; Proxy/page checks never secure mutations.
- Preserve scope; never install tooling or enable Cache Components implicitly.

## Decision Gates

| Condition | Action |
| --- | --- |
| Runnable tests exist | Require behavior RED before implementation, GREEN afterward. |
| Tests unavailable | Report the gap; seek setup approval. |
| Cache Components needed | Verify version/config; justify caching versus request-time Suspense. |

## Execution Steps

1. Read the reference; discover routes, ownership, boundaries, and acceptance criteria.
2. Use `nextjs-testing-workflow`: capture RED, implement minimally, then GREEN and negative cases.
3. Check server/client imports, DTOs, and endpoint security.
4. Decide `use cache`, `cacheLife`, `cacheTag`, Suspense, and precise invalidation; protect user isolation.
5. Verify loading, error, and not-found UX; run approved focused checks and the production build.
6. Request bounded behavior/security/cache review; report unresolved findings.

## Output Contract

Return scope, version/sources, boundary/cache decisions, RED/GREEN, exact checks/results, unavailable evidence, and review scope.

## References

- [Official workflow](references/official-workflow.md) — sourced rules, project decisions, and companion skills.
