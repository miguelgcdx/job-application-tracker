# Project learning documentation

## Objective

Make the entire Job Application Tracker easier to learn by adding accurate, educational context to important source files and by creating one architecture guide that explains the project, its file responsibilities, and the connections between layers.

## Problem

The project contains production-oriented boundaries—Next.js Server and Client Components, Better Auth, server actions, a service/repository split, MongoDB transactions, optimistic UI state, and privacy-aware observability—that are difficult for a learner to reconstruct from code alone.

## Why

The user is learning from this repository and explicitly requested project-wide explanations, including what files and functions do and why important implementation choices were preferred over alternatives.

## Scope

- Add targeted file-level comments to important application-owned modules.
- Add JSDoc to important exported or non-obvious functions.
- Add inline rationale around invariants, boundaries, and trade-offs.
- Create `docs/architecture-and-learning-guide.md` with architecture journeys and a file ledger.
- Add a short README link to the learning guide.
- Preserve existing comments and all pre-existing worktree changes.
- Explain conventional/generated UI wrappers in the guide rather than commenting every wrapper.

## Constraints

- Next.js is pinned to 16.0.10; do not imply newer framework behavior.
- Comments must explain purpose, boundaries, invariants, and rationale—not narrate syntax or obvious JSX.
- Do not claim `proxy.ts` authorizes mutations; authorization remains at server action/service/repository boundaries.
- Do not duplicate the README environment contract in source comments.
- Do not modify generated output, lockfiles, static images, or coverage files.
- The worktree was already heavily modified before this documentation pass. Those changes are treated as the baseline and must not be overwritten or attributed to this work.
- No commits are authorized in this session; commit evidence remains pending unless the user explicitly requests commits.

## Delivery forecast

- Expected authored documentation/comment additions: more than 400 lines across the complete feature.
- Delivery strategy: `ask-on-risk` if commits or a pull request are later requested.
- Route: delegated direct work because mapping exceeds four files and every implementation unit touches multiple non-trivial files.

## Tasks

- [ ] **LD-1 — Write the architecture learning guide**
  - Create the guide and add a concise README entry link.
  - Explain the goal, architecture, server/client boundaries, request journeys, domain invariants, observability, testing, and every relevant project file.
  - Acceptance: a learner can follow the system from route to UI to mutation to persistence and can identify where to read next.
  - Checks: Markdown structure/readback; project lint.
  - Route: delegated writer; multi-file write trigger.
  - Evidence: in progress. Three initial broad writer attempts timed out without creating the guide. A focused slice then created a 174-line `docs/architecture-and-learning-guide.md` core covering architecture, boundaries, request journeys, invariants, authentication, optimistic UI, observability, testing, and documentation rationale; structural heading checks passed. A second focused slice replaced the ledger placeholder with grouped purpose/dependency/read-next tables and added a minimal README link; the guide is now 267 lines and structural checks passed. Task-level guide verification passed: the guide exists, the README link resolves, all ten required headings and ledger groups are present, each ledger row includes purpose/connection/read-next guidance, no placeholder remains, and project lint passed. Work-unit commit evidence remains pending explicit authorization.

- [ ] **LD-2 — Explain routes, authentication, and interactive UI**
  - Add file-level comments, JSDoc, and rationale only where they provide educational value.
  - Preserve existing behavior and comments.
  - Acceptance: important server/client boundaries, auth flow, optimistic state, and drag/drop calculations are explained without commenting obvious JSX.
  - Checks: focused tests for touched UI/auth areas where available; TypeScript; lint.
  - Route: delegated writer; multi-file write trigger.
  - Evidence: in progress. `lib/auth/auth.ts` received 17 comment-only additions explaining the server boundary, database readiness, cookie-cache revocation trade-off, board initialization hook, and session helpers; `pnpm exec eslint lib/auth/auth.ts` passed. `proxy.ts` now explains request-time redirects, authoritative session lookup, navigation versus access control, and independent ownership enforcement; `pnpm exec eslint proxy.ts` passed. `lib/hooks/useBoards.ts` now documents the optimistic overlay, immutable ordering, transition reconciliation, error reporting, and server security boundary; `pnpm exec eslint lib/hooks/useBoards.ts` passed. `components/kanban-board.tsx` now explains its client boundary, drop-target components, immutable sorting, column-versus-job drops, downward insertion adjustment, and drag feedback; focused ESLint passed. `components/create-job-dialog.tsx` now documents local form/dialog state, Server Action boundaries, pending/error behavior, duplicate-submit protection, server validation/authorization, and success-only reset; focused ESLint passed. `components/job-application-card.tsx` now explains its display/edit/delete/drag responsibilities, Server Action boundary, failure feedback, success-only editor closure, and the actual whole-card drag binding; focused ESLint passed. `app/dashboard/page.tsx` now documents its Server Component boundary, authenticated board load, populated query, Mongoose serialization, failure logging, and missing-board versus operational-error paths; focused ESLint passed. `lib/auth/auth-client.ts` now explains the browser/server boundary, public auth URL configuration, exported browser helpers, and server-enforced authorization; focused ESLint passed. Implementation slices are complete. Task-level verification passed: focused ESLint reported no issues and `pnpm exec tsc --noEmit --incremental false` reported no errors. Independent pass-only comment attribution is unavailable because the worktree had no pre-LD-2 snapshot; work-unit commit evidence remains pending explicit authorization.

