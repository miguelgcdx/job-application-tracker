# Improve security, integrity, and observability skills

## Objective

Improve the Better Auth, Mongoose, and Vercel observability skills with concise, reusable code examples, then move them and the existing OpenCode Next.js 16 skill into the shared global skill directory so both Pi and OpenCode can discover them.

## Scope

- Improve the original project-local `better-auth-security-workflow`, `mongoose-integrity-workflow`, and `vercel-observability-workflow` skills.
- Move those three skill directories to `~/.agents/skills/` after verification.
- Move the OpenCode `nextjs-16` directory from `~/.config/opencode/skills/` to `~/.agents/skills/`.
- Preserve the remaining project-local learning, production, and testing workflow skills as project overlays.
- Add examples primarily to `references/` files through progressive disclosure.
- Change `SKILL.md` only when needed to tell the agent exactly when to load an example or to correct a verified structural issue.
- Update project registrations and direct references to the new shared global paths.

## Constraints

- Follow the global `skill-improver` and bundled LLM-first style guide.
- Preserve activation semantics, hard rules, decision gates, output contracts, and project-specific evidence limitations.
- Examples must teach reusable methods, not one-off answers.
- Keep security examples safe: never treat Proxy, redirects, hidden UI, or client state as authorization.
- Keep persistence examples explicit about ownership filters, transaction sessions, sequential operations, retry safety, and unavailable integration evidence.
- Keep observability examples privacy-preserving and separate configuration from verified ingestion/deployment evidence.
- Use project-relative references; avoid new machine-specific absolute paths.
- No dependency installation, database access, external telemetry, deployment, or commits without separate authorization.

## Tasks

- [x] **SI-1 — Audit example gaps**
  - Identify only the code examples that address likely model mistakes or ambiguous mechanics.
  - Reject examples that merely repeat generic syntax or duplicate the global Next.js skill.
  - Acceptance: each proposed example has a named failure mode and an intended loading condition.
  - Evidence: read-only audit passed. All three skills have valid frontmatter, required section order, concise bodies, and valid relative links. Approved reference-first examples target server-derived ownership and Proxy limits; owner-scoped writes, session propagation, sequential transactions, and post-commit effects; and allowlisted telemetry plus runtime-specific initialization. Full adapters/configuration, copied application implementations, mocked rollback proof, deployment/ingestion examples, and new scripts were rejected.

- [x] **SI-2 — Improve Better Auth guidance**
  - Add minimal good/bad patterns for authoritative server session checks, ownership-scoped access, and Proxy limitations.
  - Acceptance: examples cannot be misread as allowing client-provided ownership or Proxy-only authorization.
  - Evidence: clarified that the centralized server session helper imports `"server-only"`; added a conditional loading cue plus conceptual good/bad ownership and Proxy examples. Full readback confirmed valid frontmatter, required section order, a concise skill body, relative references, five balanced TypeScript fences, no absolute paths, and preserved cache/revocation uncertainty. Examples are guidance, not integration evidence.

- [x] **SI-3 — Improve Mongoose integrity guidance**
  - Add minimal patterns for ownership-filtered writes, transaction session propagation, sequential transaction operations, and retry-safe boundaries.
  - Acceptance: examples do not use parallel operations inside one transaction and do not imply mocked tests prove rollback.
  - Evidence: added a conditional loading cue plus conceptual good/bad ownership and transaction examples. The reference now clarifies source uncertainty and explicitly states that mocks provide no rollback, topology, retry, or cross-tenant guarantees. Full readback confirmed valid structure, concise body, relative link, four balanced TypeScript fences, no absolute paths, explicit sessions, sequential operations, and post-commit effects.

- [x] **SI-4 — Improve observability guidance**
  - Add minimal patterns for allowlist-based structured logs, telemetry sanitization, and runtime-specific initialization boundaries.
  - Acceptance: examples exclude secrets and personal application content and do not imply configuration proves ingestion.
  - Evidence: added a conditional loading cue plus conceptual allowlist reconstruction, raw-object rejection, and runtime-isolation examples. Removed unsupported verification-history wording and replaced the unimplemented correlation requirement with an explicit evidence gap. Full readback confirmed valid structure, concise body, relative link, five balanced TypeScript fences, no absolute paths, no raw spreads or denylist-only recommendation, and no claim that configuration proves operational behavior.

