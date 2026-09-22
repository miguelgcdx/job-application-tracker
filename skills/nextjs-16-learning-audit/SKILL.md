---
name: nextjs-16-learning-audit
description: "Trigger: Next.js learning audit, coverage gaps, next exercise. Rank project gaps and propose one bounded learning exercise."
license: Apache-2.0
metadata:
  author: "miguelgcd"
  version: "1.0"
---

## Activation Contract

Use for project coverage audits and Next.js learning sequences. Delegate implementation patterns to the generic `nextjs-16` skill; do not duplicate it.

## Hard Rules

- Check `package.json` and the resolved Next.js version before auditing.
- Read version-matched docs when available; otherwise use official Next.js 16 docs, flagging patch differences and unavailable evidence.
- Prioritize conceptual understanding over feature quantity; absence alone is not a defect.
- Separate correctness/security gaps from optional learning topics. Verify suspected vulnerabilities before declaring them confirmed.
- Keep audits read-only. Never implement an exercise without explicit user selection.

## Decision Gates

| Evidence | Action |
| --- | --- |
| Correctness/security risk | Rank first; explain impact and uncertainty. |
| Missing prerequisite | Teach it before dependent topics. |
| Optional capability | Defer unless it serves a project need. |
| Selected exercise | Confirm scope and checks before implementation. |

## Execution Steps

1. Load the local learning map and generic skill through `AGENTS.md`.
2. Inspect relevant code and tests; label coverage demonstrated, partial, absent, or unverified, with file evidence.
3. Rank gaps by impact, prerequisites, and learning value; revalidate the map's historical findings.
4. Propose exactly one bounded exercise: concept, rationale, scope, non-goals, acceptance criteria, and verification.
5. Ask the user to select, revise, or defer it; stop before edits. After selected work is verified, reassess before proposing another.

## Output Contract

Return version/docs evidence, coverage, ranked gaps with risk classification, one exercise proposal, and the selection question. Disclose unverified claims and unavailable checks.

## References

- [Learning map](references/learning-map.md) — project baseline, sequencing, and official sources.