- [ ] **LD-3 — Explain domain, persistence, and seed behavior**
  - Document action, validation, service, repository, database, model, initialization, and seed responsibilities.
  - Acceptance: ownership, transaction, ordering, reference synchronization, model reuse, and destructive seed behavior are explained accurately.
  - Checks: service tests; TypeScript; lint.
  - Route: delegated writer; multi-file write trigger.
  - Evidence: in progress. `lib/actions/job-applications.ts` now explains the UI-facing mutation boundary, session-derived actor identity, service delegation, returned versus unexpected failures, and success-only dashboard revalidation; focused ESLint passed. `lib/job-applications/service.ts` now documents validation, actor-scoped ownership, transaction boundaries, insertion-position versus stored-rank ordering, reference synchronization, and failure handling; focused ESLint passed. `lib/job-applications/mongoose-repository.ts` now explains the persistence adapter, explicit session propagation, ownership-filter assumptions, document normalization, reference synchronization responsibilities, and ordering/atomicity limits; focused ESLint passed. `lib/db.ts` now documents server-only connection responsibility, required environment configuration, global connection/in-flight-promise reuse, retry after rejection, and the distinction between caching and transaction support; focused ESLint passed. `lib/init-user-board.ts` now explains its auth-hook relationship, ownership/default ordering, and the current absence of shared transaction and guaranteed idempotency; focused ESLint passed. The non-atomic/concurrent-duplicate risk is recorded as a separate integrity discovery, not changed by this task. `scripts/seed.ts` now warns about administrative/destructive scope, hard-coded identity assumptions, user-wide deletion versus board-scoped cleanup, sequential ordering writes, and absent rollback; focused ESLint passed. Seed-safety concerns are recorded separately and the seed was not executed. `lib/models/{board,column,job-application}.ts` now explain model responsibilities, reference graph, index limitations, rank-policy ownership, and hot-reload model reuse; focused ESLint passed. Source-comment slices are complete. Task-level verification passed: focused ESLint passed, the requested Vitest command passed 140 tests across 7 files, and TypeScript passed. Independent LD-3-only attribution is unavailable because the dirty baseline contains executable and untracked changes; database integration, real rollback/concurrency, and seed execution remain intentionally unverified. Work-unit commit evidence remains pending explicit authorization.

- [ ] **LD-4 — Explain observability and runtime configuration**
  - Document privacy boundaries, structured logging, Sentry sanitization, and runtime registration where useful.
  - Acceptance: the guide and comments distinguish browser, Node, and Edge setup and explain privacy decisions without duplicating configuration syntax.
  - Checks: observability tests; TypeScript; lint.
  - Route: delegated writer; multi-file write trigger.
  - Evidence: in progress. `lib/observability/sentry-options.ts` now explains shared runtime configuration, allowlist-based pre-transport sanitization, DSN/environment/release validation, safe disable behavior, sampling/privacy choices, and the distinction between configuration and proven ingestion; focused ESLint passed. `lib/observability/server-logger.ts` now documents structured allowlisted records, PII avoidance, normalization/cardinality bounds, duration/severity routing, and ingestion/alerting limitations; focused ESLint passed. `instrumentation-client.ts`, `instrumentation.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` now explain browser/server entry points, runtime-specific loading, shared privacy options, navigation versus request-error hooks, and the distinction between setup and verified ingestion/source maps; focused ESLint passed. Source-comment slices are complete. Task-level verification passed: focused ESLint passed, the requested observability Vitest command passed 140 tests across 7 files, and TypeScript passed. All six targets are untracked, so task-specific comment-only attribution is unavailable without a pre-LD-4 snapshot. Event ingestion, source maps, alerting, and deployment remain unverified. Work-unit commit evidence remains pending explicit authorization.

