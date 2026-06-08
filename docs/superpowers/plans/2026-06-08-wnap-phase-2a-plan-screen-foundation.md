# WNAP Phase 2A: Plan Screen Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một màn hình Plan chạy thật: load dữ liệu budget từ Supabase → engine tính → hiển thị bảng nhóm/category với cột Available (thanh + số, màu theo status), RTA header, filter cards, chuyển tháng; tạo được group/category và sửa Assigned inline (ghi Supabase).

**Architecture:** Lớp data thuần (`mappers`, `format`) test bằng Vitest. Một context `useBudget` fetch toàn bộ dữ liệu budget, gom `BudgetInput`, chạy `computeThrough`/`buildPlanRows` bằng `useMemo`; mutation = ghi Supabase rồi refetch+recompute. Component React tách nhỏ theo trách nhiệm. UI trần (inline style) — polish để Plan 2B/skill frontend-design.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, @supabase/supabase-js. Tiền VND số nguyên. Tháng `'YYYY-MM'`.

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-phase-2-plan-screen-design.md`

**Prerequisite:** Engine Phase 1 (`app/src/engine/index.ts`) + Phase 0 (Supabase, auth, `app/src/lib/supabase.ts`) đã xong & merged. Mọi lệnh chạy trong `app/`.

---

## File Structure

```
app/src/
  budget/
    format.ts             ← VND format/parse (Task 1)
    planFilters.ts        ← filter id → predicate + label (Task 3)
    barFill.ts            ← tính % fill + màu cho AvailableBar (Task 4)
    useBudget.tsx         ← BudgetProvider + useBudget: fetch+compute+mutations (Task 5)
    __tests__/
      format.test.ts
      mappers.test.ts
      planFilters.test.ts
      barFill.test.ts
  lib/
    mappers.ts            ← Supabase rows ↔ engine types, deriveFirstMonth (Task 2)
  plan/
    AvailableBar.tsx      ← thanh + số + màu (Task 6)
    CategoryTable.tsx     ← bảng nhóm/row + sửa Assigned inline (Task 7)
    MonthNav.tsx          ← chuyển tháng (Task 8)
    RtaHeader.tsx         ← hiện RTA (Task 8)
    FilterCards.tsx       ← 5 thẻ đếm + toggle (Task 8)
    PlanScreen.tsx        ← ghép tất cả + CRUD group/category (Task 9)
  App.tsx                 ← mount PlanScreen sau khi có budget (Task 9, modify)
```

Chạy 1 file test: `npx vitest run src/budget/__tests__/<file>` ; chạy hết: `npm test` ; type-check: `npx tsc --noEmit`.

---

### Task 1: format.ts — VND format/parse

**Files:**
- Create: `app/src/budget/format.ts`
- Test: `app/src/budget/__tests__/format.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/budget/__tests__/format.test.ts`:

```ts
import { expect, test } from 'vitest';
import { formatVnd, parseVnd, formatMonth } from '../format';

test('formatVnd nhóm hàng nghìn bằng dấu chấm', () => {
  expect(formatVnd(1_120_000)).toBe('1.120.000');
  expect(formatVnd(0)).toBe('0');
  expect(formatVnd(-200_000)).toBe('−200.000'); // dấu trừ U+2212
});

test('formatMonth chuẩn VN: YYYY-MM → MM/YYYY', () => {
  expect(formatMonth('2026-06')).toBe('06/2026');
  expect(formatMonth('2026-12')).toBe('12/2026');
});

