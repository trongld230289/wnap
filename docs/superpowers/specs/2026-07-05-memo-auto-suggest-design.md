# Memo Auto-Suggest — Design

## Problem

When adding a transaction, the Payee field already offers autocomplete suggestions from past entries via an HTML `<datalist>`. The Memo field does not — users must re-type common notes ("cà phê sáng", "họp khách", "grab về nhà") every time.

Goal: give Memo the same "pick from what you've typed before" experience, scoped intelligently to the currently-selected payee.

## Scope of suggestions

Memo suggestions are **scoped to the selected payee, falling back to a global list** when there is no scoped match:

- If the typed Payee name matches an existing payee **and** that payee has prior memos → suggest those (most recent first).
- Otherwise (no payee typed, unknown payee, or that payee has no prior memos) → suggest all distinct memos across the budget (most recent first).

This gives targeted suggestions when useful and still helps when the payee is new or empty.

## Approach

Derive suggestions in-memory from the existing `transactions` list already loaded into `useBudget`. **No schema change, no new table, no new upsert method.** Memo remains a free-text column on `transactions`; we're simply surfacing prior values.

Rejected alternatives:

- **New `memos` table + `upsertMemo()`** — mirrors the Payee pattern exactly but forces a migration, mapper changes, and turns memos into a managed entity (rename, delete, orphan cleanup) for zero real gain. Autocomplete does not need a first-class entity.
- **Server-side `SELECT DISTINCT memo`** — extra round trip; scope-by-payee needs another query. All the data is already in memory.

## Data derivation (`app/src/budget/useBudget.tsx`)

Add two memoized values on `BudgetCtx`, built from the existing `transactions` state:

```ts
memosByPayee: Map<string, string[]>;   // payeeId → distinct memos, most recent first
allMemos: string[];                     // distinct memos across all txns, most recent first
```

Rules for both derivations:

- Skip transactions where memo is null or empty (after trim).
- Walk `transactions` newest-first (the array is already sorted `date DESC` — see `useBudget.tsx:88`) so "first seen wins" produces most-recent-first ordering.
- Dedup **case-insensitively**, keying by `memo.trim().toLowerCase()`.
- When two rows dedup together, keep the memo string from the **most recent** occurrence (preserves whatever casing the user typed last).

`memosByPayee` keys on `payee_id`; transactions with a null `payee_id` are excluded from it (but still contribute to `allMemos`).

Both values are `useMemo`'d against `transactions` so they only recompute when transactions change.

## Form wiring (`app/src/ledger/TransactionForm.tsx`)

Read the two new values from `useBudget()`. Compute the current payee match against the typed Payee input:

```tsx
const matchedPayeeId = useMemo(() => {
  const key = payee.trim().toLowerCase();
  return key ? payees.find((p) => p.name.toLowerCase() === key)?.id ?? null : null;
}, [payee, payees]);

const memoOptions = (matchedPayeeId && memosByPayee.get(matchedPayeeId)) || allMemos;
```

Wire the existing memo `<Input>` to a new datalist, mirroring the Payee field pattern already at `TransactionForm.tsx:38-39`:

```tsx
<Input className="h-8 w-32" placeholder={t('txn.memo')} list="memo-list" value={memo} onChange={(e) => setMemo(e.target.value)} />
<datalist id="memo-list">{memoOptions.map((m) => <option key={m} value={m} />)}</datalist>
```

Nothing else in the form changes. The `save()` flow is unchanged — memo is still a free-text field written directly to the `transactions.memo` column.

## Edge cases

- **Editing a transaction**: identical behavior — as the user retypes the payee, suggestions update live.
- **New payee not yet in `payees`**: `matchedPayeeId` is null → falls back to `allMemos`. Correct — there is nothing to scope against yet.
- **Payee typed with different casing than stored**: the case-insensitive match on the payee name handles this.
- **Very large transaction history**: `useMemo` runs once per `transactions` change; the datalist itself is browser-rendered and cheap. If suggestion lists ever become genuinely huge we can cap `allMemos` (e.g., last 200 distinct), but not now — YAGNI.
- **Empty `memoOptions`**: the datalist is empty; the input degrades to a normal free-text field. No error state needed.

## Testing

Unit-test the derivation with a synthetic transactions list:

- Distinct memos are grouped by payee correctly.
- Ordering is most-recent-first.
- Case-insensitive dedup keeps the most recent occurrence's casing.
- Null/empty memos are skipped.
- Transactions with null `payee_id` are excluded from `memosByPayee` but included in `allMemos`.

No new UI/integration test — the datalist plumbing exactly mirrors the existing Payee field, which is already exercised by the form's shape.

## Non-goals

- No new database table, migration, or `upsert*` method.
- No cross-budget suggestions.
- No "remove suggestion" UI (browser handles datalist behavior natively; suggestions naturally disappear when the underlying transaction is deleted).
- No per-category scoping (payee scoping is enough).
- No fuzzy matching — datalist's built-in substring match is fine.