- [x] **SI-5 — Verify the skills**
  - Re-read all changed skill and reference files against the Gentleman style guide and Agent Skills progressive-disclosure rules.
  - Check relative links, frontmatter, section order, concise loading instructions, and absence of contradictory project/version claims.
  - Run available repository documentation/skill validation without installing tools.
  - Acceptance: audit findings are resolved or explicitly reported; no unrelated files are changed.
  - Evidence: independent verification passed with no blocking content findings. A bounded structural check passed frontmatter, heading order, single-line descriptions, loading cues, relative-reference existence, conceptual labels, fence pairing, and absence of `/home/` paths. `git diff --check` produced no output but cannot validate untracked contents. Better Auth, Mongoose, and observability safety/evidence boundaries were confirmed. The untracked baseline prevents SI-only attribution; no runtime, database, deployment, telemetry, browser, or external-documentation verification was claimed.

- [x] **SI-6 — Move reusable skills to shared global discovery**
  - Move `nextjs-16`, `better-auth-security-workflow`, `mongoose-integrity-workflow`, and `vercel-observability-workflow` to `~/.agents/skills/`.
  - Update `AGENTS.md` and project workflow references to the new exact global paths.
  - Keep project-only learning, production, and testing skills local.
  - Acceptance: the source locations no longer contain the four moved skills, all four destination directories are complete, and no duplicate-name copy remains in the old OpenCode/project locations.
  - Evidence: all four destination directories were preflighted as absent and moved successfully. The old OpenCode `nextjs-16` and three project skill directories are absent; the remaining project `skills/` directory contains only learning, production, and testing overlays. `AGENTS.md` and the production workflow reference point to `/home/miguelgcd/.agents/skills/`. Global copies use repository-neutral tooling/evidence language, preserve their verified examples, and the Next.js skill now requires manifest/lockfile/resolved-version checks instead of preferring 16.2.2.

- [ ] **SI-7 — Verify global discovery and refresh the registry**
  - Validate all moved skills, relative references, and cross-harness discovery paths.
  - Refresh `.atl/skill-registry.md` and its Engram mirror through the `skill-registry` workflow after all authorized moves finish.
  - Acceptance: Pi and OpenCode-compatible global discovery uses `~/.agents/skills/`, project registrations resolve, and duplicate/collision checks pass.
  - Evidence so far: an interim registry refresh indexed the first four moved skills at their new user-scope paths; project `AGENTS.md` paths resolve and stale `.config/opencode` or hard-coded Next.js 16.2.2 references were not found. Final refresh is deferred until the broader OpenCode migration completes.

- [x] **SI-8 — Inventory remaining OpenCode skills**
  - Compare frontmatter skill names in `~/.config/opencode/skills/` against `~/.agents/skills/` without relying only on directory names.
  - Classify duplicates, non-versioned movable skills, current-version movable skills, and obsolete-version skills that must remain unmoved.
  - Verify version status from authoritative current sources for every versioned skill; do not infer latest status from names alone.
  - Acceptance: every OpenCode skill is classified with source/destination collision evidence and version-source evidence where applicable.
  - Evidence: all 80 valid OpenCode skills reconciled by frontmatter name: 25 exact-name duplicates, 48 unique unversioned candidates, and 7 versioned candidates; no malformed skills. Official sources confirmed React 19, Tailwind 4, Zod 4, Zustand 5, Next.js 16, and Uniswap v4 as current. AI SDK 5 and Next.js 15 were obsolete. One machine-specific `makefile` reference to `foundry-scripts` was identified and corrected before movement.

- [x] **SI-9 — Move eligible skills and replace obsolete versions**
  - Move only non-duplicate skills that are either unversioned or verified as the current supported major.
  - Never overwrite an existing `~/.agents/skills/` destination.
  - Delete obsolete versioned skills only after their current-major replacement is available or already installed: replace `ai-sdk-5` with a newly authored global `ai-sdk-7`; delete `nextjs-15` because the verified global `nextjs-16` replacement already exists.
  - Preserve unresolved/ambiguous versioned skills until authoritative evidence resolves them.
  - Acceptance: eligible sources are absent after moving, destinations are complete, obsolete sources are removed only with verified replacements, and existing-name duplicates remain untouched.
  - Evidence: preflight verified every destination absent, then 53 additional unique/current skill directories moved atomically. A new global `ai-sdk-7` skill and official-workflow reference were authored from current official guidance and read back before deletion. Only after verified `ai-sdk-7` and `nextjs-16` replacements existed were `ai-sdk-5` and `nextjs-15` deleted. No destination was overwritten.