test('parseVnd bỏ mọi ký tự không phải số/dấu trừ', () => {
  expect(parseVnd('1.120.000')).toBe(1_120_000);
  expect(parseVnd('400.000₫')).toBe(400_000);
  expect(parseVnd('−200.000')).toBe(-200_000);
  expect(parseVnd('-50000')).toBe(-50_000);
  expect(parseVnd('')).toBe(0);
  expect(parseVnd('abc')).toBe(0);
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/budget/__tests__/format.test.ts` → Expected: "Cannot find module '../format'".

- [ ] **Step 3: Implement** — `app/src/budget/format.ts`:

```ts
/** Định dạng VND nguyên: 1120000 → "1.120.000", số âm dùng dấu trừ U+2212. */
export function formatVnd(n: number): string {
  const neg = n < 0;
  const digits = Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + digits;
}

/** Đọc số nguyên VND từ chuỗi người dùng gõ; bỏ mọi ký tự thừa. Rỗng → 0. */
export function parseVnd(s: string): number {
  const neg = /[-−]/.test(s);
  const digits = s.replace(/[^\d]/g, '');
  if (digits === '') return 0;
  const n = parseInt(digits, 10);
  return neg ? -n : n;
}

/** Hiển thị tháng chuẩn VN: 'YYYY-MM' → 'MM/YYYY'. (Month nội bộ vẫn là 'YYYY-MM'.) */
export function formatMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${mo}/${y}`;
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/format.ts app/src/budget/__tests__/format.test.ts
git commit -m "feat(plan): add VND format/parse helpers"
```

---

### Task 2: mappers.ts — Supabase rows ↔ engine types

**Files:**
- Create: `app/src/lib/mappers.ts`
- Test: `app/src/budget/__tests__/mappers.test.ts`

Schema cột (snake_case) theo `supabase/migrations/0001_schema.sql`. Kiểu engine theo `app/src/engine/types.ts`.

- [ ] **Step 1: Viết test fail** — `app/src/budget/__tests__/mappers.test.ts`:

```ts
import { expect, test } from 'vitest';
import { toBudgetInput, deriveFirstMonth } from '../../lib/mappers';
import type { RawBudgetData } from '../../lib/mappers';

const raw: RawBudgetData = {
  categories: [
    { id: 'c-rta', group_id: 'g-sys', name: 'Inflow: Ready to Assign', kind: 'other', is_system: true },
    { id: 'c-food', group_id: 'g1', name: 'Ăn uống', kind: 'need', is_system: false },
  ],
  targets: [
    { category_id: 'c-food', strategy: 'refill', amount: 600000, cadence: 'monthly',
      due_day: null, due_weekday: null, due_date: null },
  ],
  snoozes: [{ category_id: 'c-food', month: '2026-06' }],
  assignments: [{ category_id: 'c-food', month: '2026-05', assigned: 500000 }],
  transactions: [
    { id: 't1', account_id: 'a1', date: '2026-05-10', category_id: 'c-food', amount: -150000, status: 'cleared' },
    { id: 't2', account_id: 'a1', date: '2026-06-01', category_id: 'c-rta', amount: 1320000, status: 'cleared' },
  ],
};

test('toBudgetInput chuyển snake_case → kiểu engine', () => {
  const input = toBudgetInput(raw, '2026-05');
  expect(input.categories[1]).toEqual({ id: 'c-food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false });
  expect(input.targets[0]).toEqual({ categoryId: 'c-food', strategy: 'refill', amount: 600000, cadence: 'monthly', dueDay: null, dueWeekday: null, dueDate: null });
  expect(input.snoozes[0]).toEqual({ categoryId: 'c-food', month: '2026-06' });
  expect(input.assignments[0]).toEqual({ categoryId: 'c-food', month: '2026-05', assigned: 500000 });
  expect(input.transactions[0]).toEqual({ id: 't1', accountId: 'a1', date: '2026-05-10', categoryId: 'c-food', amount: -150000, status: 'cleared' });
  expect(input.firstMonth).toBe('2026-05');
});

test('deriveFirstMonth = tháng nhỏ nhất giữa transactions & assignments', () => {
  expect(deriveFirstMonth(raw)).toBe('2026-05'); // tx 2026-05 sớm hơn assignment 2026-05
});

test('deriveFirstMonth rỗng → fallback tháng truyền vào', () => {
  expect(deriveFirstMonth({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] }, '2026-09')).toBe('2026-09');
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/budget/__tests__/mappers.test.ts` → Expected: "Cannot find module".

- [ ] **Step 3: Implement** — `app/src/lib/mappers.ts`:

```ts
import { monthOf } from '../engine';
import type {
  BudgetInput, Category, Assignment, Target, Snooze, Transaction, Month,
} from '../engine';

export interface RawCategory { id: string; group_id: string; name: string; kind: Category['kind']; is_system: boolean; }
export interface RawTarget { category_id: string; strategy: Target['strategy']; amount: number; cadence: Target['cadence']; due_day: number | null; due_weekday: number | null; due_date: string | null; }
export interface RawSnooze { category_id: string; month: string; }
export interface RawAssignment { category_id: string; month: string; assigned: number; }
export interface RawTransaction { id: string; account_id: string; date: string; category_id: string | null; amount: number; status: Transaction['status']; }

export interface RawBudgetData {
  categories: RawCategory[];
  targets: RawTarget[];
  snoozes: RawSnooze[];
  assignments: RawAssignment[];
  transactions: RawTransaction[];
}

const mapCategory = (r: RawCategory): Category => ({ id: r.id, groupId: r.group_id, name: r.name, kind: r.kind, isSystem: r.is_system });
const mapTarget = (r: RawTarget): Target => ({ categoryId: r.category_id, strategy: r.strategy, amount: r.amount, cadence: r.cadence, dueDay: r.due_day, dueWeekday: r.due_weekday, dueDate: r.due_date });
const mapSnooze = (r: RawSnooze): Snooze => ({ categoryId: r.category_id, month: r.month });
const mapAssignment = (r: RawAssignment): Assignment => ({ categoryId: r.category_id, month: r.month, assigned: r.assigned });
const mapTransaction = (r: RawTransaction): Transaction => ({ id: r.id, accountId: r.account_id, date: r.date, categoryId: r.category_id, amount: r.amount, status: r.status });

/** Tháng nhỏ nhất xuất hiện trong transactions (theo date) hoặc assignments (theo month). Rỗng → fallback. */
export function deriveFirstMonth(raw: RawBudgetData, fallback: Month = monthOf(new Date().toISOString())): Month {
  const months: Month[] = [
    ...raw.transactions.map((t) => monthOf(t.date)),
    ...raw.assignments.map((a) => a.month),
  ];
  if (months.length === 0) return fallback;
  return months.reduce((min, m) => (m < min ? m : min));
}

export function toBudgetInput(raw: RawBudgetData, firstMonth: Month): BudgetInput {
  return {
    categories: raw.categories.map(mapCategory),
    targets: raw.targets.map(mapTarget),
    snoozes: raw.snoozes.map(mapSnooze),
    assignments: raw.assignments.map(mapAssignment),
    transactions: raw.transactions.map(mapTransaction),
    firstMonth,
  };
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/mappers.ts app/src/budget/__tests__/mappers.test.ts
git commit -m "feat(plan): add Supabase->engine mappers and deriveFirstMonth"
```

---

### Task 3: planFilters.ts — filter id → predicate + label

**Files:**
- Create: `app/src/budget/planFilters.ts`
- Test: `app/src/budget/__tests__/planFilters.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/budget/__tests__/planFilters.test.ts`:

```ts
import { expect, test } from 'vitest';
import { PLAN_FILTERS, filterCounts } from '../planFilters';
import type { PlanRow } from '../../engine';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return { kind: 'need', startBalance: 0, assigned: 0, activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p };
}

const rows: PlanRow[] = [
  row({ categoryId: 'a', available: -50 }),                                   // overspent
  row({ categoryId: 'b', target: { categoryId: 'b', strategy: 'set_aside', amount: 100, cadence: 'monthly' }, needed: 100, assigned: 40, available: 40 }), // underfunded + moneyAvail
  row({ categoryId: 'c', snoozed: true }),                                    // snoozed
];

test('PLAN_FILTERS có đúng 5 thẻ theo thứ tự', () => {
  expect(PLAN_FILTERS.map((f) => f.id)).toEqual(['overspent', 'underfunded', 'overfunded', 'moneyAvailable', 'snoozed']);
});

test('filterCounts đếm đúng số row khớp từng filter', () => {
  expect(filterCounts(rows)).toEqual({ overspent: 1, underfunded: 1, overfunded: 0, moneyAvailable: 1, snoozed: 1 });
});

test('predicate của filter lọc đúng', () => {
  const f = PLAN_FILTERS.find((x) => x.id === 'overspent')!;
  expect(rows.filter(f.predicate).map((r) => r.categoryId)).toEqual(['a']);
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/budget/__tests__/planFilters.test.ts` → Expected: "Cannot find module".

- [ ] **Step 3: Implement** — `app/src/budget/planFilters.ts`:

```ts
import {
  isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed,
} from '../engine';
import type { PlanRow } from '../engine';

export type FilterId = 'overspent' | 'underfunded' | 'overfunded' | 'moneyAvailable' | 'snoozed';

export interface PlanFilter {
  id: FilterId;
  label: string;
  predicate: (r: PlanRow) => boolean;
}

export const PLAN_FILTERS: PlanFilter[] = [
  { id: 'overspent', label: 'Overspent', predicate: isOverspent },
  { id: 'underfunded', label: 'Underfunded', predicate: isUnderfunded },
  { id: 'overfunded', label: 'Overfunded', predicate: isOverfunded },
  { id: 'moneyAvailable', label: 'Money Available', predicate: isMoneyAvailable },
  { id: 'snoozed', label: 'Snoozed', predicate: isSnoozed },
];

export function filterCounts(rows: PlanRow[]): Record<FilterId, number> {
  const out = { overspent: 0, underfunded: 0, overfunded: 0, moneyAvailable: 0, snoozed: 0 } as Record<FilterId, number>;
  for (const f of PLAN_FILTERS) out[f.id] = rows.filter(f.predicate).length;
  return out;
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/planFilters.ts app/src/budget/__tests__/planFilters.test.ts
git commit -m "feat(plan): add plan filter registry and counts"
```

---

### Task 4: barFill.ts — % fill + màu cho AvailableBar

**Files:**
- Create: `app/src/budget/barFill.ts`
- Test: `app/src/budget/__tests__/barFill.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/budget/__tests__/barFill.test.ts`:

```ts
import { expect, test } from 'vitest';
import { barFill } from '../barFill';
import type { PlanRow } from '../../engine';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return { kind: 'need', startBalance: 0, assigned: 0, activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p };
}
const setAside = (amount: number) => ({ categoryId: 'c', strategy: 'set_aside' as const, amount, cadence: 'monthly' as const });

test('overspent: đầy + đỏ', () => {
  expect(barFill(row({ categoryId: 'c', available: -50 }))).toEqual({ pct: 1, color: 'red' });
});

test('có target: pct = available/amount kẹp 0..1, màu theo status', () => {
  expect(barFill(row({ categoryId: 'c', target: setAside(400), needed: 400, assigned: 400, available: 400 }))).toEqual({ pct: 1, color: 'green' });
  expect(barFill(row({ categoryId: 'c', target: setAside(400), needed: 400, assigned: 100, available: 100 }))).toEqual({ pct: 0.25, color: 'yellow' });
});

test('không target, có tiền: đầy + xanh', () => {
  expect(barFill(row({ categoryId: 'c', available: 20 }))).toEqual({ pct: 1, color: 'green' });
});

test('không target, rỗng: trống + xám', () => {
  expect(barFill(row({ categoryId: 'c', available: 0 }))).toEqual({ pct: 0, color: 'gray' });
});

test('snoozed có target: trống + xám', () => {
  expect(barFill(row({ categoryId: 'c', target: setAside(400), snoozed: true, available: 0 }))).toEqual({ pct: 0, color: 'gray' });
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/budget/__tests__/barFill.test.ts` → Expected: "Cannot find module".

- [ ] **Step 3: Implement** — `app/src/budget/barFill.ts`:

```ts
import { categoryStatus } from '../engine';
import type { PlanRow } from '../engine';

export type BarColor = 'red' | 'yellow' | 'green' | 'gray';

export interface BarFill { pct: number; color: BarColor; }

/** Map status engine → màu + độ đầy thanh Available (spec §3). */
export function barFill(row: PlanRow): BarFill {
  const status = categoryStatus(row);
  if (status === 'red') return { pct: 1, color: 'red' };
  if (status === 'gray' || status === 'gray-snoozed') return { pct: 0, color: 'gray' };
  // yellow | green
  const color: BarColor = status;
  if (row.target) {
    const pct = Math.max(0, Math.min(1, row.available / row.target.amount));
    return { pct, color };
  }
  return { pct: 1, color }; // green không target nhưng có tiền
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/barFill.ts app/src/budget/__tests__/barFill.test.ts
git commit -m "feat(plan): add AvailableBar fill/color logic"
```

---

### Task 5: useBudget.tsx — Provider fetch + compute + mutations

**Files:**
- Create: `app/src/budget/useBudget.tsx`

Đây là wiring với Supabase (khó unit-test thuần) → verify bằng `tsc` ở task này, hành vi thật verify ở Task 10 (Playwright).

- [ ] **Step 1: Implement** — `app/src/budget/useBudget.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow } from '../engine';
import { toBudgetInput, deriveFirstMonth } from '../lib/mappers';
import type { RawBudgetData } from '../lib/mappers';

interface BudgetCtx {
  loading: boolean;
  viewMonth: Month;
  setViewMonth: (m: Month) => void;
  rows: PlanRow[];
  rta: number;
  /** danh sách (groupId, groupName) theo sort_order, để render nhóm */
  groups: { id: string; name: string; isSystem: boolean }[];
  categoryName: (id: string) => string;
  groupIdOf: (categoryId: string) => string;
  refetch: () => Promise<void>;
  setAssigned: (categoryId: string, amount: number) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  addCategory: (groupId: string, name: string, kind: string) => Promise<void>;
}

const Ctx = createContext<BudgetCtx | null>(null);

async function fetchRaw(budgetId: string): Promise<{ raw: RawBudgetData; groups: BudgetCtx['groups'] }> {
  const [g, c, t, s, a, tx] = await Promise.all([
    supabase.from('category_groups').select('id,name,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('categories').select('id,group_id,name,kind,is_system,sort_order').eq('budget_id', budgetId).order('sort_order'),
    supabase.from('targets').select('category_id,strategy,amount,cadence,due_day,due_weekday,due_date').eq('budget_id', budgetId),
    supabase.from('target_snoozes').select('category_id,month').eq('budget_id', budgetId),
    supabase.from('assignments').select('category_id,month,assigned').eq('budget_id', budgetId),
    supabase.from('transactions').select('id,account_id,date,category_id,amount,status').eq('budget_id', budgetId),
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
  };
}

export function BudgetProvider({ budgetId, children }: { budgetId: string; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawBudgetData>({ categories: [], targets: [], snoozes: [], assignments: [], transactions: [] });
  const [groups, setGroups] = useState<BudgetCtx['groups']>([]);
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(new Date().toISOString()));

  const refetch = useCallback(async () => {
    const { raw, groups } = await fetchRaw(budgetId);
    setRaw(raw);
    setGroups(groups);
    setLoading(false);
  }, [budgetId]);

  useEffect(() => { refetch(); }, [refetch]);

  const { rows, rta } = useMemo(() => {
    const input = toBudgetInput(raw, deriveFirstMonth(raw, viewMonth));
    const summaries = computeThrough(input, viewMonth);
    return { rows: buildPlanRows(input, summaries, viewMonth), rta: summaries.get(viewMonth)?.rta ?? 0 };
  }, [raw, viewMonth]);

  const nameById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.name])), [raw]);
  const groupById = useMemo(() => new Map(raw.categories.map((c) => [c.id, c.group_id])), [raw]);

  const setAssigned = useCallback(async (categoryId: string, amount: number) => {
    await supabase.from('assignments').upsert(
      { budget_id: budgetId, category_id: categoryId, month: viewMonth, assigned: amount },
      { onConflict: 'category_id,month' },
    );
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

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, groups,
    categoryName: (id) => nameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → Expected: không lỗi (exit 0).

- [ ] **Step 3: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(plan): add useBudget provider (fetch, compute, mutations)"
```

---

### Task 6: AvailableBar.tsx

**Files:**
- Create: `app/src/plan/AvailableBar.tsx`

- [ ] **Step 1: Implement** — `app/src/plan/AvailableBar.tsx`:

```tsx
import { barFill } from '../budget/barFill';
import { formatVnd } from '../budget/format';
import type { PlanRow } from '../engine';

const COLOR: Record<string, string> = { red: '#d23b3b', yellow: '#caa007', green: '#1f9d55', gray: '#9aa0a6' };

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  const hex = COLOR[color];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
      <span style={{ width: 84, height: 8, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct * 100}%`, background: hex }} />
      </span>
      <span style={{ minWidth: 80, textAlign: 'right', fontWeight: 600, color: hex }}>
        {formatVnd(row.available)}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/AvailableBar.tsx
