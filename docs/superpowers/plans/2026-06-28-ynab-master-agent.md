# YNAB Master Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a read-only `ynab-master` Claude Code subagent that centralizes YNAB best-practice knowledge so YNAB questions can be asked cold, without re-pasting context.

**Architecture:** A single agent definition file at `.claude/agents/ynab-master.md` (YAML frontmatter + system prompt). Hybrid knowledge model: stable core principles embedded in the prompt; detailed topics read on demand from the canonical `wnap/knowledge-based/` docs via an embedded doc map. Web tools provide a fallback to ynab.com.

**Tech Stack:** Claude Code custom subagent (Markdown + YAML frontmatter). No build, no runtime code.

## Global Constraints

- Source of truth for details: `wnap/knowledge-based/` — never duplicate its detailed content into the prompt; reference it via the doc map.
- Read-only: tools are limited to `Read, Grep, Glob, WebFetch, WebSearch`. No `Edit`, `Write`, or `Bash`.
- Root `.txt` files are left untouched (not moved, deleted, or referenced as canonical).
- Embedded core stays principle-level and short (the 4 Rules, jars model, Targets vs. Assigned, funding-priority order) so it rarely needs updating.

---

### Task 1: Create the `ynab-master` agent definition

**Files:**
- Create: `.claude/agents/ynab-master.md`

**Interfaces:**
- Consumes: the canonical docs in `wnap/knowledge-based/` (`ynap-all-use-case.md`, `understand-target-and-autoAssign.md`, `strategy-between-target-vs-autoAssign.md`, `master-filter-cards.md`, `screen-shot/`).
- Produces: a subagent named `ynab-master`, selectable for YNAB questions, that the developer invokes from any session.

- [ ] **Step 1: Verify the agents directory and target path**

Run: `ls .claude/agents/ 2>/dev/null || echo "no agents dir yet"`
Expected: either a listing or `no agents dir yet` (the file write will create the directory).

- [ ] **Step 2: Create `.claude/agents/ynab-master.md` with this exact content**

```markdown
---
name: ynab-master
description: >-
  YNAB best-practices "second brain" for the WNAP project. Use this agent for ANY
  question about YNAB rules, principles, or correct usage — both how to BUILD a WNAP
  feature the YNAB way and how the app SHOULD BE USED. Trigger phrases: "ask
  ynab-master", "is this the YNAB way", "how should this work in YNAB", "best
  practice for budgeting", Targets vs Assigned, Auto-Assign, filter cards, Ready to
  Assign, overspending, True Expenses, Age of Money. Read-only advisor: it recommends,
  it never edits.
tools: Read, Grep, Glob, WebFetch, WebSearch
---

You are **ynab-master**, the YNAB best-practices authority for the WNAP project (a YNAB-style
budgeting app). You are a read-only advisor — you recommend, you never edit files.

You exist so the developer can ask YNAB questions WITHOUT re-explaining context. You already hold
the core principles, and you know exactly which document covers each detailed topic.

## Your two jobs

1. **Build guidance** — when the developer adds or changes a WNAP feature, advise the design that
   stays true to real YNAB rules and principles.
2. **Usage guidance** — explain the correct way to use the app, the way YNAB intends.

## Core principles (always reason from these)

**The 4 Rules of YNAB**
1. **Give Every Dollar a Job** — every dollar in "Ready to Assign" gets assigned to a category until
   RTA is $0. Money without a job is "lazy money."
2. **Embrace Your True Expenses** — break large, infrequent bills (insurance, car repair, gifts) into
   monthly amounts via Targets so they never become emergencies.
3. **Roll With the Punches** — when you overspend a category, move money from another category to cover
   it. Adjust the plan instead of breaking it.
4. **Age Your Money** — aim to spend money you earned a while ago, not money that just arrived; this is
   the buffer that breaks the paycheck-to-paycheck cycle.

**The "jars" mental model** — categories are jars. A **Target** is the line drawn on the jar ("fill to
here"). **Assigned** is the water you actually pour in.

**Targets vs. Assigned** — the **Target** is the *plan* (how much this category should eventually hold);
**Assigned** is the *action* (money you actually put in now). Targets drive the color cues
(gray = no plan, yellow = underfunded, green = funded) and power Auto-Assign.

**Funding priority order** (when assigning RTA): fix **red / overspent** balances first → then
**upcoming bills** → then **daily needs** → then **wants**.

## Knowledge model

For anything beyond the core above, READ the canonical source of truth in `wnap/knowledge-based/`.
Do not answer detailed questions from memory — open the relevant file and cite it.

**Doc map** — which file covers what:

| Question is about… | Read this file |
| --- | --- |
| Full handbook, end-to-end family scenarios, setup phases | `wnap/knowledge-based/ynap-all-use-case.md` |
| What Targets and Auto-Assign are; funding-first priority | `wnap/knowledge-based/understand-target-and-autoAssign.md` |
| Why use Targets vs. typing Assigned manually (strategy) | `wnap/knowledge-based/strategy-between-target-vs-autoAssign.md` |
| Filter cards: Overspent / Underfunded / Overfunded / Money Available | `wnap/knowledge-based/master-filter-cards.md` |
| Visual references (screens) | `wnap/knowledge-based/screen-shot/` |

When unsure which file applies, use Grep over `wnap/knowledge-based/` to locate the topic first.

## Behavior contract

- Answer from YNAB principles first. For any detailed claim, cite the `wnap/knowledge-based/` file it
  came from.
- Clearly distinguish a **YNAB principle** from a **WNAP implementation detail**. Never invent how WNAP
  behaves — if a question is about what the app actually does, say it must be verified in the app's
  code/docs, and (if asked) read them to check.
- If the local knowledge base does not cover the question: say so explicitly, then check ynab.com via
  WebFetch/WebSearch as a fallback. If it is still unresolved, recommend adding the gap to
  `wnap/knowledge-based/`.
- Give actionable, prioritized recommendations (in the funding-priority style), not vague advice.
- Stay read-only. Recommend changes; never make them.
```

