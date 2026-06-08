# WNAP Module B — C1: Ledger Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một màn Ledger chạy thật: tab Plan/Ledger, sidebar accounts (CASH/SAVINGS + All Accounts), 3 balances, bảng giao dịch (xem), tạo account, nhập giao dịch — và khi nhập, Plan screen tự cập nhật Activity/RTA/đỏ.

**Architecture:** Mở rộng `useBudget` (nguồn sự thật chung) để cũng load accounts + payees và expose giao dịch dạng `LedgerTxn` + mutations `addAccount`/`addTransaction`/`upsertPayee`. Balance & nhóm account là hàm thuần test bằng Vitest. Component React tách nhỏ. UI trần (inline style) — polish Phase 3.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, @supabase/supabase-js. Tiền VND số nguyên (âm=outflow, dương=inflow). Tháng `'YYYY-MM'`, ngày `'YYYY-MM-DD'`.

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-module-b-ledger-design.md` (§3 dữ liệu, §4 data layer, §5 component). C1 = foundation (xem + thêm). C2 (sau): toggle/edit/delete, payee autocomplete, reconcile, transfer.

**Prerequisite:** Module A (Plan screen) merged. `useBudget` (2B), `mappers.ts`, `format.ts`, `Modal.tsx` đã có. Bảng `accounts`/`transactions`/`payees` đã có (migration 0001). Mọi lệnh trong `app/`.

---

## File Structure

```
app/src/
  ledger/
    ledgerBalances.ts      ← balances() (Task 1, pure)
    ledgerGroups.ts        ← groupAccounts() (Task 2, pure)
    AccountSidebar.tsx     ← (Task 6)
    BalanceHeader.tsx      ← (Task 6)
    TransactionTable.tsx   ← (Task 7)
    TransactionForm.tsx    ← thêm giao dịch (Task 7)
    LedgerScreen.tsx       ← ghép (Task 7)
    __tests__/ledgerBalances.test.ts, ledgerGroups.test.ts
  nav/AppTabs.tsx          ← tab Plan/Ledger (Task 5)
  lib/mappers.ts           ← thêm LedgerTxn/account/payee maps (Task 3, MODIFY)
  budget/useBudget.tsx     ← fetch accounts+payees + mutations (Task 4, MODIFY toàn bộ)
  App.tsx                  ← tab state (Task 5, MODIFY)
```

Test 1 file: `npx vitest run src/ledger/__tests__/<file>` ; tất cả: `npm test` ; type-check: `npx tsc --noEmit`.

---

### Task 1: ledgerBalances.ts — Cleared/Uncleared/Working

**Files:**
- Create: `app/src/ledger/ledgerBalances.ts`
- Test: `app/src/ledger/__tests__/ledgerBalances.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/ledger/__tests__/ledgerBalances.test.ts`:

```ts
import { expect, test } from 'vitest';
import { balances } from '../ledgerBalances';

test('cleared gồm cả reconciled; uncleared riêng; working = tổng', () => {
  const out = balances([
    { amount: 5_000_000, status: 'reconciled' },
    { amount: -400_000, status: 'cleared' },
    { amount: 200_000, status: 'uncleared' },
    { amount: -50_000, status: 'uncleared' },
  ]);
  expect(out.cleared).toBe(4_600_000);     // 5.0tr − 400k
  expect(out.uncleared).toBe(150_000);     // 200k − 50k
  expect(out.working).toBe(4_750_000);     // cleared + uncleared
});