git commit -m "feat(plan): add AvailableBar component"
```

---

### Task 7: CategoryTable.tsx — bảng nhóm/row + sửa Assigned inline

**Files:**
- Create: `app/src/plan/CategoryTable.tsx`

- [ ] **Step 1: Implement** — `app/src/plan/CategoryTable.tsx`:

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <input
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ width: 90, textAlign: 'right' }}
      />
    );
  }
  return (
    <span
      onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      style={{ color: '#2b6cb0', borderBottom: '1px dashed #b9c9da', cursor: 'text' }}
    >
      {formatVnd(row.assigned)}
    </span>
  );
}

export function CategoryTable({ visibleRows }: { visibleRows: PlanRow[] }) {
  const { groups, groupIdOf, categoryName } = useBudget();
  const byGroup = new Map<string, PlanRow[]>();
  for (const r of visibleRows) {
    const g = groupIdOf(r.categoryId);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(r);
  }

  const cell: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' };
  const head: React.CSSProperties = { padding: '8px 12px', fontSize: 11, color: '#888', textAlign: 'right', borderBottom: '1px solid #eee' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10 }}>
      <thead>
        <tr>
          <th style={{ ...head, textAlign: 'left' }}>Category</th>
          <th style={head}>Assigned</th><th style={head}>Activity</th><th style={head}>Available</th>
        </tr>
      </thead>
      <tbody>
        {groups.filter((g) => !g.isSystem).map((g) => {
          const rows = byGroup.get(g.id) ?? [];
          if (rows.length === 0) return null;
          return (
            <tr key={g.id}><td colSpan={4} style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td colSpan={4} style={{ background: '#f4f4f6', fontWeight: 600, color: '#444', padding: '7px 12px' }}>{g.name}</td></tr>
                  {rows.map((r) => (
                    <tr key={r.categoryId}>
                      <td style={{ ...cell, textAlign: 'left' }}>{categoryName(r.categoryId)}</td>
                      <td style={cell}><AssignedCell row={r} /></td>
                      <td style={cell}>{formatVnd(r.activity)}</td>
                      <td style={cell}><AvailableBar row={r} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td></tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/CategoryTable.tsx
git commit -m "feat(plan): add CategoryTable with inline Assigned edit"
```

