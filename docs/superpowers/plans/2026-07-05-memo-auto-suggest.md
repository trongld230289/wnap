# Memo Auto-Suggest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Memo field in the Add-Transaction form the same auto-suggest UX the Payee field already has — pulling suggestions from the user's own past transactions, scoped to the currently-selected payee with a global fallback.

**Architecture:** Derive `memosByPayee` and `allMemos` in-memory from the existing `transactions` state in `useBudget`. Expose both via `BudgetCtx`. `TransactionForm` chooses which list to feed into a new HTML `<datalist id="memo-list">` based on whether the typed Payee name matches an existing payee that has prior memos. No schema change; memo remains a free-text column.

**Tech Stack:** React 19, TypeScript, Vitest (for pure derivation tests). Existing `TransactionForm.tsx` and `useBudget.tsx` in `app/src/`.

## Global Constraints

- Preserve the existing Payee autocomplete behavior. Nothing about payees, `upsertPayee`, or the `payee-list` datalist changes.
- No new database table, migration, or `upsert*` method. Memo stays free-text on `transactions`.
- Case-insensitive matching for both the payee lookup and memo dedup, matching how `upsertPayee` already keys by `.toLowerCase()` (see `useBudget.tsx:242`).
- Preserve the most-recent casing when deduplicating memos.
- Transactions are already sorted `date DESC` by the fetch query (see `useBudget.tsx:88`) — rely on that order rather than re-sorting.
- Follow the existing pure-function-in-`app/src/budget/` pattern (see `actionLog.ts`, `autoAssign.ts`, `barFill.ts`, `planFilters.ts`) so the derivation can be unit-tested in isolation.
- Vitest runs via `npm test` from the `app/` directory.

---

### Task 1: Pure derivation module `memoSuggest.ts`

Extract the memo-suggestion logic into a pure function alongside the other budget helpers, so it can be unit-tested without rendering the hook.

**Files:**
- Create: `app/src/budget/memoSuggest.ts`
- Create: `app/src/budget/__tests__/memoSuggest.test.ts`

**Interfaces:**
- Consumes: `LedgerTxn` from `../lib/mappers` (fields used: `payeeId: string | null`, `memo: string | null`).
- Produces:
  ```ts
  export interface MemoSuggestions {
    memosByPayee: Map<string, string[]>;  // payeeId → distinct memos, most recent first
    allMemos: string[];                    // distinct memos across all txns, most recent first
  }
  export function deriveMemoSuggestions(transactions: LedgerTxn[]): MemoSuggestions;
  ```
  Input `transactions` MUST be pre-sorted newest-first (as `useBudget` already delivers).

- [ ] **Step 1: Write the failing test file**

Create `app/src/budget/__tests__/memoSuggest.test.ts`:

```ts
import { expect, test } from 'vitest';
import { deriveMemoSuggestions } from '../memoSuggest';
import type { LedgerTxn } from '../../lib/mappers';

const tx = (over: Partial<LedgerTxn>): LedgerTxn => ({
  id: 'x', accountId: 'a1', date: '2026-07-01', payeeId: null, categoryId: null,
  memo: null, amount: -1000, status: 'uncleared', transferId: null, ...over,
});

test('groups memos by payee, most-recent first', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '3', date: '2026-07-03', payeeId: 'p1', memo: 'cà phê chiều' }),
    tx({ id: '2', date: '2026-07-02', payeeId: 'p2', memo: 'ăn tối' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê sáng' }),
  ];
  const { memosByPayee } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['cà phê chiều', 'cà phê sáng']);
  expect(memosByPayee.get('p2')).toEqual(['ăn tối']);
});

test('allMemos: distinct across all txns, most-recent first', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '3', date: '2026-07-03', payeeId: 'p1', memo: 'cà phê' }),
    tx({ id: '2', date: '2026-07-02', payeeId: 'p2', memo: 'ăn tối' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê' }),
  ];
  const { allMemos } = deriveMemoSuggestions(txns);
  expect(allMemos).toEqual(['cà phê', 'ăn tối']);
});

test('case-insensitive dedup keeps the most recent casing', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '2', date: '2026-07-02', payeeId: 'p1', memo: 'Cà Phê' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'cà phê' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['Cà Phê']);
  expect(allMemos).toEqual(['Cà Phê']);
});

test('skips null, empty, and whitespace-only memos', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '4', payeeId: 'p1', memo: null }),
    tx({ id: '3', payeeId: 'p1', memo: '' }),
    tx({ id: '2', payeeId: 'p1', memo: '   ' }),
    tx({ id: '1', payeeId: 'p1', memo: 'thật' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.get('p1')).toEqual(['thật']);
  expect(allMemos).toEqual(['thật']);
});

test('null payeeId: excluded from memosByPayee, included in allMemos', () => {
  const txns: LedgerTxn[] = [
    tx({ id: '2', date: '2026-07-02', payeeId: null, memo: 'ẩn danh' }),
    tx({ id: '1', date: '2026-07-01', payeeId: 'p1', memo: 'có payee' }),
  ];
  const { memosByPayee, allMemos } = deriveMemoSuggestions(txns);
  expect(memosByPayee.has('')).toBe(false);
  expect(memosByPayee.get('p1')).toEqual(['có payee']);
  expect(allMemos).toEqual(['ẩn danh', 'có payee']);
});

test('empty input → empty map and array', () => {
  const { memosByPayee, allMemos } = deriveMemoSuggestions([]);
  expect(memosByPayee.size).toBe(0);
  expect(allMemos).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `app/`:

```
npm test -- src/budget/__tests__/memoSuggest.test.ts
```

Expected: FAIL — "Cannot find module '../memoSuggest'".

- [ ] **Step 3: Implement `memoSuggest.ts`**

Create `app/src/budget/memoSuggest.ts`:

```ts
import type { LedgerTxn } from '../lib/mappers';

export interface MemoSuggestions {
  memosByPayee: Map<string, string[]>;
  allMemos: string[];
}