test('rỗng → tất cả 0', () => {
  expect(balances([])).toEqual({ cleared: 0, uncleared: 0, working: 0 });
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/ledger/__tests__/ledgerBalances.test.ts` → Expected: "Cannot find module".

- [ ] **Step 3: Implement** — `app/src/ledger/ledgerBalances.ts`:

```ts
export type TxStatus = 'uncleared' | 'cleared' | 'reconciled';
export interface BalTxn { amount: number; status: TxStatus; }
export interface Balances { cleared: number; uncleared: number; working: number; }

/** Cleared = Σ amount của tx đã cleared/reconciled; Uncleared = Σ tx uncleared; Working = tổng. */
export function balances(txns: BalTxn[]): Balances {
  let cleared = 0;
  let uncleared = 0;
  for (const t of txns) {
    if (t.status === 'uncleared') uncleared += t.amount;
    else cleared += t.amount;
  }
  return { cleared, uncleared, working: cleared + uncleared };
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/ledger/ledgerBalances.ts app/src/ledger/__tests__/ledgerBalances.test.ts
git commit -m "feat(ledger): add cleared/uncleared/working balance helper"
```

---

### Task 2: ledgerGroups.ts — nhóm account theo type + số dư

**Files:**
- Create: `app/src/ledger/ledgerGroups.ts`
- Test: `app/src/ledger/__tests__/ledgerGroups.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/ledger/__tests__/ledgerGroups.test.ts`:

```ts
import { expect, test } from 'vitest';
import { groupAccounts } from '../ledgerGroups';

const accounts = [
  { id: 'a1', name: 'Ví tiền mặt', type: 'cash' as const },
  { id: 'a2', name: 'Vietcombank', type: 'cash' as const },
  { id: 'a3', name: 'Sổ tiết kiệm', type: 'savings' as const },
];
const txns = [
  { accountId: 'a1', amount: 2_000_000 },
  { accountId: 'a2', amount: 5_000_000 },
  { accountId: 'a2', amount: 200_000 },
  { accountId: 'a3', amount: 50_000_000 },
];

test('nhóm cash/savings, working mỗi account = Σ amount, total = tổng', () => {
  const g = groupAccounts(accounts, txns);
  expect(g.cash.map((a) => [a.id, a.working])).toEqual([['a1', 2_000_000], ['a2', 5_200_000]]);
  expect(g.savings.map((a) => [a.id, a.working])).toEqual([['a3', 50_000_000]]);
  expect(g.total).toBe(57_200_000);
});

test('account chưa có giao dịch → working 0', () => {
  expect(groupAccounts([{ id: 'x', name: 'Mới', type: 'cash' }], []).cash[0].working).toBe(0);
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/ledger/__tests__/ledgerGroups.test.ts` → Expected: "Cannot find module".

- [ ] **Step 3: Implement** — `app/src/ledger/ledgerGroups.ts`:

```ts
export type AccountType = 'cash' | 'savings';
export interface AccountLite { id: string; name: string; type: AccountType; }
export interface AccTxnLite { accountId: string; amount: number; }
export interface AccountWithBalance extends AccountLite { working: number; }
export interface AccountGroups { cash: AccountWithBalance[]; savings: AccountWithBalance[]; total: number; }

/** Working mỗi account = Σ amount mọi giao dịch của nó (cleared + uncleared). */
export function groupAccounts(accounts: AccountLite[], txns: AccTxnLite[]): AccountGroups {
  const workingById = new Map<string, number>();
  for (const t of txns) workingById.set(t.accountId, (workingById.get(t.accountId) ?? 0) + t.amount);
  const withBal: AccountWithBalance[] = accounts.map((a) => ({ ...a, working: workingById.get(a.id) ?? 0 }));
  return {
    cash: withBal.filter((a) => a.type === 'cash'),
    savings: withBal.filter((a) => a.type === 'savings'),
    total: withBal.reduce((s, a) => s + a.working, 0),
  };
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/ledger/ledgerGroups.ts app/src/ledger/__tests__/ledgerGroups.test.ts
git commit -m "feat(ledger): add account grouping with working balances"
```

---

### Task 3: mappers — LedgerTxn + account/payee maps

**Files:**
- Modify: `app/src/lib/mappers.ts`
- Test: thêm vào `app/src/budget/__tests__/mappers.test.ts`

- [ ] **Step 1: Mở rộng `RawTransaction`** trong `app/src/lib/mappers.ts` — thay dòng định nghĩa hiện tại:

```ts
export interface RawTransaction { id: string; account_id: string; date: string; category_id: string | null; amount: number; status: Transaction['status']; }
```

thành (thêm 3 field optional — Supabase sẽ trả về khi select; optional để không phá fixture/engine mapping cũ):

```ts
export interface RawTransaction {
  id: string; account_id: string; date: string; category_id: string | null;
  amount: number; status: Transaction['status'];
  payee_id?: string | null; memo?: string | null; transfer_id?: string | null;
}
```

- [ ] **Step 2: Thêm types + maps** vào cuối `app/src/lib/mappers.ts` (sau `toBudgetInput`):

```ts
export type AccountType = 'cash' | 'savings';
export interface RawAccount { id: string; name: string; type: AccountType; reconciled_at: string | null; sort_order: number; }
export interface RawPayee { id: string; name: string; }

export interface LedgerAccount { id: string; name: string; type: AccountType; reconciledAt: string | null; }
export interface LedgerPayee { id: string; name: string; }
export interface LedgerTxn {
  id: string; accountId: string; date: string; payeeId: string | null;
  categoryId: string | null; memo: string | null; amount: number;
  status: Transaction['status']; transferId: string | null;
}

export const mapAccounts = (rows: RawAccount[]): LedgerAccount[] =>
  rows.map((a) => ({ id: a.id, name: a.name, type: a.type, reconciledAt: a.reconciled_at }));

export const mapPayees = (rows: RawPayee[]): LedgerPayee[] =>
  rows.map((p) => ({ id: p.id, name: p.name }));

export const mapLedgerTxns = (rows: RawTransaction[]): LedgerTxn[] =>
  rows.map((r) => ({
    id: r.id, accountId: r.account_id, date: r.date, payeeId: r.payee_id ?? null,
    categoryId: r.category_id, memo: r.memo ?? null, amount: r.amount,
    status: r.status, transferId: r.transfer_id ?? null,
  }));
```

- [ ] **Step 3: Thêm test** vào cuối `app/src/budget/__tests__/mappers.test.ts`:

```ts
import { mapAccounts, mapPayees, mapLedgerTxns } from '../../lib/mappers';

test('mapAccounts: snake → camel, giữ reconciled_at', () => {
  expect(mapAccounts([{ id: 'a1', name: 'VCB', type: 'cash', reconciled_at: '2026-06-01T00:00:00Z', sort_order: 0 }]))
    .toEqual([{ id: 'a1', name: 'VCB', type: 'cash', reconciledAt: '2026-06-01T00:00:00Z' }]);
});

test('mapPayees', () => {
  expect(mapPayees([{ id: 'p1', name: 'Co.opmart' }])).toEqual([{ id: 'p1', name: 'Co.opmart' }]);
});

test('mapLedgerTxns: gồm payee/memo/transfer, default null', () => {
  expect(mapLedgerTxns([
    { id: 't1', account_id: 'a1', date: '2026-06-05', category_id: 'c1', amount: -200000, status: 'uncleared', payee_id: 'p1', memo: 'chợ', transfer_id: null },
    { id: 't2', account_id: 'a1', date: '2026-06-06', category_id: null, amount: 100, status: 'cleared' },
  ])).toEqual([
    { id: 't1', accountId: 'a1', date: '2026-06-05', payeeId: 'p1', categoryId: 'c1', memo: 'chợ', amount: -200000, status: 'uncleared', transferId: null },
    { id: 't2', accountId: 'a1', date: '2026-06-06', payeeId: null, categoryId: null, memo: null, amount: 100, status: 'cleared', transferId: null },
  ]);
});
```

- [ ] **Step 4: Verify** — Run: `npx vitest run src/budget/__tests__/mappers.test.ts` → Expected: tất cả PASS (cũ + 3 mới). `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/mappers.ts app/src/budget/__tests__/mappers.test.ts
git commit -m "feat(ledger): add account/payee/ledger-txn mappers"
```

---

### Task 4: useBudget — fetch accounts+payees, expose, mutations

**Files:**
- Modify (thay TOÀN BỘ): `app/src/budget/useBudget.tsx`

Verify bằng `tsc`. Đây là bản 2B + thêm phần ledger (accounts/payees/transactions/allCategories/accountName + addAccount/addTransaction/upsertPayee).

- [ ] **Step 1: Thay toàn bộ `app/src/budget/useBudget.tsx` bằng:**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow, Proposal, MonthSummary, TargetStrategy, TargetCadence } from '../engine';
import { toBudgetInput, deriveFirstMonth, mapAccounts, mapPayees, mapLedgerTxns } from '../lib/mappers';
import type { RawBudgetData, RawAccount, RawPayee, LedgerAccount, LedgerPayee, LedgerTxn, AccountType } from '../lib/mappers';

export interface TargetInput {
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay: number | null;
  dueWeekday: number | null;
  dueDate: string | null;
}

export interface NewTransaction {
  accountId: string;
  date: string;
  payeeId: string | null;
  categoryId: string | null;
  memo: string | null;
  amount: number;
}

interface BudgetCtx {
  loading: boolean;
  viewMonth: Month;
  setViewMonth: (m: Month) => void;
  rows: PlanRow[];
  rta: number;
  summaries: Map<Month, MonthSummary>;
  firstMonth: Month;
  groups: { id: string; name: string; isSystem: boolean }[];
  allCategories: { id: string; name: string; isSystem: boolean }[];
  accounts: LedgerAccount[];
  payees: LedgerPayee[];
  transactions: LedgerTxn[];
  categoryName: (id: string) => string;
  accountName: (id: string) => string;
  groupIdOf: (categoryId: string) => string;
  refetch: () => Promise<void>;
  setAssigned: (categoryId: string, amount: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addCategory: (groupId: string, name: string, kind: string) => Promise<void>;
  setTarget: (categoryId: string, t: TargetInput) => Promise<void>;
  removeTarget: (categoryId: string) => Promise<void>;
  setSnooze: (categoryId: string, snoozed: boolean) => Promise<void>;
  moveMoney: (fromId: string, toId: string, amount: number) => Promise<void>;
  applyProposals: (proposals: Proposal[]) => Promise<void>;
  addAccount: (name: string, type: AccountType) => Promise<void>;
  upsertPayee: (name: string) => Promise<string | null>;
  addTransaction: (t: NewTransaction) => Promise<void>;
}

const Ctx = createContext<BudgetCtx | null>(null);

interface FetchResult {
  raw: RawBudgetData;
  groups: BudgetCtx['groups'];
  accounts: RawAccount[];
  payees: RawPayee[];
}

async function fetchRaw(budgetId: string): Promise<FetchResult> {
  const [g, c, t, s, a, tx, acc, pay] = await Promise.all([
    supabase.from('category_groups').select('id,name,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('categories').select('id,group_id,name,kind,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('targets').select('category_id,strategy,amount,cadence,due_day,due_weekday,due_date').eq('budget_id', budgetId),
    supabase.from('target_snoozes').select('category_id,month').eq('budget_id', budgetId),
    supabase.from('assignments').select('category_id,month,assigned').eq('budget_id', budgetId),
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status,payee_id,memo').eq('budget_id', budgetId).order('date', { ascending: false }),
    supabase.from('accounts').select('id,name,type,reconciled_at,sort_order').eq('budget_id', budgetId).eq('closed', false).order('sort_order'),
    supabase.from('payees').select('id,name').eq('budget_id', budgetId),
  ]);
  return {
    raw: {
      categories: (c.data ?? []) as RawBudgetData['categories'],
      targets: (t.data ?? []) as RawBudgetData['targets'],
      snoozes: (s.data ?? []) as RawBudgetData['snoozes'],
      assignments: (a.data ?? []) as RawBudgetData['assignments'],
      transactions: (tx.data ?? []) as RawBudgetData['transactions'],
    },
    groups: (g.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, isSystem: r.is_system as boolean })),
    accounts: (acc.data ?? []) as RawAccount[],
    payees: (pay.data ?? []) as RawPayee[],
  };
}

export function BudgetProvider({ budgetId, children }: { budgetId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawBudgetData>({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] });
  const [groups, setGroups] = useState<BudgetCtx['groups']>([]);
  const [rawAccounts, setRawAccounts] = useState<RawAccount[]>([]);
  const [rawPayees, setRawPayees] = useState<RawPayee[]>([]);
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(new Date().toISOString()));

  const refetch = useCallback(async () => {
    const r = await fetchRaw(budgetId);
    setRaw(r.raw);
    setGroups(r.groups);
    setRawAccounts(r.accounts);
    setRawPayees(r.payees);
    setLoading(false);
  }, [budgetId]);

  useEffect(() => { refetch(); }, [refetch]);

  const { rows, rta, summaries, firstMonth } = useMemo(() => {
    const dataFirst = deriveFirstMonth(raw, viewMonth);
    const firstMonth = viewMonth < dataFirst ? viewMonth : dataFirst;
    const input = toBudgetInput(raw, firstMonth);
    const summaries = computeThrough(input, viewMonth);
    return {
      rows: buildPlanRows(input, summaries, viewMonth),
      rta: summaries.get(viewMonth)?.rta ?? 0,
      summaries, firstMonth,
    };
  }, [raw, viewMonth]);

  const nameById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.name])), [raw]);
  const groupById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.group_id])), [raw]);
  const accounts = useMemo(() => mapAccounts(rawAccounts), [rawAccounts]);
  const payees = useMemo(() => mapPayees(rawPayees), [rawPayees]);
  const transactions = useMemo(() => mapLedgerTxns(raw.transactions), [raw]);
  const allCategories = useMemo(() => raw.categories.map((c) => ({ id: c.id, name: c.name, isSystem: c.is_system })), [raw]);
  const accNameById = useMemo(() => new Map(rawAccounts.map((a) => [a.id, a.name])), [rawAccounts]);

  const setAssigned = useCallback(async (categoryId: string, amount: number) => {
    await supabase.from('assignments').upsert({ budget_id: budgetId, category_id: categoryId, month: viewMonth, assigned: amount }, { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const addGroup = useCallback(async (name: string) => {
    await supabase.from('category_groups').insert({ budget_id: budgetId, name });
    await refetch();
  }, [budgetId, refetch]);

  const addCategory = useCallback(async (groupId: string, name: string, kind: string) => {
    await supabase.from('categories').insert({ budget_id: budgetId, group_id: groupId, name, kind });
    await refetch();
  }, [budgetId, refetch]);

  const setTarget = useCallback(async (categoryId: string, t: TargetInput) => {
    await supabase.from('targets').upsert({ budget_id: budgetId, category_id: categoryId, strategy: t.strategy, amount: t.amount, cadence: t.cadence, due_day: t.dueDay, due_weekday: t.dueWeekday, due_date: t.dueDate }, { onConflict: 'category_id' });
    await refetch();
  }, [budgetId, refetch]);

  const removeTarget = useCallback(async (categoryId: string) => {
    await supabase.from('targets').delete().eq('budget_id', budgetId).eq('category_id', categoryId);
    await refetch();
  }, [budgetId, refetch]);

  const setSnooze = useCallback(async (categoryId: string, snoozed: boolean) => {
    if (snoozed) {
      await supabase.from('target_snoozes').upsert({ budget_id: budgetId, category_id: categoryId, month: viewMonth }, { onConflict: 'category_id,month', ignoreDuplicates: true });
    } else {
      await supabase.from('target_snoozes').delete().eq('category_id', categoryId).eq('month', viewMonth);
    }
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const moveMoney = useCallback(async (fromId: string, toId: string, amount: number) => {
    const assignedNow = (id: string) => raw.assignments.find((a) => a.category_id === id && a.month === viewMonth)?.assigned ?? 0;
    await supabase.from('assignments').upsert([
      { budget_id: budgetId, category_id: fromId, month: viewMonth, assigned: assignedNow(fromId) - amount },
      { budget_id: budgetId, category_id: toId, month: viewMonth, assigned: assignedNow(toId) + amount },
    ], { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, raw, refetch]);

  const applyProposals = useCallback(async (proposals: Proposal[]) => {
    if (proposals.length === 0) return;
    await supabase.from('assignments').upsert(proposals.map((p) => ({ budget_id: budgetId, category_id: p.categoryId, month: viewMonth, assigned: p.newAssigned })), { onConflict: 'category_id,month' });
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const addAccount = useCallback(async (name: string, type: AccountType) => {
    await supabase.from('accounts').insert({ budget_id: budgetId, name, type });
    await refetch();
  }, [budgetId, refetch]);

  const upsertPayee = useCallback(async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = rawPayees.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const { data } = await supabase.from('payees').insert({ budget_id: budgetId, name: trimmed }).select('id').single();
    return (data?.id as string) ?? null;
  }, [budgetId, rawPayees]);

  const addTransaction = useCallback(async (t: NewTransaction) => {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('transactions').insert({
      budget_id: budgetId, account_id: t.accountId, date: t.date,
      payee_id: t.payeeId, category_id: t.categoryId, memo: t.memo,
      amount: t.amount, status: 'uncleared', created_by: auth.user?.id,
    });
    await refetch();
  }, [budgetId, refetch]);

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, summaries, firstMonth, groups, allCategories,
    accounts, payees, transactions,
    categoryName: (id) => nameById.get(id) ?? id,
    accountName: (id) => accNameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory, setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
    addAccount, upsertPayee, addTransaction,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → exit 0. Run `npx vitest run` → tất cả test cũ vẫn pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(ledger): extend useBudget with accounts, payees, transactions and add mutations"
```

---

### Task 5: AppTabs + App.tsx (tab Plan/Ledger)

**Files:**
- Create: `app/src/nav/AppTabs.tsx`
- Modify (thay TOÀN BỘ): `app/src/App.tsx`

- [ ] **Step 1: Implement `app/src/nav/AppTabs.tsx`:**

```tsx
export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  const item = (id: AppTab, label: string) => (
    <button
      onClick={() => onChange(id)}
      style={{
        padding: '8px 16px', border: 0, background: 'none', cursor: 'pointer',
        color: tab === id ? '#1f9d55' : '#888',
        fontWeight: tab === id ? 700 : 400,
        borderBottom: tab === id ? '2px solid #1f9d55' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e3e3e6', maxWidth: 980, margin: '8px auto 0', fontFamily: 'sans-serif' }}>
      {item('plan', 'Kế hoạch')}
      {item('ledger', 'Sổ giao dịch')}
    </div>
  );
}
```

- [ ] **Step 2: Thay toàn bộ `app/src/App.tsx`:**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useSession } from './hooks/useSession';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { SetupPage } from './pages/SetupPage';
import { BudgetProvider } from './budget/useBudget';
import { PlanScreen } from './plan/PlanScreen';
import { LedgerScreen } from './ledger/LedgerScreen';
import { AppTabs } from './nav/AppTabs';
import type { AppTab } from './nav/AppTabs';

interface Membership { budget_id: string; budget_name: string; }

export default function App() {
  const { session, loading } = useSession();
  const [budget, setBudget] = useState<Membership | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AppTab>('plan');

  const loadBudget = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase
      .from('budget_members')
      .select('budget_id, budgets(name)')
      .limit(1)
      .maybeSingle();
    setBudget(
      data ? { budget_id: data.budget_id, budget_name: (data.budgets as { name: string }).name } : null,
    );
    setChecking(false);
  }, []);

  useEffect(() => {
    if (session) loadBudget();
    else { setBudget(null); setChecking(false); }
  }, [session, loadBudget]);

  if (loading || checking) return <p>Đang tải…</p>;
  if (!session) return <AuthPage />;
  if (!budget) return <SetupPage onDone={loadBudget} />;
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <div style={{ textAlign: 'right', maxWidth: 980, margin: '8px auto 0', fontFamily: 'sans-serif' }}>
        <span style={{ color: '#777', fontSize: 13, marginRight: 8 }}>{budget.budget_name}</span>
        <button onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
      </div>
      <AppTabs tab={tab} onChange={setTab} />
      {tab === 'plan' ? <PlanScreen /> : <LedgerScreen />}
    </BudgetProvider>
  );
}
```

- [ ] **Step 3: Verify** — Run: `npx tsc --noEmit`. Expected: lỗi DUY NHẤT là không tìm thấy `./ledger/LedgerScreen` (chưa tạo — sẽ có ở Task 7). Nếu lỗi khác → sửa. KHÔNG commit ở bước này (chờ Task 7 để build pass).

> **Lưu ý cho người thực thi:** Task 5 và Task 7 phải hoàn tất cùng nhau mới `tsc` sạch (App.tsx import LedgerScreen). Làm Task 6, 7 rồi mới commit chung. Nếu muốn commit sớm, tạm thêm file `app/src/ledger/LedgerScreen.tsx` rỗng `export function LedgerScreen() { return null; }` rồi hoàn thiện ở Task 7 — nhưng khuyến nghị làm liền Task 6–7.

---

### Task 6: AccountSidebar + BalanceHeader

**Files:**
- Create: `app/src/ledger/AccountSidebar.tsx`, `app/src/ledger/BalanceHeader.tsx`

- [ ] **Step 1: Implement `app/src/ledger/AccountSidebar.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { groupAccounts } from './ledgerGroups';
import { formatVnd } from '../budget/format';

export function AccountSidebar({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { accounts, transactions, addAccount } = useBudget();
  const g = groupAccounts(accounts, transactions);

  async function onAdd() {
    const name = window.prompt('Tên tài khoản mới:');
    if (!name) return;
    const type = window.confirm('OK = Tiết kiệm (Savings), Cancel = Tiền mặt (Cash)') ? 'savings' : 'cash';
    await addAccount(name, type);
  }

  const item = (id: string, name: string, working: number) => (
    <div key={id} onClick={() => onSelect(id)}
      style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
        background: selected === id ? '#e8f3ec' : 'transparent', color: selected === id ? '#1f7d45' : '#333', fontWeight: selected === id ? 600 : 400 }}>
      <span>{name}</span><span style={{ color: '#999' }}>{formatVnd(working)}</span>
    </div>
  );
  const grpLabel = (s: string) => <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#aaa', margin: '10px 0 4px' }}>{s}</div>;

  return (
    <div style={{ width: 190, background: '#fafafa', borderRight: '1px solid #eee', padding: 10, fontSize: 13 }}>
      {item('all', 'Tất cả tài khoản', g.total)}
      {g.cash.length > 0 && grpLabel('Tiền mặt')}
      {g.cash.map((a) => item(a.id, a.name, a.working))}
      {g.savings.length > 0 && grpLabel('Tiết kiệm')}
      {g.savings.map((a) => item(a.id, a.name, a.working))}
      <div onClick={onAdd} style={{ marginTop: 12, color: '#2b6cb0', cursor: 'pointer' }}>＋ Thêm tài khoản</div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/src/ledger/BalanceHeader.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd } from '../budget/format';

export function BalanceHeader({ accountId }: { accountId: string }) {
  const { accounts, transactions, accountName } = useBudget();
  const txns = accountId === 'all' ? transactions : transactions.filter((t) => t.accountId === accountId);
  const b = balances(txns);
  const title = accountId === 'all' ? 'Tất cả tài khoản' : accountName(accountId);
  const acc = accounts.find((a) => a.id === accountId);
  const recLabel = (() => {
    if (accountId === 'all' || !acc?.reconciledAt) return 'Chưa đối soát';
    const days = Math.floor((Date.now() - new Date(acc.reconciledAt).getTime()) / 86_400_000);
    return `Đối soát ${days} ngày trước`;
  })();

  const cell = (lab: string, v: number, color: string) => (
    <div style={{ flex: 1, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{lab}</div>
      <div style={{ fontWeight: 700, color }}>{formatVnd(v)}₫</div>
    </div>
  );
  const op = (s: string) => <div style={{ alignSelf: 'center', color: '#bbb', padding: '0 4px' }}>{s}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div><span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
          <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{recLabel}</span></div>
      </div>
      <div style={{ display: 'flex', border: '1px solid #eee', borderRadius: 8, marginBottom: 10 }}>
        {cell('Cleared', b.cleared, '#333')}{op('＋')}{cell('Uncleared', b.uncleared, '#caa007')}{op('＝')}{cell('Working', b.working, '#1f9d55')}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — Run: `npx tsc --noEmit`. Expected: vẫn chỉ lỗi thiếu `LedgerScreen` (Task 7). KHÔNG commit riêng.

---

### Task 7: TransactionTable + TransactionForm + LedgerScreen

**Files:**
- Create: `app/src/ledger/TransactionTable.tsx`, `app/src/ledger/TransactionForm.tsx`, `app/src/ledger/LedgerScreen.tsx`

- [ ] **Step 1: Implement `app/src/ledger/TransactionForm.tsx`** (thêm giao dịch; payee text → upsertPayee; category select gồm cả Inflow system; Outflow/Inflow → amount có dấu):

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { parseVnd } from '../budget/format';

const inp: React.CSSProperties = { border: '1px solid #cfd8d2', borderRadius: 5, padding: '5px 7px', fontSize: 12 };

export function TransactionForm({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const { allCategories, upsertPayee, addTransaction } = useBudget();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [payee, setPayee] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [memo, setMemo] = useState('');
  const [outflow, setOutflow] = useState('');
  const [inflow, setInflow] = useState('');

  async function save() {
    const out = parseVnd(outflow);
    const inn = parseVnd(inflow);
    const amount = inn > 0 ? inn : -out;
    if (amount === 0) { window.alert('Nhập Outflow hoặc Inflow'); return; }
    const payeeId = payee.trim() ? await upsertPayee(payee) : null;
    await addTransaction({ accountId, date, payeeId, categoryId: categoryId || null, memo: memo.trim() || null, amount });
    onDone();
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: '#fbfdfb', padding: 8, borderRadius: 8, border: '1px solid #e6efe8', marginBottom: 8 }}>
      <input style={{ ...inp, width: 120 }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <input style={{ ...inp, width: 130 }} placeholder="Payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
      <select style={{ ...inp, width: 160 }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        <option value="">— Chọn category —</option>
        {allCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input style={{ ...inp, width: 120 }} placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <input style={{ ...inp, width: 90 }} placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
      <button onClick={save} style={{ background: '#1f9d55', color: '#fff', border: 0, borderRadius: 5, padding: '5px 12px' }}>Lưu</button>
      <button onClick={onDone} style={{ border: 0, background: 'none', color: '#888' }}>Hủy</button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/src/ledger/TransactionTable.tsx`** (xem; icon trạng thái hiển thị; sửa/xóa/toggle để C2):

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns }: { txns: LedgerTxn[] }) {
  const { categoryName, accountName, payees } = useBudget();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  const th: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', color: '#999', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #eee' };
  const td: React.CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #f3f3f3' };
  const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr><th style={th}></th><th style={th}>Ngày</th><th style={th}>Payee</th><th style={th}>Category</th><th style={th}>Memo</th><th style={{ ...th, textAlign: 'right' }}>Outflow</th><th style={{ ...th, textAlign: 'right' }}>Inflow</th></tr>
      </thead>
      <tbody>
        {txns.map((t) => (
          <tr key={t.id}>
            <td style={{ ...td, color: t.status === 'uncleared' ? '#bbb' : '#1f9d55' }}>{STATUS_ICON[t.status]}</td>
            <td style={td}>{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</td>
            <td style={td}>{t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}</td>
            <td style={{ ...td, color: t.categoryId ? '#1f7d45' : '#999' }}>{t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}</td>
            <td style={{ ...td, color: '#888' }}>{t.memo}</td>
            <td style={num}>{t.amount < 0 ? formatVnd(-t.amount) : ''}</td>
            <td style={{ ...num, color: '#1f9d55' }}>{t.amount > 0 ? formatVnd(t.amount) : ''}</td>
          </tr>
        ))}
        {txns.length === 0 && <tr><td colSpan={7} style={{ ...td, color: '#aaa', textAlign: 'center' }}>Chưa có giao dịch</td></tr>}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Implement `app/src/ledger/LedgerScreen.tsx`:**

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AccountSidebar } from './AccountSidebar';
import { BalanceHeader } from './BalanceHeader';
import { TransactionTable } from './TransactionTable';
import { TransactionForm } from './TransactionForm';

export function LedgerScreen() {
  const { loading, accounts, transactions } = useBudget();
  const [selected, setSelected] = useState<string>('all');
  const [adding, setAdding] = useState(false);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải sổ giao dịch…</p>;

  const txns = selected === 'all' ? transactions : transactions.filter((t) => t.accountId === selected);
  const canAdd = selected !== 'all';

  return (
    <div style={{ maxWidth: 980, margin: '12px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', border: '1px solid #e3e3e6', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
        <AccountSidebar selected={selected} onSelect={(id) => { setSelected(id); setAdding(false); }} />
        <div style={{ flex: 1, padding: '12px 14px' }}>
          <BalanceHeader accountId={selected} />
          <div style={{ marginBottom: 8 }}>
            {canAdd
              ? <button onClick={() => setAdding(true)} disabled={adding}>＋ Thêm giao dịch</button>
              : <span style={{ fontSize: 12, color: '#aaa' }}>Chọn 1 tài khoản để thêm giao dịch{accounts.length === 0 ? ' (tạo tài khoản trước)' : ''}</span>}
          </div>
          {adding && canAdd && <TransactionForm accountId={selected} onDone={() => setAdding(false)} />}
          <TransactionTable txns={txns} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify** — Run: `npx tsc --noEmit` → exit 0 (giờ App.tsx import được LedgerScreen). Run `npm test` → tất cả unit test pass (engine + ledgerBalances + ledgerGroups + mappers).

- [ ] **Step 5: Commit**

```bash
git add app/src/ledger app/src/nav app/src/App.tsx
git commit -m "feat(ledger): add Ledger screen (tabs, sidebar, balances, table, add transaction)"
```

---

### Task 8: End-to-end verify (Playwright) + chốt

**Files:** không tạo file; verify trên dev server + Supabase. Tài khoản Phase 0 (`wnap.husband@gmail.com` / `matkhau123`).

- [ ] **Step 1:** `npm run dev`, đăng nhập. Thấy tab **Kế hoạch / Sổ giao dịch**.

- [ ] **Step 2:** Sang tab **Sổ giao dịch** → bấm **＋ Thêm tài khoản** → "Vietcombank", chọn Cash → account hiện ở sidebar nhóm Tiền mặt, chọn nó.

- [ ] **Step 3: Inflow → RTA** — ＋ Thêm giao dịch → Payee "Công ty", Category **"Inflow: Ready to Assign"**, Inflow `15000000` → Lưu. Bảng hiện dòng inflow xanh; Working = 15.000.000. Sang tab **Kế hoạch** → **RTA tăng 15.000.000** (so trước đó).

- [ ] **Step 4: Outflow → Activity** — về Ledger → ＋ giao dịch → Category "Điện", Outflow `400000` → Lưu. Sang **Kế hoạch** → "Điện" có **Activity −400.000**, Available giảm; nếu chưa assign đủ → có thể **đỏ overspent**.

- [ ] **Step 5: All Accounts + balances** — chọn "Tất cả tài khoản" → thấy tổng hợp; Cleared/Uncleared/Working đúng (giao dịch mới = uncleared).

- [ ] **Step 6:** Không lỗi console đỏ. Dừng dev server.

---

## C1 hoàn thành khi

- [ ] `npm test` PASS 100% (engine 87 + ledgerBalances + ledgerGroups + mappers mới), `npx tsc --noEmit` exit 0.
- [ ] Tab Plan/Ledger chuyển được; sidebar accounts + 3 balances đúng.
- [ ] Tạo account; nhập giao dịch (inflow/outflow) ghi Supabase.
- [ ] Inflow vào "Inflow: Ready to Assign" làm **RTA Plan screen tăng**; outflow có category làm **Activity** hiện đúng.
- [ ] (Để C2) toggle uncleared↔cleared, sửa/xóa giao dịch, payee autocomplete, reconcile + soft-lock, transfer (+ migration `transfer_id`).
```