---

### Task 8: MonthNav + RtaHeader + FilterCards

**Files:**
- Create: `app/src/plan/MonthNav.tsx`, `app/src/plan/RtaHeader.tsx`, `app/src/plan/FilterCards.tsx`

- [ ] **Step 1: Implement MonthNav** — `app/src/plan/MonthNav.tsx`:

```tsx
import { useBudget } from '../budget/useBudget';
import { nextMonth, prevMonth } from '../engine';
import { formatMonth } from '../budget/format';

export function MonthNav() {
  const { viewMonth, setViewMonth } = useBudget();
  return (
    <span style={{ fontWeight: 600, color: '#333' }}>
      <button onClick={() => setViewMonth(prevMonth(viewMonth))}>◀</button>
      {' '}Tháng {formatMonth(viewMonth)}{' '}
      <button onClick={() => setViewMonth(nextMonth(viewMonth))}>▶</button>
    </span>
  );
}
```

- [ ] **Step 2: Implement RtaHeader** — `app/src/plan/RtaHeader.tsx`:

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';

export function RtaHeader() {
  const { rta } = useBudget();
  const bg = rta < 0 ? '#d23b3b' : rta === 0 ? '#9aa0a6' : '#1f9d55';
  return (
    <span style={{ background: bg, color: '#fff', padding: '8px 14px', borderRadius: 999, fontWeight: 600 }}>
      Ready to Assign: {formatVnd(rta)}₫
    </span>
  );
}
```

- [ ] **Step 3: Implement FilterCards** — `app/src/plan/FilterCards.tsx`:

```tsx
import { useBudget } from '../budget/useBudget';
import { PLAN_FILTERS, filterCounts } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';

