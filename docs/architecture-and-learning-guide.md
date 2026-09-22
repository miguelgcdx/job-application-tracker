# Learn the Job Application Tracker from UI to database

This guide helps you follow one job application through the interface, server-side policy, and MongoDB persistence, then understand the boundaries that keep those layers maintainable. Read it alongside the source rather than as a replacement for it: the examples describe this repository's Next.js **16.0.10** implementation, including its current limitations, not a promise that every production property has been verified. Start with the user journey, then trace the same operations through the architecture.

## Quick learning path

1. Follow the [README](../README.md) to install, configure, and run the application. Keep that document as the source of truth for environment variables and database prerequisites; this guide deliberately does not repeat that contract.
2. Open the application and sign up. The authentication flow attempts to initialize a default board for the new user. Observe the dashboard, but distinguish successful account creation from guaranteed complete board initialization.
3. Create a job application, edit its details, move it between columns, and delete it. Notice which operations wait for success and which display an optimistic change immediately.
4. Read [Architecture](#architecture), then trace these interactions in [Request journeys](#request-journeys). Compare the client representation with the server's ownership and ordering rules.
5. Read the limitations before interpreting a passing test as proof of database atomicity, session revocation, or production telemetry delivery.

## Architecture

```text
App Router routes
  |-- dashboard Server Component -- authenticated initial board query --+
  |                                                                    |
  +--> client UI: board, cards, dialogs                                 |
         |                                                             |
         v                                                             |
       Server Actions                                                  |
         |                                                             |
         v                                                             |
       service: validation, ownership policy, transaction orchestration |
         |                                                             |
         v                                                             |
       repository: Mongoose operations --------------------------------+
         |
         v
       MongoDB: boards, columns, job applications

Auth side boundary: Better Auth -> sessions -> page/action checks
                    proxy redirects aid navigation, not mutation authority
Observability side boundary: runtime hooks/errors -> sanitization -> Sentry
                             server operations -> structured allowlisted logs
```

The arrows describe responsibilities, not a rule that all reads use the mutation service. In particular, `app/dashboard/page.tsx` loads a populated board on the server and serializes Mongoose data for the client. UI-driven writes enter `lib/actions/job-applications.ts`, delegate policy to `lib/job-applications/service.ts`, and reach MongoDB through `lib/job-applications/mongoose-repository.ts`.

### Why separate these layers?

Putting database and authentication logic directly in interactive components would blur the browser/server trust boundary. Putting every rule in a route or action would keep it on the server, but mix transport concerns, domain decisions, and persistence mechanics in one place.

Here, actions translate a UI request into an authenticated service call. The service decides what is valid and which related changes belong together. The repository expresses database operations and propagates transaction sessions. This costs some indirection, but makes ownership rules and failure paths easier to inspect and test without mounting the UI or connecting to MongoDB. That testing convenience is not a substitute for real database integration evidence.

## Server and client boundaries

| Boundary | Repository example | What to learn |
| --- | --- | --- |
| Server-rendered route | `app/dashboard/page.tsx` | Check the session, load owned data, and serialize documents before passing props into interactive UI. |
| Interactive client component | `components/kanban-board.tsx` | Browser drag events and local interaction state belong here, not database credentials or authoritative access checks. |
| Local form state | `components/create-job-dialog.tsx` | Pending state and duplicate-submit prevention improve UX; they cannot replace server validation. |
| Client mutation projection | `lib/hooks/useBoards.ts` | Display a temporary board projection while a Server Action persists the change. |
| Server mutation entry | `lib/actions/job-applications.ts` | Derive actor identity from the session rather than accepting a trusted user ID from the browser. |
| Server infrastructure | `lib/db.ts`, `lib/auth/auth.ts` | Keep database connections and server authentication behind the server boundary. |

`lib/auth/auth-client.ts` exposes browser-facing authentication helpers; it does not transfer authorization responsibility into the browser. Likewise, importing a Server Action into a client component does not make its implementation browser-side: it supplies a callable server boundary whose inputs remain untrusted.

These explanations target the installed 16.0.10 version. Bundled Next.js documentation is unavailable for this version; newer bundled-docs guidance should not be applied retroactively. This guide does not claim an external framework-documentation verification.

## Request journeys

### Sign-up and the default board

1. The sign-up UI calls the browser authentication client.
2. Better Auth handles account creation on the server.
3. An authentication hook calls `lib/init-user-board.ts` to create the user's default board and ordered columns.
4. The dashboard checks authentication independently before loading the board.

The initializer is not currently protected by a shared transaction or guaranteed idempotency. Partial initialization and concurrent duplicate initialization are risks, not behaviors this documentation fixes. A missing board must not be mistaken for a database operation that threw an error.

### Loading the dashboard

1. Navigation passes through the proxy's session-aware redirect logic.
2. The dashboard Server Component performs its own authentication check.
3. It queries the user's board, populates related data, and converts Mongoose values into a client-consumable representation.
4. The board UI receives that snapshot as its base state.

The route distinguishes a missing board from an operational failure and logs failures. Loading and error UI support this journey, but neither grants access to data.

### Creating, updating, and deleting applications

1. A dialog or card sends user input to a Server Action.
2. The action resolves the session and supplies the authenticated actor to the service.
3. The service validates input and verifies actor-scoped ownership of the resources involved.
4. The repository executes the required persistence operations, with a shared transaction session where the service groups related writes.
5. The action revalidates the dashboard only after success so the next server snapshot reflects persistence.

Creating or deleting a card involves more than the card document: column references must stay synchronized. Updating can change fields or move a card, which also affects membership and ordering. Expected failures return feedback to the caller; unexpected failures follow the error-reporting path. The create dialog resets after success, and the card editor closes after successful submission rather than discarding input on failure.

### Dragging and dropping

The board distinguishes a drop on a column from a drop on another card. It calculates a destination insertion position, adjusting downward movement so removal of the original card does not shift the intended target incorrectly.

`useBoard` overlays that move immediately with `useOptimistic`, then invokes the update action inside a transition. The server still validates the destination and ownership. On success, revalidation supplies authoritative board data; on failure, the temporary overlay expires and the hook exposes an error. A visually successful drag alone is not evidence of a committed write.

## Domain and persistence invariants

**The reference graph:** a Board belongs to a user and references Columns; Columns reference JobApplications; job applications identify their column. These relationships let the dashboard populate a board, but references alone do not enforce ownership or keep both sides synchronized.

**Ownership is actor-scoped:** server code must verify the authenticated actor's access to the job, column, and board involved in an operation. A syntactically valid identifier is not permission. Repository filters and their ownership assumptions matter alongside service checks; do not reuse a lower-level operation as if it independently established every policy guarantee.

**Validation has layers:** the service validates incoming values before performing mutations, while Mongoose models describe persistence constraints. Client-side checks are usability aids. Model indexes are not a substitute for cross-document validation or authorization, and model reuse during hot reload is a development concern rather than an integrity mechanism.

**Positions and ranks are different:** a requested move uses a zero-based insertion index after removal of the moving card. Stored `order` values are ranks, not necessarily consecutive positions. The optimistic destination projection uses `0, 100, 200, ...`; sorting and insertion use new arrays rather than mutating server-provided props. Rank policy belongs to mutation logic, not an assumption that the database automatically maintains list order.

**Related writes need a shared transaction:** service orchestration and explicit repository session propagation keep grouped membership, reference, and ordering writes within the same transaction boundary. The intended atomicity depends on a transaction-capable MongoDB deployment and every relevant operation using that session. Connection reuse in `lib/db.ts` avoids redundant connections and shares in-flight connection work; it does not enable transactions by itself.

### Known initialization and seed limitations

- Default-board initialization currently lacks a shared transaction and guaranteed idempotency. Do not describe the account-and-board journey as atomic or concurrency-safe.
- `scripts/seed.ts` is an administrative, destructive utility with hard-coded identity assumptions. Its user-wide deletion scope differs from board-scoped cleanup, and its sequential writes have no rollback guarantee.
- The documentation pass did not execute the seed or prove real MongoDB rollback and concurrent-write behavior. Do not run the seed as a harmless learning step against valuable data.

## Authentication and authorization

Think of authentication as establishing **who is acting**, and authorization as deciding **whether that actor may touch this resource**.

`proxy.ts` uses server-side session lookup to guide navigation with redirects. It is not the authorization boundary for mutations: a caller need not follow the visible UI or its navigation sequence before attempting a Server Action. Protected pages therefore check sessions, and actions independently resolve the session before entering service policy. Ownership enforcement then narrows access to the actor's resources rather than merely requiring any logged-in user.

Better Auth's configured **one-hour cookie cache** trades fewer session lookups for delayed visibility of server-side revocation on requests that accept cached session data. Do not promise immediate revocation simply because a page or action calls a session helper. Clearing browser session state and observing a server-side revocation are related but distinct concerns.

The task record also tracks a separate stale-authenticated-UI-after-sign-out investigation. This guide does not claim that navigating back after sign-out has been browser-verified to hide all previously rendered data.

## Optimistic UI and errors

The incoming board props remain the base snapshot. `useBoard` does not keep a second authoritative database in React state: it temporarily removes the moving card from the projected columns, inserts it once at the destination, and assigns projected destination ranks without mutating the original objects.

React reconciles the overlay when the transition settles, using the current base props. Failure handling is not an explicit inverse move and is not a database rollback. The hook clears an earlier move error on a new attempt and reports both returned action errors and thrown failures.

Error handling has different scopes:

- Dialogs, cards, and the move hook provide operation-level feedback close to the attempted change.
- `app/dashboard/error.tsx` provides a dashboard error boundary; `loading.tsx` supplies loading feedback.
- `app/global-error.tsx` handles failures at the broader application boundary, while `app/not-found.tsx` represents a missing destination rather than a generic operational error.

A rendering error boundary is not a replacement for handling asynchronous event or action failures at the call site. Learners should trace both the returned-error branch and the exception branch.

## Observability and privacy

Telemetry crosses a privacy boundary: operational debugging should not export application forms, credentials, sessions, or arbitrary user content.

`lib/observability/sentry-options.ts` centralizes runtime options and allowlist-based pre-transport sanitization. It validates configuration such as DSN, environment, and release, supports safe disabling, and keeps sampling and privacy policy consistent across runtimes. `lib/observability/server-logger.ts` emits structured, allowlisted records with normalization and bounded cardinality rather than dumping request bodies or raw documents.

The bootstraps serve different environments:

- `instrumentation-client.ts` initializes browser telemetry and navigation-related instrumentation.
- `instrumentation.ts` registers server instrumentation and request-error hooks with runtime-specific loading.
- `sentry.server.config.ts` and `sentry.edge.config.ts` configure Node and Edge respectively, using the shared privacy options.

These files establish configuration and sanitization behavior, not evidence that a remote service received events. Actual ingestion, source-map usability, alert delivery, and deployed behavior remain unverified in the documentation task. Tests of sanitized payloads cannot prove those external properties.

## Testing and coverage

Vitest is the unit/component runner. `vitest.config.ts` uses jsdom, React and TypeScript-path plugins, shared test setup, and mock clearing/restoration. It excludes Playwright's E2E directory so browser journeys are not accidentally treated as unit tests. React Testing Library supports behavior-focused component assertions; service fixtures isolate policy and operation sequencing.

V8 coverage reports are available through the README/package testing workflow. The configured source include patterns cover application, component, library, and model code, while declarations, tests, fixtures, and generated files are excluded. Coverage measures which included code was exercised, not whether ownership policy is complete or a transaction actually rolled back. Read the denominator and the assertions, not just the percentage.

`playwright.config.ts` targets `tests/e2e`, uses a Desktop Chrome/Chromium project, and starts a fresh production build/server on localhost instead of reusing an existing server. It configures CI retries, failure screenshots, first-retry traces, and an HTML report. **No E2E specs were discovered during the preceding documentation exploration**; configured infrastructure is not an executed browser suite.

The task record reports earlier runs of 140 passing Vitest tests across seven files plus passing TypeScript and focused lint checks. Those are recorded prior checks, not new results from creating this guide. Mocked-boundary tests support service rules, UI behavior, and sanitization logic; they do not prove real MongoDB sessions, rollback, concurrency, complete browser journeys, or external telemetry delivery.

## Comments, JSDoc, and documentation

The project uses targeted comments to explain what a reader cannot safely infer from syntax: trust boundaries, insertion-index versus rank semantics, reference synchronization, session propagation, and known limitations. JSDoc explains important function contracts and non-obvious parameters. Inline rationale belongs near a decision that a future edit could accidentally break.

Narrating every JSX element or assignment would make those explanations harder to find and easier to leave stale. Conventional shadcn-style UI wrappers are better understood as reusable presentation primitives; they do not each need a tutorial comment unless this application adds a meaningful invariant or unusual behavior.

Use three levels together: the [README](../README.md) for setup and environment details, this guide for cross-file journeys and trade-offs, and source comments for local contracts. When behavior changes, update the explanation at the level that owns it rather than copying the same configuration instructions into every layer.

## File ledger

Use this ledger as a reading map: each row connects a file's responsibility to its collaborator and the next useful source to open. Wildcards denote related conventional groups, not additional invented filenames. Setup and environment instructions remain in the [README](../README.md).

### App and routes

| File | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `app/layout.tsx` | Root document and shared application shell. | Wraps route content and loads global styling. | `app/globals.css`, `components/navbar.tsx` |
| `app/globals.css` | Shared styles and visual tokens. | Supplies the styling foundation for pages and UI primitives. | `components/ui/*` |
| `app/page.tsx` | Public landing-page entry. | Introduces the product before the authenticated dashboard journey. | `components/image-tabs.tsx`, `app/sign-up/page.tsx` |
| `app/sign-in/page.tsx` | Sign-in form and authentication feedback. | Uses browser-facing Better Auth helpers. | `lib/auth/auth-client.ts` |
| `app/sign-up/page.tsx` | Account-registration interface. | Starts the auth flow whose server hook initializes a board. | `lib/auth/auth.ts`, `lib/init-user-board.ts` |
| `app/dashboard/page.tsx` | Authenticated server load of the user's populated board. | Session checks, Mongoose models, and serialization feed the interactive board. | `components/kanban-board.tsx`, `lib/models/board.ts` |
| `app/dashboard/loading.tsx` | Dashboard loading fallback. | App Router loading boundary complements the server data load. | `app/dashboard/page.tsx` |
| `app/dashboard/error.tsx` | Dashboard-scoped rendering failure and recovery UI. | Route error boundary complements operation-level feedback. | `app/dashboard/error.test.tsx` |
| `app/global-error.tsx` | Application-wide error fallback. | Covers the broader rendering boundary, including root-level failures. | `app/global-error.test.tsx` |
| `app/not-found.tsx` | Missing-destination presentation. | Keeps not-found handling distinct from operational errors. | `app/global-error.tsx` |
| `app/api/auth/[...all]/route.ts` | HTTP entry point for Better Auth requests. | Connects the auth client/server request flow to server auth configuration. | `lib/auth/auth.ts`, `lib/auth/auth-client.ts` |
| `proxy.ts` | Session-aware navigation redirects. | Uses server session lookup; does not authorize mutations. | `app/dashboard/page.tsx`, `lib/actions/job-applications.ts` |

### UI components

| File or group | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `components/navbar.tsx` | Shared navigation and authentication-aware controls. | Connects the application shell to sign-in and sign-out interactions. | `components/sign-out-btn.tsx`, `components/navbar.test.tsx` |
| `components/sign-out-btn.tsx` | User-triggered sign-out control. | Uses the browser auth boundary; stale-history behavior remains a separate investigation. | `lib/auth/auth-client.ts`, [Authentication and authorization](#authentication-and-authorization) |
| `components/image-tabs.tsx` | Tabbed product imagery on the public experience. | Connects presentation controls with hero image assets. | `public/hero-images/*`, `app/page.tsx` |
| `components/kanban-board.tsx` | Columns, drag targets, and drag feedback. | dnd-kit interactions calculate destinations for the optimistic board hook. | `lib/hooks/useBoards.ts`, `components/job-application-card.tsx` |
| `components/create-job-dialog.tsx` | Create form, pending state, and success-only reset. | Calls the create Server Action and displays operation failures. | `lib/actions/job-applications.ts`, `components/create-job-dialog.test.tsx` |
| `components/job-application-card.tsx` | Application display, editing, deletion, and drag binding. | Calls update/delete actions while retaining editing state on failure. | `lib/actions/job-applications.ts` |
| `components/ui/*` | Conventional shadcn-style presentation primitives, including Radix-backed wrappers. | Reuse styling and interaction primitives across application-owned components. | `components.json`, then a consumer such as `components/create-job-dialog.tsx` |
| `lib/utils.ts` | Shared `cn` helper for composing CSS classes and resolving Tailwind conflicts. | Combines `clsx` and `tailwind-merge` for design-system styling. | `components/ui/button.tsx` |

Read the wrapper group centrally: these conventional/generated-style files adapt reusable primitives rather than owning job policy. Not every wrapper depends on Radix, and each does not need custom teaching comments. Document application-specific accessibility decisions or unusual behavior where introduced; trace business rules in the consuming component and service instead.

### Authentication and client state

| File | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `lib/auth/auth.ts` | Server Better Auth configuration, hooks, and session helpers. | Database readiness and account creation connect to default-board initialization; cookie caching affects revocation visibility. | `lib/init-user-board.ts`, `lib/actions/job-applications.ts` |
| `lib/auth/auth-client.ts` | Browser-facing auth client and helpers. | Connects forms and session-aware UI to the auth HTTP entry point. | `app/api/auth/[...all]/route.ts` |
| `lib/hooks/useBoards.ts` | Temporary optimistic board projection and move feedback. | `useBoard` invokes the update action inside a transition; server props remain authoritative. | `lib/actions/job-applications.ts`, [Optimistic UI and errors](#optimistic-ui-and-errors) |

### Domain and persistence

| File | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `lib/actions/job-applications.ts` | UI-facing server mutation boundary. | Derives the actor from the session, delegates to the service, and revalidates after success. | `lib/job-applications/service.ts` |
| `lib/job-applications/schemas.ts` | Input-validation contracts for job mutations. | Supplies validation used by the service before persistence. | `lib/job-applications/service.ts` |
| `lib/job-applications/service.ts` | Ownership policy, ordering, and related-write orchestration. | Uses schemas and a repository boundary to coordinate transactions. | `lib/job-applications/service.test.ts`, `lib/job-applications/mongoose-repository.ts` |
| `lib/job-applications/mongoose-repository.ts` | Mongoose persistence adapter. | Implements queries/writes and explicitly propagates transaction sessions. | `lib/models/column.ts`, `lib/models/job-application.ts` |
| `lib/db.ts` | Server database connection and in-flight connection reuse. | Shared infrastructure for auth and application persistence; connection caching does not enable transactions. | `lib/auth/auth.ts`, `lib/job-applications/mongoose-repository.ts` |
| `lib/init-user-board.ts` | Creates the default board and ordered columns. | Called by the auth account-creation hook; currently lacks shared transaction and guaranteed idempotency. | `lib/models/board.ts`, [Known initialization and seed limitations](#known-initialization-and-seed-limitations) |
| `lib/models/board.ts` | Board persistence schema and model. | Relates user ownership to column references used by dashboard population. | `lib/models/column.ts`, `app/dashboard/page.tsx` |
| `lib/models/column.ts` | Column membership and ordering representation. | References jobs; mutations must keep those references synchronized. | `lib/models/job-application.ts`, `lib/job-applications/service.ts` |
| `lib/models/job-application.ts` | Stored job fields, relationships, and rank representation. | Mongoose constraints complement service validation and ownership checks. | `lib/job-applications/schemas.ts`, `lib/job-applications/service.ts` |
| `lib/models/index.ts` | Shared model export entry point. | Makes related persistence models available to their consumers. | `lib/models/board.ts`, `lib/models/column.ts` |
| `lib/models/models.types.ts` | Shared TypeScript representations for model data. | Connects persistence shapes with typed board/UI consumers; types are not runtime validation. | `components/kanban-board.tsx`, `lib/job-applications/schemas.ts` |
| `scripts/seed.ts` | Administrative sample-data creation with destructive cleanup. | Direct model writes use hard-coded identity assumptions and have no rollback guarantee. | [Known initialization and seed limitations](#known-initialization-and-seed-limitations), `lib/models/job-application.ts` |

### Observability and runtime

| File | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `lib/observability/sentry-options.ts` | Shared Sentry configuration validation and privacy filtering. | Supplies allowlisted pre-transport options to runtime bootstraps. | `instrumentation-client.ts`, `sentry.server.config.ts` |
| `lib/observability/server-logger.ts` | Structured, bounded, allowlisted server logs. | Supports operational reporting without dumping user content or documents. | `lib/actions/job-applications.ts`, `app/dashboard/page.tsx` |
| `instrumentation.ts` | Server instrumentation registration and request-error hooks. | Selects runtime-specific Sentry initialization. | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| `instrumentation-client.ts` | Browser telemetry initialization and navigation instrumentation. | Uses shared privacy options in the client runtime. | `lib/observability/sentry-options.ts` |
| `sentry.server.config.ts` | Node-runtime Sentry bootstrap. | Applies shared options when loaded by server instrumentation. | `instrumentation.ts`, `lib/observability/sentry-options.ts` |
| `sentry.edge.config.ts` | Edge-runtime Sentry bootstrap. | Keeps runtime initialization separate while sharing sanitization policy. | `instrumentation.ts`, `lib/observability/sentry-options.ts` |
| `next.config.ts` | Next.js build configuration and Sentry build integration. | Connects build-time telemetry labels/source-map configuration to runtime options. | `lib/observability/sentry-options.ts`, [README environment contract](../README.md#-environment-variables) |

### Tests and project configuration

Test groups below describe the current unit/component areas without implying that matching filenames provide browser or live-database coverage. See [Testing and coverage](#testing-and-coverage) for the evidence limits.

| File or group | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `tests/setup.ts` | Shared unit/component test setup. | Loaded by Vitest to establish the common test environment. | `vitest.config.ts`, `components/create-job-dialog.test.tsx` |
| `app/dashboard/error.test.tsx`, `app/global-error.test.tsx` | Error-boundary component behavior tests. | Exercise the corresponding fallback UI in the unit/component environment. | `app/dashboard/error.tsx`, `app/global-error.tsx` |
| `components/create-job-dialog.test.tsx`, `components/navbar.test.tsx` | Form and navigation component behavior tests. | Isolate UI interactions and mocked boundaries rather than real auth/database journeys. | `components/create-job-dialog.tsx`, `components/navbar.tsx` |
| `lib/job-applications/service.test.ts` | Service-policy and operation-sequencing tests. | Fixtures isolate the repository boundary; they do not establish real MongoDB rollback. | `lib/job-applications/service.ts`, `lib/job-applications/mongoose-repository.ts` |
| `lib/observability/*.test.ts` | Shared telemetry-options and structured-logging tests. | Check local privacy/configuration behavior, not remote event ingestion. | `lib/observability/sentry-options.ts`, `lib/observability/server-logger.ts` |
| `vitest.config.ts` | Unit/component runner, setup, and coverage configuration. | Connects jsdom, React/path plugins, and shared setup; separates E2E files. | `tests/setup.ts`, [Testing and coverage](#testing-and-coverage) |
| `playwright.config.ts` | Browser-test and production-server orchestration configuration. | Targets `tests/e2e`; configuration alone is not an executed journey. | [Testing and coverage](#testing-and-coverage) |
| `eslint.config.mjs` | Static lint policy. | Applies repository lint rules independently of test assertions and type checking. | `package.json`, `tsconfig.json` |
| `postcss.config.mjs` | CSS transformation configuration. | Connects the Tailwind styling pipeline to global CSS. | `app/globals.css` |
| `tsconfig.json` | TypeScript compilation and module-resolution settings. | Governs source type checking and import aliases. | `lib/models/models.types.ts`, `vitest.config.ts` |
| `components.json` | shadcn component-tooling conventions. | Describes UI generation/style/alias choices, not runtime business policy. | `components/ui/*`, `app/globals.css` |
| `package.json` | Dependency versions, runtime/package-manager constraints, and scripts. | Defines the tooling entry points used by the README workflow. | [README scripts](../README.md#-available-scripts), `vitest.config.ts` |

### Static assets

| Group | Purpose | Key connection/dependency | Read next |
| --- | --- | --- | --- |
| `public/hero-images/*` | Public product/hero imagery. | Used by the landing-page image presentation rather than the persistence layer. | `components/image-tabs.tsx`, `app/page.tsx` |
