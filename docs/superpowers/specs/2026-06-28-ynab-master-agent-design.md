# YNAB Master Agent — Design

**Date:** 2026-06-28
**Status:** Approved (pending spec review)

## Goal

Create a Claude Code subagent — `ynab-master` — that acts as a centralized "second brain"
for YNAB best practices and principles. It serves two jobs:

1. **Build guidance** — when adding or changing features in WNAP, it advises the design that
   stays true to real YNAB rules and principles.
2. **Usage guidance** — explains the *correct way to use* the app, the way YNAB intends.

The point is centralization: YNAB context lives in the agent + canonical docs, so questions can
be asked cold without re-pasting context every session.

## Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Audience | A personal "second brain" for the developer (not an in-app end-user feature) |
| Interface | Claude Code custom subagent (`.claude/agents/ynab-master.md`) |
| Capability | Advisor only — read-only, never edits code |
| Knowledge source of truth | `wnap/knowledge-based/` is canonical; root `.txt` files left untouched |
| Knowledge model | Hybrid (Approach C): stable core embedded in the prompt; details read on demand |
| Web access | Enabled — may use WebFetch/WebSearch on ynab.com as a fallback when the local KB is silent |

## Architecture

A single agent definition file: `.claude/agents/ynab-master.md` (YAML frontmatter + system prompt).

### Knowledge model (hybrid — Approach C)

**Embedded core** (in the system prompt — stable, rarely changes):
- The 4 Rules: Give Every Dollar a Job; Embrace True Expenses; Roll With the Punches; Age Your Money.
- The "jars" mental model (categories = jars; Target = the line on the jar; Assigned = water poured in).
- Targets vs. Assigned (Target = the plan; Assigned = the action).
- Funding priority order: fix red/overspent → upcoming bills → daily needs → wants.

**Canonical detail docs** (read on demand — single source of truth in `wnap/knowledge-based/`):

| Topic | File |
|---|---|
| Full handbook / scenarios | `ynap-all-use-case.md` |
| Targets & Auto-Assign (concept) | `understand-target-and-autoAssign.md` |
| Targets vs. Assigned (strategy) | `strategy-between-target-vs-autoAssign.md` |
| Filter-card use cases | `master-filter-cards.md` |
| Visual references | `screen-shot/` |

The system prompt includes a **doc map** (the table above) so the agent knows which file to open
for a given question, keeping it in sync with `knowledge-based/` automatically.

### Tools

- `Read`, `Grep`, `Glob` — read the knowledge base and (when asked to sanity-check usage against
  principles) read WNAP's own docs/code.
- `WebFetch`, `WebSearch` — fallback lookups on ynab.com / the web when the local KB is silent.
- **No** `Edit`, `Write`, or `Bash` — read-only by design.

### Behavior contract (encoded in the system prompt)

- Answer from YNAB principles first; cite which `knowledge-based/` file backs a detailed claim.
- When the local KB lacks an answer: say so explicitly, then check ynab.com via web tools; if still
  unresolved, recommend adding the gap to `knowledge-based/`.
- Clearly distinguish a **YNAB principle** from a **WNAP implementation detail** — never invent app
  behavior; when unsure about WNAP specifically, say it must be verified in the code/docs.
- Give actionable, prioritized recommendations (in the funding-priority style), not vague advice.
- Stay read-only: recommend changes; never make them.

## How "no repeated context" is achieved

Knowledge lives in the agent's embedded core plus the canonical `knowledge-based/` docs — not in the
chat history. A question can be asked cold and the agent already has the context. The doc map keeps
the agent aligned with the canonical files without manual syncing.

## Out of scope (YAGNI)

- No in-app AI assistant, LLM backend, or UI feature.
- No code-editing capability.
- No consolidating, moving, or deleting the root `.txt` files.
- No restructuring of the existing `knowledge-based/` content (used as-is).

## Success criteria

- Asking `ynab-master` a YNAB question in a fresh session returns a correct, principle-grounded
  answer with no context pasted by the user.
- For detail questions, the agent reads and cites the right `knowledge-based/` file.
- For build questions, it frames recommendations in terms of YNAB rules and flags where WNAP would
  deviate.
- It never edits files.

## Implementation outline

1. Create `.claude/agents/ynab-master.md` with:
   - Frontmatter: `name`, `description` (with strong trigger phrasing so it's selected for YNAB
     questions), `tools` (Read, Grep, Glob, WebFetch, WebSearch).
   - System prompt: role, embedded core principles, the doc map, and the behavior contract.
2. Manually verify by invoking it with a couple of representative questions
   (one usage question, one build question, one gap the KB doesn't cover).