- [ ] **LD-5 — Verify the complete teaching pass**
  - Review comment quality and guide/file-ledger coverage.
  - Run the authorized project checks and report every failure or unavailable check.
  - Acceptance: explanations are accurate, no behavior was intentionally changed, and all relevant files appear in the guide.
  - Checks: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`.
  - Route: delegated verifier if required by native assessment; otherwise writer verification plus parent structural readback under active RDD policy.
  - Evidence: in progress. Full suite passed 140 tests across 7 files; project lint and TypeScript passed. Read-only before/after Git status and diff counts were unchanged. Final readability review found one contradictory drag-binding comment, minor comment repetition/narration, stale README architecture claims, one missing ledger entry (`lib/utils.ts`), and stale task-file limitation text. Bounded corrections completed without intended executable changes: drag-binding wording now matches whole-card behavior; redundant/narrating comments were removed; README uniqueness/initialization/seed atomicity claims were corrected; and the guide ledger now includes `lib/utils.ts`. Independent focused re-verification confirmed every prior finding resolved; focused and project lint passed. Dirty-baseline attribution and runtime/database/browser/external-service evidence remain unavailable. Work-unit commit evidence remains pending explicit authorization.

- [ ] **LD-6 — Fix stale authenticated UI after sign-out**
  - Investigate why returning to the application after signing out can still display the previous dashboard and job information.
  - Ensure sign-out invalidates the relevant client/session state and that revisiting a protected page shows the sign-in experience instead of stale authenticated data.
  - Treat this as an authentication/privacy defect, not part of the comment-only documentation changes.
  - Acceptance: after signing out, navigating back or revisiting `/dashboard` cannot reveal the previous user’s board and redirects or renders the sign-in flow; direct protected mutations remain rejected without a valid session.
  - Checks: focused auth/component tests plus an authorized browser journey covering sign in → dashboard → sign out → back/revisit dashboard.
  - Route: delegated investigation and implementation after the documentation pass, as explicitly requested by the user.
  - Evidence: investigation and bounded implementation complete. The client button previously called Better Auth `signOut` and then only `router.push("/sign-in")`, preserving dashboard history without synchronously invalidating the Next Router Cache. A behavior-first test produced genuine RED (3 failed, 4 passed) because `replace("/sign-in")` was never called. `components/sign-out-btn.tsx` now performs success-only `router.replace("/sign-in")` followed by `router.refresh()`; returned/thrown failures, retry, and duplicate-click protection remain covered. Focused GREEN passed 7/7 tests; focused ESLint and TypeScript passed. Independent verification reached the same result. The dashboard still checks the server session, and service tests already reject unauthenticated mutations. Installed Better Auth resolves to 1.7.5 despite the `^1.4.3` manifest range; its one-hour cookie-cache setting was intentionally unchanged. Real browser back/Router Cache restoration remains unverified without isolated MongoDB/auth fixtures. Native review was unavailable because the dirty aggregate candidate exceeded the reviewer context budget; splitting into reviewable commits requires explicit commit authorization.

## Verification evidence

- LD-1 writer attempt 1: timed out after repository search; no guide file created.
- LD-1 writer attempt 2: timed out before the first model event; no guide file created.
- LD-1 writer attempt 3: timed out during the narrowed guide-only task; no guide file created.
- Parent incident check: `git status --short -- README.md docs/architecture-and-learning-guide.md odd/tasks/project-learning-documentation.md` showed only the pre-existing README modification and this task document.
- LD-2 task-level verification: focused ESLint passed with no issues; TypeScript passed with no errors. Auth modules and `proxy.ts` show comment-only additions. Five other files contain comments alongside pre-existing executable changes, so independent task-only attribution is unavailable without a baseline snapshot.
- LD-3 task-level verification: focused ESLint passed; `pnpm test -- lib/job-applications/service.test.ts` passed 140 tests across 7 files; TypeScript passed. Existing fixtures prove service policy/sequencing, not MongoDB rollback, transaction sessions, concurrency, or seed safety. Dirty/untracked baseline state prevents independent task-only attribution.
- LD-4 task-level verification: focused ESLint passed; the requested observability Vitest command passed 140 tests across 7 files; TypeScript passed. All six target files are untracked, so ordinary Git diffs cannot establish task-only attribution. Mocked tests do not prove ingestion, source maps, alerting, or deployment.
- LD-1 task-level verification: guide file and exact README link exist; project lint passed; all required sections and inventory groups are covered with purpose/connection/read-next guidance; no placeholders or environment-contract duplication were found. Source claims were not exhaustively revalidated in that bounded pass.

## Current limitation

The repository was already heavily dirty before this pass, so task-only attribution and byte-for-byte executable preservation cannot be independently proven. Verification establishes current lint, test, and type-check health, not database/browser/deployment/telemetry integration behavior.

## Next step

When isolated MongoDB/auth fixtures are available, run the browser journey `sign in → dashboard → sign out → Back → direct /dashboard`; if reviewable commits are authorized, split the aggregate dirty candidate before retrying native review.
