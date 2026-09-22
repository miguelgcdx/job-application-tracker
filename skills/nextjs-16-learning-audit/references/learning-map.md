# Next.js 16 learning map

Audit demonstrated understanding, not the number of framework features used. Use this map to rank gaps and propose one exercise; it does not authorize application changes.

## Version and documentation gate

- This app's `package.json` pins Next.js **16.0.10**. Recheck it and the resolved dependency before each audit; flag mismatches.
- Bundled Next.js documentation is unavailable before **16.2**. For this 16.0.10 app, read official Next.js 16 documentation rather than assuming `node_modules/next/dist/docs/` exists.
- Newer **16.2** bundled-docs guidance and **16.3** automatic `AGENTS.md` behavior differ from this app's baseline. Do not assume newer scaffolding, agent instructions, or APIs apply retroactively.
- Official URLs below can track newer releases. Select version 16 where available, check patch applicability, and distinguish sourced guidance from assumptions. If docs cannot be read, disclose that limitation rather than claiming verification.
- Sources: [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [AI agents](https://nextjs.org/docs/app/guides/ai-agents), [16.2 release](https://nextjs.org/blog/next-16-2), [16.3 release](https://nextjs.org/blog/next-16-3-ai-improvements).

## Coverage baseline — revalidate against code

The supplied project audit reports App Router, Server Components, Server Actions, Better Auth, MongoDB/Mongoose, drag-and-drop, `proxy.ts`, and `cacheComponents`/`use cache` already in use. Presence is not proof of safe or complete behavior. Cite current paths and checks before marking a concept demonstrated.

**Priority security hypothesis:** moving a job may not verify ownership of the target column. Trace authentication, source-job access, and destination-column access before confirming it. Keep this distinct from optional framework learning; UI restrictions and proxy redirects do not prove mutation authorization.

## Concepts and observable evidence

| Concept | What to inspect or demonstrate | Official documentation |
| --- | --- | --- |
| Async request APIs | Await `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` where used; validate request-derived values. | [Version 16 changes](https://nextjs.org/docs/app/guides/upgrading/version-16) |
| App Router and server/client boundaries | Explain route composition, server-rendered data access, serializable props, and the smallest necessary client boundary for DnD. | [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) |
| Server Actions: validation and authorization | Treat actions as reachable endpoints; validate inputs, authenticate callers, and authorize every affected resource, including move destinations. | [Data security](https://nextjs.org/docs/app/guides/data-security), [Updating data](https://nextjs.org/docs/app/getting-started/updating-data) |
| DAL and `server-only` | Centralize resource-level access checks; return minimal data and prevent server modules from entering client bundles. `server-only` is not authorization. | [Data security](https://nextjs.org/docs/app/guides/data-security) |
| Cache Components | Explain `cacheComponents`, `use cache`, `cacheLife`, `cacheTag`, and Suspense boundaries; keep request-specific/private data isolated and prove mutation invalidation. | [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components), [use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache), [cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife), [cacheTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag), [Caching and revalidating](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) |
| `proxy.ts` | Keep interception focused on routing or optimistic checks; enforce authorization again at the data/mutation boundary. | [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) |
| Route Handlers | Add a domain endpoint only for an actual HTTP consumer; prove validation, authentication, authorization, status codes, and cache behavior. Existing auth handlers do not demonstrate domain API design. | [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) |
| Loading, errors, and missing resources | Exercise slow navigation, pending mutations, expected validation failures, unexpected errors, and inaccessible/missing records. Choose appropriate `loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries. | [Loading UI](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [Error handling](https://nextjs.org/docs/app/getting-started/error-handling), [Not found](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) |
| Metadata, images, fonts, accessibility | Check route titles, suitable image/font optimization, keyboard DnD alternatives, focus, and announced pending/errors. Do not add images merely to use an API. | [Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [Images](https://nextjs.org/docs/app/getting-started/images), [Fonts](https://nextjs.org/docs/app/getting-started/fonts), [Accessibility](https://nextjs.org/docs/architecture/accessibility) |
| Testing | Cover validation and ownership failures, cache freshness, and authenticated board flows; choose unit/integration/E2E boundaries appropriate to server behavior. | [Testing](https://nextjs.org/docs/app/guides/testing) |
| Observability, performance, deployment | Trace failing requests without logging secrets; measure route performance, verify environment assumptions, and exercise a production build/deployment path. | [Instrumentation](https://nextjs.org/docs/app/guides/instrumentation), [Production checklist](https://nextjs.org/docs/app/guides/production-checklist), [Deploying](https://nextjs.org/docs/app/getting-started/deploying) |

## Default sequence — adjust to evidence

1. **Correctness/security:** action validation and resource authorization; investigate cross-owner job moves first.
2. **Data integrity:** transactions and concurrency for moves/reordering. These are database/domain concerns, not missing Next.js features; consult version-matched MongoDB/Mongoose documentation before designing fixes.
3. **Resilient UX:** route loading/error/not-found boundaries and mutation pending feedback.
4. **Cache correctness:** explicit lifetimes, tag granularity, invalidation, and user isolation; promote confirmed data leakage to priority 1.
5. **Testing depth:** broaden regression coverage; include focused tests in every earlier selected exercise rather than waiting until this stage.
6. **Optional HTTP boundary:** protected domain Route Handlers, only with a concrete consumer.
7. **Operational readiness:** observability, performance, and deployment; promote production blockers when relevant.
8. **Presentation:** metadata, images/fonts where useful, and accessibility. Promote demonstrated accessibility barriers over cosmetic learning.

For the next exercise, state one concept, evidence-backed motivation, exact scope, non-goals, acceptance criteria, and verification. For an ownership exercise, include both an allowed same-owner move and a rejected cross-owner destination with no data mutation. Ask for selection and stop; a ranked backlog is not permission to implement it.
