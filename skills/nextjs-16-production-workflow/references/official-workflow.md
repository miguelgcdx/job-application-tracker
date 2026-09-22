# Deliver one verified Next.js feature

Use this sequence for an authorized feature, not as a framework tutorial. Separate official framework constraints from this project's delivery policy.

## Official source map

These official URLs were supplied as verified sources for this work unit. They are living documentation, not proof that every current example works on 16.0.10. Recheck version applicability before implementing.

| Source | Sourced guidance to apply |
| --- | --- |
| [AI agents](https://nextjs.org/docs/app/guides/ai-agents) | Obtain framework knowledge from matching documentation; encode repeatable workflows in skills. Bundled docs start in 16.2; later automatic agent-file behavior does not apply retroactively. |
| [Data security](https://nextjs.org/docs/app/guides/data-security) | Centralize secure data access in a server-only DAL and return minimal DTOs. Treat Server Actions as public endpoints; validate client input and enforce access control server-side. |
| [Caching](https://nextjs.org/docs/app/getting-started/caching) | Make Cache Components an explicit configuration decision; distinguish cached work from request-time work. Use `use cache`, lifetimes, tags, Suspense, and mutation invalidation deliberately. |
| [Production checklist](https://nextjs.org/docs/app/guides/production-checklist) | Check production behavior, security, error handling, loading experience, and builds before deployment. |

## Project decisions: execution gates

### 1. Establish scope and version evidence

Inspect `package.json`, the repository's lockfile, and the resolved installed `next/package.json` from the app workspace. Record declared, locked, and installed versions separately; resolve mismatches before relying on version-specific APIs. The current manifest pins **16.0.10**. If dependencies are absent, report the installed version as unavailable; never infer it from the manifest.

For 16.0.10, use official network documentation, including the [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), and verify patch applicability. Do not expect `node_modules/next/dist/docs` or newer automatic `AGENTS.md` generation. If network evidence is unavailable or ambiguous, report that limitation rather than silently adopting latest behavior.

Identify affected routes, reads/writes, trust boundaries, owners, tests, and explicit non-goals. Load companion skills for implementation details instead of copying their recipes:

- [Generic Next.js 16](/home/miguelgcd/.agents/skills/nextjs-16/SKILL.md)
- [Zod 4](/home/miguelgcd/.config/opencode/skills/zod-4/SKILL.md), only when that dependency/version is confirmed or separately approved
- [TypeScript](/home/miguelgcd/.config/opencode/skills/typescript/SKILL.md)
- [React 19](/home/miguelgcd/.config/opencode/skills/react-19/SKILL.md)
- [Project testing workflow](../../nextjs-testing-workflow/SKILL.md)

Report missing companion files; do not silently substitute framework-memory guesses.

### 2. Prove behavior before changing it

With runnable tests, add the smallest acceptance-level test and observe its intended assertion failure, not a setup/import failure. Implement minimally; rerun to GREEN. Add meaningful negative/alternate cases and refactor only while green. Without a runnable harness, report the verification gap and request a bounded setup decision; never invent RED/GREEN evidence or install dependencies implicitly.

### 3. Check every trust boundary

Keep database access and secrets behind a DAL importing `server-only`; prevent client imports. Return only caller-authorized fields in serializable DTOs, not full database/session objects. Justify each client boundary by actual interactivity.

For **every Server Action and Route Handler**, record input validation, authentication, authorization, and output exposure. Protected operations must resolve the caller server-side and check ownership/permissions at data access, never trust a client-supplied user ID. Public endpoints must explicitly document anonymous access and allowed operations; absence of a check is not a public policy. Proxy, layouts, page redirects, and hidden UI are not mutation authorization. Test direct requests and another user's resource IDs.

### 4. Decide cache behavior before adding directives

Inspect whether `cacheComponents` is enabled and needed; leave it unchanged without a justified scope decision. For each read, document public versus user-specific data, freshness, `use cache` placement, `cacheLife`, and `cacheTag` ownership. Keep request-time APIs outside shared cache scopes; pass only safe, explicit inputs where the installed-version API supports it. Never cache authorization decisions as shared public data.

Choose Suspense boundaries for uncached/request-time work. After successful persistence, invalidate only affected tags or paths. Verify installed-version semantics: `updateTag` is Server-Action-only for immediate read-your-own-writes; `revalidateTag` with a supported profile provides stale-while-revalidate where acceptable; use `revalidatePath` for route-specific needs. Do not treat these as interchangeable or use blanket invalidation. Test both freshness and cross-user leakage.

### 5. Close with bounded evidence

Check `loading.tsx`/Suspense, `error.tsx` recovery without sensitive details, and `not-found.tsx`/`notFound()` for absent or deliberately concealed resources; record justified non-applicability rather than adding empty files.

Run approved focused checks, then the existing production build command. A successful build does not prove database behavior. Report missing credentials, failed checks, and untested production paths. Bound review to the changed feature, security boundaries, cache behavior, and regression evidence; do not imply review authorizes deployment or a commit.
