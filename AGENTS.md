# Project agent guidance

## Next.js documentation

Check `package.json` and the resolved installed Next.js version before giving framework advice or changing code. Read installed-version documentation when available; do not assume latest documentation matches this project.

This app currently pins **Next.js 16.0.10**. Bundled docs are unavailable before **16.2**, so use [official Next.js 16 documentation](https://nextjs.org/docs/app/guides/upgrading/version-16) and check patch applicability. Newer 16.2 bundled-docs and 16.3 automatic `AGENTS.md` guidance does not apply retroactively; see [AI-agent guidance](https://nextjs.org/docs/app/guides/ai-agents). Disclose unavailable documentation or uncertain version compatibility.

## Skills

Load the matching skill before the task. Resolve project-relative paths from this repository root.

| Skill | Triggers and scope | Path |
| --- | --- | --- |
| `nextjs-16` | Next.js 16 implementation/review, App Router, Server Actions, `proxy.ts`, Cache Components, upgrades; generic framework patterns. | `/home/miguelgcd/.agents/skills/nextjs-16/SKILL.md` |
| `nextjs-16-learning-audit` | Learning audit, project coverage, ranked gaps, learning sequence, next exercise; project-specific read-only assessment and bounded proposals. | `skills/nextjs-16-learning-audit/SKILL.md` |
| `nextjs-16-production-workflow` | Authorized production feature work, ship App Router change; discovery through security, cache decisions, verification, and bounded review. | `skills/nextjs-16-production-workflow/SKILL.md` |
| `nextjs-testing-workflow` | Test strategy, Vitest, React Testing Library, async Server Component tests, Playwright verification; runner selection, isolated fixtures, and behavior evidence. | `skills/nextjs-testing-workflow/SKILL.md` |
| `better-auth-security-workflow` | Better Auth, session lifecycle/revocation, client/server auth boundaries, protected entry points, resource ownership; authentication and authorization checks. | `/home/miguelgcd/.agents/skills/better-auth-security-workflow/SKILL.md` |
| `mongoose-integrity-workflow` | Mongoose validation, MongoDB transactions, rollback, concurrent writes, tenant isolation; persistence invariants and failure-path evidence. | `/home/miguelgcd/.agents/skills/mongoose-integrity-workflow/SKILL.md` |
| `vercel-observability-workflow` | Vercel local/preview/production environments, Sentry, structured logs, deployment gates, rollback; operational readiness and recovery evidence. | `/home/miguelgcd/.agents/skills/vercel-observability-workflow/SKILL.md` |

For learning audits, load both: the project workflow governs assessment and selection; the generic skill supplies framework patterns. Report a missing skill rather than silently substituting it. Separate correctness/security findings from optional learning topics, and never implement a proposed exercise without explicit user selection.

For authorized feature delivery, load `nextjs-16-production-workflow` with generic `nextjs-16`; add `nextjs-testing-workflow` for behavior verification. For test-only work, load the testing workflow and global `playwright` when browser tests are involved. The workflow references link applicable global Zod, TypeScript, React, and Playwright skills; load those for mechanics rather than duplicating framework knowledge. Test planning alone does not authorize implementation, dependency installation, or database access. Keep learning audits read-only and distinct from delivery; a generic framework question alone does not activate the full production workflow.

Load `better-auth-security-workflow` for session and access-control decisions; add `mongoose-integrity-workflow` when ownership must be enforced in persistence or writes span documents. Load `vercel-observability-workflow` for environment, telemetry, and release/recovery work—not for ordinary component styling or generic framework advice. Compose these with the production/testing workflows only where their boundaries overlap; none authorizes dependency installation, credential provisioning, or deployment. Project decisions are Zod 4, Vitest + Playwright, Vercel, and Sentry + structured logs; verify installed/configured status separately. MongoDB credentials will arrive later, so report unavailable integration evidence rather than simulated success.