export function deriveMemoSuggestions(transactions: LedgerTxn[]): MemoSuggestions {
  const memosByPayee = new Map<string, string[]>();
  const perPayeeSeen = new Map<string, Set<string>>();
  const allMemos: string[] = [];
  const allSeen = new Set<string>();

  for (const t of transactions) {
    if (!t.memo) continue;
    const trimmed = t.memo.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();

    if (!allSeen.has(key)) {
      allSeen.add(key);
      allMemos.push(trimmed);
    }

    if (t.payeeId) {
      let seen = perPayeeSeen.get(t.payeeId);
      if (!seen) {
        seen = new Set();
        perPayeeSeen.set(t.payeeId, seen);
        memosByPayee.set(t.payeeId, []);
      }
      if (!seen.has(key)) {
        seen.add(key);
        memosByPayee.get(t.payeeId)!.push(trimmed);
      }
    }
  }

  return { memosByPayee, allMemos };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `app/`:

```
npm test -- src/budget/__tests__/memoSuggest.test.ts
```

Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```
git add app/src/budget/memoSuggest.ts app/src/budget/__tests__/memoSuggest.test.ts
git commit -m "feat(budget): derive memo suggestions by payee + global"
```

---

### Task 2: Expose `memosByPayee` and `allMemos` on `BudgetCtx`

Wire the derivation into `useBudget` so the form can read it.

**Files:**
- Modify: `app/src/budget/useBudget.tsx`

**Interfaces:**
- Consumes: `deriveMemoSuggestions` and `MemoSuggestions` from `./memoSuggest`; existing `transactions` memo inside the hook.
- Produces (added to `BudgetCtx`):
  ```ts
  memosByPayee: Map<string, string[]>;
  allMemos: string[];
  ```

- [ ] **Step 1: Add import**

At the top of `app/src/budget/useBudget.tsx`, alongside the other budget imports (near line 5), add:

```ts
import { deriveMemoSuggestions } from './memoSuggest';
```

- [ ] **Step 2: Add fields to `BudgetCtx` interface**

In the `interface BudgetCtx` block (around lines 30–68), add these two lines below the existing `transactions: LedgerTxn[];` line:

```ts
  memosByPayee: Map<string, string[]>;
  allMemos: string[];
```

- [ ] **Step 3: Add the memoized derivation inside `BudgetProvider`**

Immediately after the existing `const transactions = useMemo(...)` line (around line 153), add:

```tsx
  const { memosByPayee, allMemos } = useMemo(() => deriveMemoSuggestions(transactions), [transactions]);
```

- [ ] **Step 4: Include the fields in the context `value`**

Update the `value: BudgetCtx = { ... }` object (around lines 297–306) so the object literal includes `memosByPayee, allMemos` on the line that already lists `accounts, payees, transactions, recentMoves,`. Change:

```tsx
    accounts, payees, transactions, recentMoves,
```

to:

```tsx
    accounts, payees, transactions, memosByPayee, allMemos, recentMoves,
```

- [ ] **Step 5: Verify the build type-checks**

Run from `app/`:

```
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run from `app/`:

```
npm test
```

Expected: all tests PASS (no regressions).

- [ ] **Step 7: Commit**

```
git add app/src/budget/useBudget.tsx
git commit -m "feat(budget): expose memo suggestions on BudgetCtx"
```

---

### Task 3: Wire memo datalist into `TransactionForm`

Consume the new context fields, pick the right suggestion list based on the typed Payee, and attach a `<datalist>` to the memo input.

**Files:**
- Modify: `app/src/ledger/TransactionForm.tsx`

**Interfaces:**
- Consumes: `memosByPayee` and `allMemos` from `useBudget()`; existing local state `payee` and `payees` list.
- Produces: no exported changes.

- [ ] **Step 1: Add `useMemo` import**

At the very top of the file (line 1), change:

```tsx
import { useState } from 'react';
```

to:

```tsx
import { useMemo, useState } from 'react';
```

- [ ] **Step 2: Pull the new fields out of `useBudget()`**

Update the destructure on line 11 from:

```tsx
  const { allCategories, payees, upsertPayee, addTransaction, updateTransaction } = useBudget();
```

to:

```tsx
  const { allCategories, payees, upsertPayee, addTransaction, updateTransaction, memosByPayee, allMemos } = useBudget();
```

- [ ] **Step 3: Compute the memo option list**

Immediately after the `const [error, setError] = useState('');` line (line 21), add:

```tsx
  const memoOptions = useMemo(() => {
    const key = payee.trim().toLowerCase();
    const id = key ? payees.find((p) => p.name.toLowerCase() === key)?.id : undefined;
    return (id && memosByPayee.get(id)) || allMemos;
  }, [payee, payees, memosByPayee, allMemos]);
```

- [ ] **Step 4: Attach the datalist to the memo input**

Change line 46 from:

```tsx
      <Input className="h-8 w-32" placeholder={t('txn.memo')} value={memo} onChange={(e) => setMemo(e.target.value)} />
```

to:

```tsx
      <Input className="h-8 w-32" placeholder={t('txn.memo')} list="memo-list" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <datalist id="memo-list">{memoOptions.map((m) => <option key={m} value={m} />)}</datalist>
```

- [ ] **Step 5: Type-check and lint**

Run from `app/`:

```
npx tsc -b --noEmit && npm run lint
```

Expected: no errors, no lint warnings.

- [ ] **Step 6: Run the full test suite**

Run from `app/`:

```
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Manual UI verification**

Start the dev server from `app/`:

```
npm run dev
```

In the browser:

1. Open a budget with existing transactions and enter Add-Transaction mode on any account.
2. Type a payee name that already exists (case-insensitive match) → memo field's dropdown shows only memos previously used with that payee, most recent first.
3. Clear the payee field → memo field's dropdown shows the global list of every distinct memo, most recent first.
4. Type a payee name that does NOT exist yet → memo field's dropdown falls back to the global list.
5. Save a new transaction with a brand-new memo, then reopen the form for the same payee → the new memo appears at the top of the payee-scoped list.

Stop the dev server.

- [ ] **Step 8: Commit**

```
git add app/src/ledger/TransactionForm.tsx
git commit -m "feat(ledger): auto-suggest memos in transaction form"
```
