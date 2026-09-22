# App Router educational comments

## Objective

Make the application-owned files under `app/` easier to learn by adding concise comments that explain Next.js App Router conventions, server/client boundaries, error and loading behavior, and authentication routing.

## User preference

- Add educational comments to important Next.js source files.
- Explain purpose, framework behavior, boundaries, invariants, and rationale.
- Do not narrate obvious JSX or syntax.
- Do not add comments to JSON, generated files, lockfiles, or generic configuration files.
- Keep tests unchanged unless a comment is required to explain a genuinely non-obvious test boundary.

## Scope

- `app/api/auth/[...all]/route.ts`
- `app/dashboard/error.tsx`
- `app/global-error.tsx`
- `app/dashboard/loading.tsx`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/sign-in/page.tsx`
- `app/sign-up/page.tsx`

## Non-goals

- No behavior changes.
- No comments in JSON or configuration files.
- No extra comments in `app/dashboard/page.tsx`, which already documents its server/auth/data boundaries.
- No extra comments in `app/page.tsx`, where additional comments would mostly narrate visible sections.
- No comments in test files.

## Tasks

- [x] **ARC-1 — Add bounded App Router explanations**
  - Add file-level or nearby rationale comments only where they teach a non-obvious Next.js convention.
  - Preserve every executable statement and rendered behavior.
  - Acceptance: each scoped file explains its framework responsibility without comment noise.
  - Route: delegated writer because the task touches eight source files.
  - Checks: diff readback confirms comment-only changes; focused ESLint passes.
  - Evidence: writer completed comment-only edits in all eight scoped files and read them back without changing executable code or JSX. Independent verification found no comment defects; focused ESLint passed.

- [x] **ARC-2 — Verify the teaching pass**
  - Review comment accuracy, duplication, and readability.
  - Acceptance: comments match Next.js 16.3.5 behavior and do not imply that redirects or UI visibility replace server-side authorization.
  - Route: delegated verifier.
  - Checks: focused ESLint and TypeScript/build-safe verification selected after assessment.
  - Evidence: independent local review confirmed the comments match executable behavior and bundled Next.js 16.3.5 documentation, including error-boundary reset semantics. Focused ESLint and `mise exec node@22 -- pnpm exec tsc --noEmit --incremental false` completed successfully with no diagnostics. Native review was attempted after selecting the task's intended untracked files, but the provider returned `schema-incompatible` and confirmed that no lineage was created. Runtime/browser behavior remains untested; no commit was created.

## Constraints

- Next.js is pinned and installed at 16.3.5; use bundled documentation under `node_modules/next/dist/docs/` for framework claims.
- Preserve the existing dirty worktree and do not attribute unrelated changes to this task.
- No commit, push, or deployment is authorized.