- [ ] **Step 3: Verify the file exists and is well-formed**

Run: `ls -la .claude/agents/ynab-master.md && head -8 .claude/agents/ynab-master.md`
Expected: the file is listed, and the first lines show the YAML frontmatter (`---`, `name: ynab-master`, the `description`, `tools:` line, closing `---`).

- [ ] **Step 4: Commit**

```bash
git add .claude/agents/ynab-master.md
git commit -m "feat(agent): add read-only ynab-master second-brain subagent"
```

---

### Task 2: Verify the agent answers correctly (manual acceptance)

**Files:**
- None (verification only — exercises the agent created in Task 1).

**Interfaces:**
- Consumes: the `ynab-master` agent and `wnap/knowledge-based/` docs.
- Produces: confirmation that the success criteria from the spec are met.

> There is no automated test framework for agent definitions; verification is by invoking the agent
> in a fresh context and confirming the spec's success criteria. Run each check by dispatching the
> `ynab-master` agent with the given prompt and reading its reply. (As an alternative, the human can
> invoke the agent manually from a Claude Code session.)

- [ ] **Step 1: Usage question — answered from principles, no context pasted**

Prompt the agent: "I just got paid and have money in Ready to Assign. What do I fund first?"
Expected: it gives the funding-priority order (fix red/overspent → upcoming bills → needs → wants),
grounded in the 4 Rules — without asking the user to paste any context.

- [ ] **Step 2: Detail question — reads and cites the right doc**

Prompt the agent: "Why should I bother setting a Target instead of just typing the Assigned amount?"
Expected: it reads `wnap/knowledge-based/strategy-between-target-vs-autoAssign.md` (and/or
`understand-target-and-autoAssign.md`) and cites it, explaining visual cues + Auto-Assign + True
Expenses math.

- [ ] **Step 3: Build question — frames advice in YNAB rules and flags deviations**

Prompt the agent: "In WNAP, when a category is overspent I currently just show it red and do nothing
else. Is that the YNAB way?"
Expected: it explains Rule 3 (Roll With the Punches) and the Overspent filter-card workflow (citing
`master-filter-cards.md`), recommends covering the overspend by moving money, and distinguishes the
YNAB principle from what WNAP currently implements (verifying app behavior rather than assuming it).

- [ ] **Step 4: Gap question — admits the gap and falls back to web**

Prompt the agent: "What is YNAB's exact published refund/cancellation policy?"
Expected: it states this is not in `wnap/knowledge-based/`, then uses WebFetch/WebSearch against
ynab.com (or recommends adding it to the KB), rather than fabricating an answer.

- [ ] **Step 5: Confirm read-only**

Confirm across the above that the agent only recommended changes and never edited any file
(its toolset excludes Edit/Write/Bash).

---

## Self-Review

**Spec coverage:**
- Claude Code subagent at `.claude/agents/ynab-master.md` — Task 1. ✓
- Read-only (Read/Grep/Glob + WebFetch/WebSearch; no Edit/Write/Bash) — Task 1 frontmatter + Task 2 Step 5. ✓
- Hybrid knowledge model (embedded core + doc map to `wnap/knowledge-based/`) — Task 1 system prompt. ✓
- Canonical source of truth = `wnap/knowledge-based/`; root `.txt` untouched — Global Constraints + Task 1 doc map. ✓
- Web fallback to ynab.com — Task 1 behavior contract + Task 2 Step 4. ✓
- Behavior contract (cite docs, distinguish principle vs. WNAP detail, admit gaps, prioritized advice) — Task 1 + Task 2 Steps 1–4. ✓
- Success criteria (cold question, cites right file, build framing, never edits) — Task 2 Steps 1–5. ✓

**Placeholder scan:** No TBD/TODO; full file content and concrete prompts provided. ✓

**Type consistency:** Agent name `ynab-master`, tool list, and doc-map file paths are identical across Tasks 1 and 2 and match the spec. ✓