- [x] **SI-10 — Verify migration and report retained skills**
  - Verify user-scope discovery, duplicates, path integrity, replacement completeness, and old-source state after migration.
  - Report every duplicate retained in OpenCode and every obsolete skill replaced or unresolved.
  - Acceptance: the user receives exact moved, retained, deleted, and replacement lists; paths resolve without same-name overwrites.
  - Evidence: post-migration inventory found exactly 25 OpenCode skills remaining, and every one is an exact frontmatter-name duplicate of a skill under `~/.agents/skills/`. No unique or obsolete skill remains in OpenCode. Cross-path scan found only generic discovery-policy mentions of the OpenCode directory, not broken moved-skill paths. Total globalized by this work: 57 moved skills plus newly created `ai-sdk-7`; obsolete deletions: `ai-sdk-5` and `nextjs-15`; retained OpenCode duplicates: 25.

- [x] **SI-11 — Audit all newly globalized skills with Skill Improver**
  - Run the complete Skill Improver audit across every skill moved or created by this migration: metadata and trigger clarity, required section order, body/token budget, actionability, decision gates, execution steps, output contract, local references, portability, duplication, and stale assumptions.
  - Add nothing during the audit. Identify oversized `SKILL.md` bodies, including long embedded code/config/command blocks that should move into focused references; also identify missing examples only where they prevent concrete model mistakes.
  - Do not force code into writing, triage, planning, review, or process skills when examples add no value.
  - Acceptance: every moved/created skill is classified as no-change, structural correction, reference extraction, missing-pattern, script candidate, or human-review ambiguity with evidence and severity.
  - Evidence: six read-only batches covered all 58 moved/created skills. Strong no-change examples include `ai-sdk-7`, `node-express`, `foundry-solidity`, `solidity-audit`, and the three recently improved domain workflows. The audit identified oversized tutorial-style `SKILL.md` files, duplicated inline examples already present in references, noncanonical frontmatter/sections, missing local references, portability leaks, stale-prone blockchain/provider data, and remote-mutation authorization gaps. Critical/high-risk semantic findings in `swap-integration`, release/deployment workflows, Jira configuration, GitHub hardening, and Uniswap v4 were explicitly reserved for domain/human review rather than silently normalized.

- [x] **SI-12 — Apply bounded Skill Improver corrections**
  - Apply every safe, evidenced improvement in bounded batches while preserving author intent, triggers, critical rules, and output requirements.
  - Keep `SKILL.md` concise; move long existing code/config/command blocks into focused `references/*.md` files with explicit loading cues, and add missing patterns only where the audit proves value.
  - Replace hidden prose branches with compact decision gates where useful; use scripts only for deterministic repeated operations, never merely to display sample code.
  - Acceptance: each change maps to an audit finding, preserves semantics and safety rules, resolves excessive inline content, and avoids stale or one-off examples.
  - Evidence: six delegated staged batches corrected 37 non-Celo skill directories and promoted 111 exact files globally after two verifier rounds. Primary contracts became concise runtime contracts, long examples moved to local references, portability and authorization gates were added, and concrete unsafe examples were corrected or quarantined. The 14 Celo directories were excluded from promotion and retained as vendor-installed copies. `stream-deck` licensing remains explicitly unresolved because no authoritative license was available; no license was invented.

- [x] **SI-13 — Final verification and registry refresh**
  - Independently verify all moved/created/improved global skills, relative references, code-fence balance, version evidence, and absence of duplicate-name overwrites.
  - Refresh `.atl/skill-registry.md` and its Engram mirror only after all selective improvements finish.
  - Acceptance: final registry paths resolve, moved skills are user-scoped, project overlays remain project-scoped, and every unavailable runtime/integration check is reported honestly.
  - Evidence: final read-only verification confirmed 37/37 promoted directories byte-identical to staging, 7/7 protected directories unchanged, all 14 Celo contracts unchanged, 167 Markdown files with balanced fences, canonical section order for every promoted contract, and all four correction-round safety predicates. `.atl/skill-registry.md` was regenerated with 89 indexed skills and Engram observation `844` records its canonical locator. Runtime, chain, browser, deployment, release, external-version, and exact tokenizer evidence remain unavailable and are not claimed.

## Delivery note

The user explicitly authorized moving eligible OpenCode skills to the shared global skill directory and deleting obsolete versioned skills when a verified latest-major replacement is created or already installed. Existing-name duplicates must not be moved or overwritten. Work-unit commits remain blocked because the user has not explicitly authorized repository commits.
