# Prove behavior at the smallest trustworthy boundary

Use fast synchronous tests for local feedback and browser tests for framework-integrated behavior. This is the project's chosen workflow, not a claim that Next.js mandates one test stack.

## Official source map

These official URLs were supplied as verified sources for this work unit; they were not fetched again during authoring. Recheck these living pages against the resolved project version before using setup examples.

| Source | Sourced guidance |
| --- | --- |
| [Vitest](https://nextjs.org/docs/app/guides/testing/vitest) | Use Vitest with React Testing Library for unit tests. Vitest does not currently support async Server Components; use E2E coverage for those components. |
| [Playwright](https://nextjs.org/docs/app/guides/testing/playwright) | Exercise the running Next.js application through Playwright; prefer testing production code with build/start rather than only development mode. |
| [Data security](https://nextjs.org/docs/app/guides/data-security) | Validate inputs and authorize server-side data access; Server Actions are public-facing endpoints, not protected by UI visibility. |
| [AI agents](https://nextjs.org/docs/app/guides/ai-agents) | Source framework facts from matching documentation; reserve skills for repeatable workflows. |

## Project decisions: runner selection

Before implementation, inspect the manifest, lockfile, installed Next.js resolution, existing scripts, and test configurations. Record mismatches. The current project pins **Next.js 16.0.10** and configures Vitest, React Testing Library, V8 coverage, and Playwright. Revalidate this baseline; the skills do not authorize dependency changes, browser downloads, configuration changes, or test execution.

Use official network docs compatible with 16.0.10. A missing installation means the resolved version is unavailable, not confirmed. Flag unsupported or uncertain latest-doc instructions before adopting them.

| Scope | Chosen proof | Avoid |
| --- | --- | --- |
| Pure rules, validation, DTO mapping | Vitest input/output tests | Asserting private implementation details |
| Synchronous interactive components | Vitest + React Testing Library, user-visible roles and outcomes | Snapshot-only assertions or internal hook inspection |
| DAL/action/handler integration seams | Vitest with controlled dependencies; real isolated test DB when persistence is the claim | Calling a mocked persistence test database integration |
| Async Server Components, authentication, routing, complete mutations | Playwright against the running app | Treating a mocked synchronous render as async RSC coverage |

Load the existing [global Playwright skill](/home/miguelgcd/.config/opencode/skills/playwright/SKILL.md) for selectors, exploration, and page-object reuse. Report unavailable tools and follow its documented fallback; do not copy its templates here. Pair with the [production workflow](../../nextjs-16-production-workflow/SKILL.md) for feature delivery.

## Project decisions: behavior-first loop

1. Map each acceptance criterion to observable behavior and the smallest runner that can prove it.
2. With runnable tests, add one test before production changes. Record the intended assertion failure as RED; runner/import failures are setup failures.
3. Implement minimally and observe GREEN with the same focused command.
4. Add relevant alternate/security cases, then refactor while focused checks remain green. Broader suites require an explicitly selected scope.
5. If the runner is unavailable, report the missing prerequisite and proposed setup; never fabricate a passing test or claim strict TDD was exercised.

Protect each applicable boundary with invalid input, anonymous access, insufficient permissions, and user A attempting user B's resource. Assert denied operations do not modify state or leak private fields. Check direct endpoint/action access, not only hidden UI. After successful writes, verify persisted state and intended cache freshness; compare separate users' views to detect cache leakage. Include loading, error recovery, and missing-resource behavior where the feature depends on them.

## Project decisions: deterministic database isolation

Use a dedicated non-production database with deterministic seed values and controlled clock/random inputs where behavior depends on them. Namespace records by run, worker, and test; give each test its own mutable users and browser authentication context. Never share a mutable account across parallel tests or rely on execution order.

Provision through approved fixture helpers; clean up only records owned by that test namespace in teardown, including failure paths. Do not globally drop collections or repurpose a developer's personal account. Existing ad-hoc seed scripts are not automatically safe fixtures; inspect and authorize them separately.

Check credential availability without reading or printing secret values or credential files. When Mongo credentials or an isolated test database are unavailable, report exactly which integration/E2E checks were skipped or could not start and why. Run independently available pure tests; mocked GREEN is not evidence of persistence, authentication integration, or user isolation in Mongo.

## Project decisions: production E2E and evidence

Prefer the repository's approved production build and start commands followed by the selected Playwright spec. Let approved runner lifecycle configuration manage server readiness and shutdown; record the tested server mode. If only development mode is practical, identify the constraint and leave production-specific behavior unverified. Never silently download browsers or start against a production database.

Return a compact evidence table: behavior, runner, exact command, observed result, server mode, fixture isolation, and limitations. Distinguish passed, failed, skipped, and unavailable; give the prerequisite for each missing check. Missing Mongo access is an explicit coverage gap, not a passing suite. A build alone is not E2E evidence.