export function FilterCards({ active, onToggle }: { active: FilterId | null; onToggle: (id: FilterId) => void }) {
  const { rows } = useBudget();
  const counts = filterCounts(rows);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {PLAN_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onToggle(f.id)}
          style={{
            background: '#fff', borderRadius: 8, padding: '7px 11px', minWidth: 92, cursor: 'pointer',
            border: active === f.id ? '1px solid #2b6cb0' : '1px solid #e3e3e6',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>{counts[f.id]}</div>
          <div style={{ fontSize: 11, color: '#777' }}>{f.label}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — Run: `npx tsc --noEmit` → Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/src/plan/MonthNav.tsx app/src/plan/RtaHeader.tsx app/src/plan/FilterCards.tsx
git commit -m "feat(plan): add MonthNav, RtaHeader, FilterCards"
```

---

### Task 9: PlanScreen + CRUD group/category + mount vào App

**Files:**
- Create: `app/src/plan/PlanScreen.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Implement PlanScreen** — `app/src/plan/PlanScreen.tsx`:

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { MonthNav } from './MonthNav';
import { RtaHeader } from './RtaHeader';
import { FilterCards } from './FilterCards';
import { CategoryTable } from './CategoryTable';
import { PLAN_FILTERS } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';

export function PlanScreen() {
  const { loading, rows, groups, addGroup, addCategory } = useBudget();
  const [active, setActive] = useState<FilterId | null>(null);

  if (loading) return <p style={{ fontFamily: 'sans-serif', margin: 40 }}>Đang tải ngân sách…</p>;

  const predicate = active ? PLAN_FILTERS.find((f) => f.id === active)!.predicate : () => true;
  const visibleRows = rows.filter(predicate);
  const userGroups = groups.filter((g) => !g.isSystem);

  async function onAddGroup() {
    const name = window.prompt('Tên nhóm mới:');
    if (name) await addGroup(name);
  }
  async function onAddCategory() {
    if (userGroups.length === 0) { window.alert('Tạo nhóm trước đã.'); return; }
    const name = window.prompt('Tên category mới:');
    if (!name) return;
    await addCategory(userGroups[0].id, name, 'need');
  }

  return (
    <div style={{ maxWidth: 820, margin: '24px auto', fontFamily: 'sans-serif', padding: '0 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <MonthNav />
        <RtaHeader />
      </div>
      <div style={{ marginBottom: 12 }}>
        <FilterCards active={active} onToggle={(id) => setActive(active === id ? null : id)} />
      </div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button onClick={onAddGroup}>＋ Nhóm</button>
        <button onClick={onAddCategory}>＋ Category</button>
      </div>
      <CategoryTable visibleRows={visibleRows} />
    </div>
  );
}
```

- [ ] **Step 2: Mount vào App** — sửa `app/src/App.tsx`: thay dòng cuối `return <BudgetHome budget={budget} />;` để render PlanScreen trong Provider. Thêm import ở đầu file và đổi nhánh cuối:

```tsx
// thêm vào nhóm import ở đầu App.tsx:
import { BudgetProvider } from './budget/useBudget';
import { PlanScreen } from './plan/PlanScreen';
```

```tsx
// thay dòng: return <BudgetHome budget={budget} />;
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <div style={{ textAlign: 'right', maxWidth: 820, margin: '8px auto 0', fontFamily: 'sans-serif' }}>
        <span style={{ color: '#777', fontSize: 13, marginRight: 8 }}>{budget.budget_name}</span>
        <button onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
      </div>
      <PlanScreen />
    </BudgetProvider>
  );
```

**Bắt buộc:** xóa dòng `import { BudgetHome } from './pages/BudgetHome';` trong App.tsx — sau thay đổi nó không còn dùng, mà tsconfig Vite bật `noUnusedLocals` nên để lại sẽ làm `tsc` fail. `supabase`, `SetupPage`, `AuthPage` vẫn dùng nên giữ nguyên.

- [ ] **Step 3: Verify** — Run: `npx tsc --noEmit` → Expected: exit 0. Run `npm test` → Expected: toàn bộ unit test PASS (engine 69 + format/mappers/planFilters/barFill mới).

- [ ] **Step 4: Commit**

```bash
git add app/src/plan/PlanScreen.tsx app/src/App.tsx
git commit -m "feat(plan): assemble PlanScreen with group/category CRUD and mount in App"
```

---

### Task 10: End-to-end verify (Playwright) + chốt

**Files:** không tạo file; verify hành vi thật trên dev server + Supabase.

- [ ] **Step 1: Chạy dev server** — `npm run dev` (background). Mở `http://localhost:5173`, đăng nhập user đã tạo ở Phase 0 (vd `wnap.husband@gmail.com` / `matkhau123`) → thấy PlanScreen (bảng rỗng, RTA 0).

- [ ] **Step 2: Kịch bản verify** (qua UI thật):
  1. Bấm **＋ Nhóm** → "Hóa đơn cố định" → nhóm hiện ra (khi đã có category).
  2. Bấm **＋ Category** → "Điện" → row "Điện" hiện trong bảng, Available xám 0.
  3. Click số **Assigned** của Điện → gõ `400000` → Enter → Available chuyển **xanh** `400.000`, thanh đầy. (RTA âm vì chưa có inflow — chấp nhận ở v1, sẽ đủ khi có Ledger.)
  4. Bấm filter **Money Available** → bảng chỉ còn category có available > 0; bấm lại để tắt.
  5. Chuyển **▶ sang tháng sau** → available 400.000 carry sang (rollover), Assigned về 0.

- [ ] **Step 3: Kiểm tra không lỗi console** — không có error đỏ (trừ 400 auth lúc đăng nhập nếu có). Engine số khớp kỳ vọng rollover.

- [ ] **Step 4: Dừng dev server.**

- [ ] **Step 5: Commit (nếu có chỉnh trong lúc verify; nếu không, bỏ qua).**

---

## Phase 2A hoàn thành khi

- [ ] `npm test` PASS 100% (engine 69 + 4 module data mới), `npx tsc --noEmit` exit 0.
- [ ] PlanScreen load dữ liệu Supabase thật, hiển thị nhóm/category, Available đúng màu/thanh.
- [ ] Tạo được group + category; sửa Assigned inline ghi xuống `assignments` và recompute đúng.
- [ ] Filter cards lọc đúng; chuyển tháng rollover đúng.
- [ ] (Để Plan 2B) Assign popover/Auto, Move Money, Target editor, Snooze.
```
