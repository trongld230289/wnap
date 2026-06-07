# WNAP Phase 1: Math Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Module `budget-engine` thuần TypeScript tính đúng toàn bộ math của WNAP: rollover, RTA, targets, status màu, filters, auto-assign — pass đầy đủ test, chưa cần UI.

**Architecture:** Pure functions trong `app/src/engine/`, KHÔNG import React/Supabase. Mọi số liệu dẫn xuất tính từ dữ liệu gốc (transactions, assignments, targets) bằng cách duyệt tuần tự từng tháng từ `firstMonth`. TDD nghiêm ngặt: viết test fail trước, implement sau.

**Tech Stack:** TypeScript, Vitest. Tiền: số nguyên VND. Tháng: chuỗi `'YYYY-MM'`, ngày: `'YYYY-MM-DD'` — so sánh chuỗi, không timezone math (spec §6).

**Spec:** `docs/superpowers/specs/2026-06-07-wnap-design.md` §4 (công thức), §6 (edge cases), §7 (test case nguồn).

**Prerequisite:** Task 1 của Phase 0 (app scaffold + Vitest) đã xong. Không cần Supabase.

---

## File Structure

```
app/src/engine/
  dates.ts        ← month helpers (Task 1)
  types.ts        ← toàn bộ types (Task 2)
  compute.ts      ← computeThrough: rollover + RTA (Task 2, 3)
  targets.ts      ← needed() + toGo() (Task 4)
  rows.ts         ← buildPlanRows: ráp dữ liệu thành PlanRow (Task 5)
  status.ts       ← categoryStatus màu (Task 5)
  filters.ts      ← 5 filter predicates (Task 6)
  autoAssign.ts   ← 7 nút auto-assign (Task 7, 8)
  index.ts        ← public API (Task 9)
  __tests__/
    dates.test.ts
    compute.test.ts
    targets.test.ts
    rows-status.test.ts
    filters.test.ts
    autoAssign.test.ts
    underfunded.test.ts
    scenario.test.ts
```

Mọi lệnh chạy trong thư mục `app/`. Chạy 1 file test: `npx vitest run src/engine/__tests__/<file>` ; chạy hết: `npm test`.

---

### Task 1: Date/Month helpers

**Files:**
- Create: `app/src/engine/dates.ts`
- Test: `app/src/engine/__tests__/dates.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/dates.test.ts`:

```ts
import { expect, test } from 'vitest';
import {
  monthOf, nextMonth, prevMonth, monthRange,
  monthsRemaining, daysInMonth, weekdayCountInMonth,
} from '../dates';

test('monthOf lấy YYYY-MM từ date', () => {
  expect(monthOf('2026-06-07')).toBe('2026-06');
});

test('nextMonth giữa năm', () => expect(nextMonth('2026-06')).toBe('2026-07'));
test('nextMonth qua năm', () => expect(nextMonth('2026-12')).toBe('2027-01'));
test('prevMonth giữa năm', () => expect(prevMonth('2026-06')).toBe('2026-05'));
test('prevMonth lùi năm', () => expect(prevMonth('2026-01')).toBe('2025-12'));

test('monthRange bao gồm 2 đầu', () => {
  expect(monthRange('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01']);
});

test('monthsRemaining tính cả tháng hiện tại', () => {
  expect(monthsRemaining('2026-06', '2026-12')).toBe(7);
  expect(monthsRemaining('2026-12', '2026-12')).toBe(1);
});
test('monthsRemaining quá hạn → clamp 1', () => {
  expect(monthsRemaining('2027-02', '2026-12')).toBe(1);
});

test('daysInMonth năm nhuận', () => {
  expect(daysInMonth('2028-02')).toBe(29);
  expect(daysInMonth('2026-02')).toBe(28);
});

test('weekdayCountInMonth: 6/2026 có 5 thứ Hai, 4 Chủ nhật', () => {
  expect(weekdayCountInMonth('2026-06', 1)).toBe(5); // Mon: 1,8,15,22,29
  expect(weekdayCountInMonth('2026-06', 0)).toBe(4); // Sun: 7,14,21,28
});
```

- [ ] **Step 2: Chạy test, verify FAIL**

Run: `npx vitest run src/engine/__tests__/dates.test.ts`
Expected: FAIL — "Cannot find module '../dates'"

- [ ] **Step 3: Implement `app/src/engine/dates.ts`:**

```ts
export type Month = string; // 'YYYY-MM'

export function monthOf(date: string): Month {
  return date.slice(0, 7);
}

export function nextMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}

export function prevMonth(m: Month): Month {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
}

export function monthRange(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

/** Số tháng từ current đến deadline, TÍNH CẢ tháng hiện tại. Quá hạn → 1. */
export function monthsRemaining(current: Month, deadline: Month): number {
  const [cy, cm] = current.split('-').map(Number);
  const [dy, dm] = deadline.split('-').map(Number);
  return Math.max(1, (dy - cy) * 12 + (dm - cm) + 1);
}

export function daysInMonth(m: Month): number {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

/** Đếm số lần weekday (0=CN..6=T7) xuất hiện trong tháng. */
export function weekdayCountInMonth(m: Month, weekday: number): number {
  const [y, mo] = m.split('-').map(Number);
  let count = 0;
  for (let d = 1; d <= daysInMonth(m); d++) {
    if (new Date(y, mo - 1, d).getDay() === weekday) count++;
  }
  return count;
}
```

- [ ] **Step 4: Verify PASS** — Run lại lệnh Step 2. Expected: tất cả PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add date/month helpers"
```

---

### Task 2: Types + computeThrough cơ bản (1 tháng)

**Files:**
- Create: `app/src/engine/types.ts`, `app/src/engine/compute.ts`
- Test: `app/src/engine/__tests__/compute.test.ts`

- [ ] **Step 1: Tạo `app/src/engine/types.ts`** (types dùng chung cho mọi task sau):

```ts
import type { Month } from './dates';
export type { Month };

export type CategoryKind = 'bill' | 'need' | 'saving' | 'other';
export type TargetStrategy = 'set_aside' | 'refill' | 'have_balance';
export type TargetCadence = 'weekly' | 'monthly' | 'yearly' | 'custom';
export type TxStatus = 'uncleared' | 'cleared' | 'reconciled';

export interface Category {
  id: string;
  groupId: string;
  name: string;
  kind: CategoryKind;
  isSystem: boolean; // true = "Inflow: Ready to Assign"
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // 'YYYY-MM-DD'
  categoryId: string | null;
  amount: number; // VND nguyên; âm = outflow, dương = inflow
  status: TxStatus;
}

export interface Assignment {
  categoryId: string;
  month: Month;
  assigned: number;
}

export interface Target {
  categoryId: string;
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay?: number | null;     // 1–31; null = cuối tháng
  dueWeekday?: number | null; // 0–6, cho weekly
  dueDate?: string | null;    // 'YYYY-MM-DD', bắt buộc cho have_balance/yearly/custom
}

export interface Snooze {
  categoryId: string;
  month: Month;
}

export interface BudgetInput {
  categories: Category[];
  transactions: Transaction[];
  assignments: Assignment[];
  targets: Target[];
  snoozes: Snooze[];
  firstMonth: Month;
}

export interface CategoryMonth {
  categoryId: string;
  startBalance: number; // max(available tháng trước, 0)
  assigned: number;
  activity: number;
  available: number;
}

export interface MonthSummary {
  month: Month;
  rta: number;
  categories: Map<string, CategoryMonth>;
}

/** Dữ liệu 1 dòng Plan screen — đầu vào cho status/filters/auto-assign */
export interface PlanRow {
  categoryId: string;
  kind: CategoryKind;
  startBalance: number;
  assigned: number;
  activity: number;
  available: number;
  target: Target | null;
  needed: number; // 0 nếu không có target hoặc snoozed
  snoozed: boolean;
}

export interface Proposal {
  categoryId: string;
  newAssigned: number; // giá trị Assigned mới (tuyệt đối, không phải delta)
}
```

- [ ] **Step 2: Viết test fail** — `app/src/engine/__tests__/compute.test.ts`:

```ts
import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import type { BudgetInput, Transaction } from '../types';

const CATS = [
  { id: 'rta', groupId: 'g0', name: 'Inflow: Ready to Assign', kind: 'other', isSystem: true },
  { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
  { id: 'rent', groupId: 'g1', name: 'Tiền nhà', kind: 'bill', isSystem: false },
] as const;

let n = 0;
function tx(p: Partial<Transaction> & { amount: number }): Transaction {
  return { id: `t${++n}`, accountId: 'a1', date: '2026-01-10', categoryId: null, status: 'cleared', ...p };
}

function input(p: Partial<BudgetInput> = {}): BudgetInput {
  return {
    categories: [...CATS], transactions: [], assignments: [],
    targets: [], snoozes: [], firstMonth: '2026-01', ...p,
  };
}

test('inflow vào system category làm tăng RTA', () => {
  const out = computeThrough(
    input({ transactions: [tx({ categoryId: 'rta', amount: 10_000_000 })] }),
    '2026-01',
  );
  expect(out.get('2026-01')!.rta).toBe(10_000_000);
});

test('assign chuyển tiền RTA → category', () => {
  const out = computeThrough(
    input({
      transactions: [tx({ categoryId: 'rta', amount: 10_000_000 })],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 3_000_000 }],
    }),
    '2026-01',
  );
  const jan = out.get('2026-01')!;
  expect(jan.rta).toBe(7_000_000);
  expect(jan.categories.get('food')!.available).toBe(3_000_000);
});

test('chi tiêu giảm available, không ảnh hưởng RTA', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000 }),
        tx({ categoryId: 'food', amount: -1_200_000 }),
      ],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 3_000_000 }],
    }),
    '2026-01',
  );
  const jan = out.get('2026-01')!;
  expect(jan.categories.get('food')!.activity).toBe(-1_200_000);
  expect(jan.categories.get('food')!.available).toBe(1_800_000);
  expect(jan.rta).toBe(7_000_000);
});

test('transaction không category (chưa categorize) bị bỏ qua trong budget math', () => {
  const out = computeThrough(
    input({ transactions: [tx({ categoryId: null, amount: -500_000 })] }),
    '2026-01',
  );
  expect(out.get('2026-01')!.rta).toBe(0);
});
```

- [ ] **Step 3: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/compute.test.ts`
Expected: FAIL — "Cannot find module '../compute'"

- [ ] **Step 4: Implement `app/src/engine/compute.ts`:**

```ts
import { monthOf, monthRange } from './dates';
import type { BudgetInput, CategoryMonth, Month, MonthSummary } from './types';

/**
 * Tính tuần tự mọi tháng từ firstMonth đến `through` (spec §4a):
 *   available = max(prevAvailable, 0) + assigned + activity
 *   rta       = prevRta + inflow − totalAssigned + Σ min(prevAvailable, 0)
 */
export function computeThrough(input: BudgetInput, through: Month): Map<Month, MonthSummary> {
  const result = new Map<Month, MonthSummary>();
  const userCats = input.categories.filter((c) => !c.isSystem);
  const systemIds = new Set(input.categories.filter((c) => c.isSystem).map((c) => c.id));

  // Index activity theo (month, category) và inflow theo month
  const activity = new Map<string, number>();
  const inflow = new Map<Month, number>();
  for (const t of input.transactions) {
    if (!t.categoryId) continue;
    const m = monthOf(t.date);
    if (systemIds.has(t.categoryId)) {
      inflow.set(m, (inflow.get(m) ?? 0) + t.amount);
    } else {
      const key = `${m}|${t.categoryId}`;
      activity.set(key, (activity.get(key) ?? 0) + t.amount);
    }
  }
  const assigned = new Map<string, number>();
  for (const a of input.assignments) {
    assigned.set(`${a.month}|${a.categoryId}`, a.assigned);
  }

  let prev: MonthSummary | null = null;
  for (const m of monthRange(input.firstMonth, through)) {
    const cats = new Map<string, CategoryMonth>();
    let totalAssigned = 0;
    let overspentCarry = 0;

    for (const c of userCats) {
      const prevAvail = prev?.categories.get(c.id)?.available ?? 0;
      const startBalance = Math.max(prevAvail, 0);
      const asg = assigned.get(`${m}|${c.id}`) ?? 0;
      const act = activity.get(`${m}|${c.id}`) ?? 0;
      cats.set(c.id, {
        categoryId: c.id, startBalance, assigned: asg, activity: act,
        available: startBalance + asg + act,
      });
      totalAssigned += asg;
      overspentCarry += Math.min(prevAvail, 0);
    }

    const rta = (prev?.rta ?? 0) + (inflow.get(m) ?? 0) - totalAssigned + overspentCarry;
    const summary: MonthSummary = { month: m, rta, categories: cats };
    result.set(m, summary);
    prev = summary;
  }
  return result;
}
```

- [ ] **Step 5: Verify PASS** — chạy lại Step 3. Expected: 4 PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add types and single-month compute (RTA, available)"
```

---

### Task 3: Month Rollover (carry dương, reset âm)

**Files:**
- Modify (chỉ thêm test — implement Task 2 đã cover, test xác nhận): `app/src/engine/__tests__/compute.test.ts`

- [ ] **Step 1: Thêm test vào cuối `compute.test.ts`:**

```ts
test('available dương carry sang tháng sau', () => {
  const out = computeThrough(
    input({
      transactions: [tx({ categoryId: 'rta', amount: 5_000_000 })],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 2_000_000 }],
    }),
    '2026-02',
  );
  const feb = out.get('2026-02')!.categories.get('food')!;
  expect(feb.startBalance).toBe(2_000_000);
  expect(feb.available).toBe(2_000_000);
  expect(out.get('2026-02')!.rta).toBe(3_000_000); // RTA cũng carry
});

test('available âm reset về 0 và trừ vào RTA tháng sau (chuẩn YNAB)', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000 }),
        tx({ categoryId: 'food', amount: -1_500_000 }), // chi 1.5M, chỉ assign 1M
      ],
      assignments: [{ categoryId: 'food', month: '2026-01', assigned: 1_000_000 }],
    }),
    '2026-02',
  );
  const jan = out.get('2026-01')!;
  expect(jan.categories.get('food')!.available).toBe(-500_000);
  expect(jan.rta).toBe(9_000_000);

  const feb = out.get('2026-02')!;
  expect(feb.categories.get('food')!.available).toBe(0);     // reset
  expect(feb.rta).toBe(8_500_000);                            // 9M − 500k overspent
});

test('chuỗi 3 tháng: rollover cộng dồn đúng', () => {
  const out = computeThrough(
    input({
      transactions: [
        tx({ categoryId: 'rta', amount: 10_000_000, date: '2026-01-05' }),
        tx({ categoryId: 'rta', amount: 10_000_000, date: '2026-02-05' }),
        tx({ categoryId: 'food', amount: -800_000, date: '2026-02-10' }),
      ],
      assignments: [
        { categoryId: 'food', month: '2026-01', assigned: 1_000_000 },
        { categoryId: 'food', month: '2026-02', assigned: 1_000_000 },
      ],
    }),
    '2026-03',
  );
  // Feb: start 1M + assign 1M − 800k = 1.2M
  expect(out.get('2026-02')!.categories.get('food')!.available).toBe(1_200_000);
  // Mar: carry 1.2M
  expect(out.get('2026-03')!.categories.get('food')!.available).toBe(1_200_000);
  // RTA Mar = 10M + 10M − 2M assigned = 18M
  expect(out.get('2026-03')!.rta).toBe(18_000_000);
});
```

- [ ] **Step 2: Chạy verify**

Run: `npx vitest run src/engine/__tests__/compute.test.ts`
Expected: tất cả PASS (logic đã có từ Task 2). Nếu FAIL → sửa `compute.ts` đến khi pass, KHÔNG sửa test.

- [ ] **Step 3: Commit**

```powershell
git add app/src/engine
git commit -m "test(engine): verify month rollover (positive carry, negative resets to RTA)"
```

---

### Task 4: Target Engine — needed() và toGo()

**Files:**
- Create: `app/src/engine/targets.ts`
- Test: `app/src/engine/__tests__/targets.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/targets.test.ts`:

```ts
import { expect, test } from 'vitest';
import { needed, toGo } from '../targets';
import type { Target } from '../types';

function t(p: Partial<Target>): Target {
  return { categoryId: 'c1', strategy: 'set_aside', amount: 100_000, cadence: 'monthly', ...p };
}
const ctx = (p: Partial<{ month: string; availableAtMonthStart: number; snoozed: boolean }> = {}) =>
  ({ month: '2026-06', availableAtMonthStart: 0, snoozed: false, ...p });

test('set_aside đòi đủ amount bất kể số dư cũ (spec Module C §2)', () => {
  expect(needed(t({ strategy: 'set_aside', amount: 100_000 }),
    ctx({ availableAtMonthStart: 500_000 }))).toBe(100_000);
});

test('refill chỉ đòi phần thiếu so với cap', () => {
  expect(needed(t({ strategy: 'refill', amount: 300_000 }),
    ctx({ availableAtMonthStart: 120_000 }))).toBe(180_000);
});

test('refill đủ rồi thì needed = 0', () => {
  expect(needed(t({ strategy: 'refill', amount: 300_000 }),
    ctx({ availableAtMonthStart: 350_000 }))).toBe(0);
});

test('have_balance chia đều theo số tháng còn lại (Rule 2)', () => {
  // cần 1.2M trước 12/2026, đang 7/2026, chưa có gì → 6 tháng → 200k/tháng
  const target = t({ strategy: 'have_balance', cadence: 'custom', amount: 1_200_000, dueDate: '2026-12-31' });
  expect(needed(target, ctx({ month: '2026-07' }))).toBe(200_000);
});

test('have_balance redistribute khi tháng trước hụt (Rule 2 adaptation)', () => {
  // Tháng 7 chỉ assign 100k → đầu tháng 8 có 100k, còn 5 tháng → (1.2M−100k)/5 = 220k
  const target = t({ strategy: 'have_balance', cadence: 'custom', amount: 1_200_000, dueDate: '2026-12-31' });
  expect(needed(target, ctx({ month: '2026-08', availableAtMonthStart: 100_000 }))).toBe(220_000);
});

test('yearly quy về have_balance theo deadline', () => {
  const target = t({ strategy: 'set_aside', cadence: 'yearly', amount: 6_000_000, dueDate: '2026-12-01' });
  // 6/2026 → 12/2026 = 7 tháng, chưa có gì → ceil(6M/7) = 857.143
  expect(needed(target, ctx({ month: '2026-06' }))).toBe(857_143);
});

test('weekly = amount × số lần weekday trong tháng', () => {
  const target = t({ cadence: 'weekly', amount: 200_000, dueWeekday: 1 });
  expect(needed(target, ctx({ month: '2026-06' }))).toBe(1_000_000); // 5 thứ Hai
});

test('snoozed → needed = 0 (spec Module C §2)', () => {
  expect(needed(t({ strategy: 'set_aside', amount: 100_000 }), ctx({ snoozed: true }))).toBe(0);
});

test('toGo = needed − assigned, không âm', () => {
  const target = t({ strategy: 'set_aside', amount: 100_000 });
  expect(toGo(target, ctx(), 40_000)).toBe(60_000);
  expect(toGo(target, ctx(), 150_000)).toBe(0);
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/targets.test.ts`
Expected: FAIL — "Cannot find module '../targets'"

- [ ] **Step 3: Implement `app/src/engine/targets.ts`:**

```ts
import { monthOf, monthsRemaining, weekdayCountInMonth } from './dates';
import type { Month, Target } from './types';

export interface NeedContext {
  month: Month;
  availableAtMonthStart: number; // = CategoryMonth.startBalance
  snoozed?: boolean;
}

/**
 * "Tháng này cần assign bao nhiêu" theo spec §4b.
 * have_balance / yearly / custom: chia gap đều cho số tháng còn lại → tự
 * redistribute khi tháng trước hụt (Rule 2), vì startBalance tháng sau thấp hơn.
 */
export function needed(target: Target, ctx: NeedContext): number {
  if (ctx.snoozed) return 0;

  if (target.cadence === 'weekly') {
    return target.amount * weekdayCountInMonth(ctx.month, target.dueWeekday ?? 1);
  }

  if (target.strategy === 'have_balance' || target.cadence === 'yearly' || target.cadence === 'custom') {
    const deadline = monthOf(target.dueDate!); // schema bắt buộc dueDate cho nhóm này
    const remaining = monthsRemaining(ctx.month, deadline);
    const gap = Math.max(0, target.amount - ctx.availableAtMonthStart);
    return Math.ceil(gap / remaining);
  }

  if (target.strategy === 'set_aside') return target.amount;

  // refill (monthly): chỉ đòi phần thiếu so với cap
  return Math.max(0, target.amount - ctx.availableAtMonthStart);
}

export function toGo(target: Target, ctx: NeedContext, assignedThisMonth: number): number {
  return Math.max(0, needed(target, ctx) - assignedThisMonth);
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 10 PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add target engine (needed/toGo, all strategies + snooze)"
```

---

### Task 5: PlanRow builder + status màu

**Files:**
- Create: `app/src/engine/rows.ts`, `app/src/engine/status.ts`
- Test: `app/src/engine/__tests__/rows-status.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/rows-status.test.ts`:

```ts
import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import { buildPlanRows } from '../rows';
import { categoryStatus } from '../status';
import type { BudgetInput, PlanRow } from '../types';

function base(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 5_000_000, status: 'cleared' },
    ],
    assignments: [], targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

function rowsFor(input: BudgetInput, month: string): PlanRow[] {
  return buildPlanRows(input, computeThrough(input, month), month);
}

test('buildPlanRows ráp đủ assigned/activity/available/needed', () => {
  const input = base();
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 2_000_000 });
  input.targets.push({ categoryId: 'food', strategy: 'refill', amount: 3_000_000, cadence: 'monthly' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(row.assigned).toBe(2_000_000);
  expect(row.available).toBe(2_000_000);
  expect(row.needed).toBe(3_000_000); // startBalance 0 → cần đủ cap
});

test('red khi available âm (ưu tiên cao nhất)', () => {
  const input = base();
  input.transactions.push({ id: 't2', accountId: 'a1', date: '2026-01-10', categoryId: 'food', amount: -700_000, status: 'cleared' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('red');
});

test('yellow khi có target chưa đạt', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('yellow');
});

test('green khi target đạt đủ', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 1_000_000 });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('green');
});

test('green khi không target nhưng có tiền', () => {
  const input = base();
  input.assignments.push({ categoryId: 'food', month: '2026-01', assigned: 500_000 });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('green');
});

test('gray-snoozed khi target bị snooze tháng này', () => {
  const input = base();
  input.targets.push({ categoryId: 'food', strategy: 'set_aside', amount: 1_000_000, cadence: 'monthly' });
  input.snoozes.push({ categoryId: 'food', month: '2026-01' });
  const [row] = rowsFor(input, '2026-01').filter((r) => r.categoryId === 'food');
  expect(row.needed).toBe(0);
  expect(categoryStatus(row)).toBe('gray-snoozed');
});

test('gray khi zero và không target', () => {
  const [row] = rowsFor(base(), '2026-01').filter((r) => r.categoryId === 'food');
  expect(categoryStatus(row)).toBe('gray');
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/rows-status.test.ts`
Expected: FAIL — "Cannot find module '../rows'"

- [ ] **Step 3: Implement `app/src/engine/rows.ts`:**

```ts
import { needed } from './targets';
import type { BudgetInput, Month, MonthSummary, PlanRow } from './types';

export function buildPlanRows(
  input: BudgetInput,
  summaries: Map<Month, MonthSummary>,
  month: Month,
): PlanRow[] {
  const summary = summaries.get(month);
  if (!summary) throw new Error(`month ${month} not computed`);
  const snoozedSet = new Set(
    input.snoozes.filter((s) => s.month === month).map((s) => s.categoryId),
  );
  const targetByCat = new Map(input.targets.map((t) => [t.categoryId, t]));

  return input.categories
    .filter((c) => !c.isSystem)
    .map((c) => {
      const cm = summary.categories.get(c.id)!;
      const target = targetByCat.get(c.id) ?? null;
      const snoozed = snoozedSet.has(c.id);
      const nd = target
        ? needed(target, { month, availableAtMonthStart: cm.startBalance, snoozed })
        : 0;
      return {
        categoryId: c.id, kind: c.kind,
        startBalance: cm.startBalance, assigned: cm.assigned,
        activity: cm.activity, available: cm.available,
        target, needed: nd, snoozed,
      };
    });
}
```

- [ ] **Step 4: Implement `app/src/engine/status.ts`** (thứ tự ưu tiên spec §4c):

```ts
import type { PlanRow } from './types';

export type CategoryStatus = 'red' | 'yellow' | 'green' | 'gray-snoozed' | 'gray';

export function categoryStatus(r: PlanRow): CategoryStatus {
  if (r.available < 0) return 'red';
  if (r.snoozed && r.target) return 'gray-snoozed';
  if (r.target && r.needed - r.assigned > 0) return 'yellow';
  if (r.target || r.available > 0) return 'green';
  return 'gray';
}
```

- [ ] **Step 5: Verify PASS** — chạy lại Step 2. Expected: 7 PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add plan row builder and status colors"
```

---

### Task 6: 5 Filter Cards

**Files:**
- Create: `app/src/engine/filters.ts`
- Test: `app/src/engine/__tests__/filters.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/filters.test.ts`:

```ts
import { expect, test } from 'vitest';
import { isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed } from '../filters';
import type { PlanRow, Target } from '../types';

function row(p: Partial<PlanRow>): PlanRow {
  return {
    categoryId: 'c1', kind: 'need', startBalance: 0, assigned: 0,
    activity: 0, available: 0, target: null, needed: 0, snoozed: false, ...p,
  };
}
const refill = (amount: number): Target =>
  ({ categoryId: 'c1', strategy: 'refill', amount, cadence: 'monthly' });
const setAside = (amount: number): Target =>
  ({ categoryId: 'c1', strategy: 'set_aside', amount, cadence: 'monthly' });

test('overspent: available âm', () => {
  expect(isOverspent(row({ available: -50_000 }))).toBe(true);
  expect(isOverspent(row({ available: 0 }))).toBe(false);
});

test('underfunded: có target, chưa snooze, còn thiếu', () => {
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 40_000 }))).toBe(true);
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 100_000 }))).toBe(false);
  expect(isUnderfunded(row({ target: setAside(100_000), needed: 0, snoozed: true }))).toBe(false);
  expect(isUnderfunded(row({}))).toBe(false); // không target
});

test('overfunded refill: available vượt cap', () => {
  expect(isOverfunded(row({ target: refill(300_000), available: 400_000 }))).toBe(true);
  expect(isOverfunded(row({ target: refill(300_000), available: 300_000 }))).toBe(false);
});

test('overfunded set_aside: assigned vượt needed tháng này', () => {
  expect(isOverfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 150_000 }))).toBe(true);
  expect(isOverfunded(row({ target: setAside(100_000), needed: 100_000, assigned: 100_000 }))).toBe(false);
});

test('moneyAvailable: available dương', () => {
  expect(isMoneyAvailable(row({ available: 20_000 }))).toBe(true);
  expect(isMoneyAvailable(row({ available: 0 }))).toBe(false);
});

test('snoozed', () => {
  expect(isSnoozed(row({ snoozed: true }))).toBe(true);
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/filters.test.ts`
Expected: FAIL — "Cannot find module '../filters'"

- [ ] **Step 3: Implement `app/src/engine/filters.ts`** (spec §4e):

```ts
import type { PlanRow } from './types';

export const isOverspent = (r: PlanRow): boolean => r.available < 0;

export const isUnderfunded = (r: PlanRow): boolean =>
  !!r.target && !r.snoozed && r.needed - r.assigned > 0;

/** refill/have_balance: tiền vượt cap; set_aside: assign vượt yêu cầu tháng này */
export const isOverfunded = (r: PlanRow): boolean =>
  !!r.target &&
  (r.target.strategy === 'set_aside'
    ? r.assigned > r.needed
    : r.available > r.target.amount);

export const isMoneyAvailable = (r: PlanRow): boolean => r.available > 0;

export const isSnoozed = (r: PlanRow): boolean => r.snoozed;
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 6 PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add 5 filter card predicates"
```

---

### Task 7: Auto-Assign — các nút lịch sử + reset

**Files:**
- Create: `app/src/engine/autoAssign.ts`
- Test: `app/src/engine/__tests__/autoAssign.test.ts`

Mọi nút trả về `Proposal[]` (`newAssigned` tuyệt đối) để UI preview trước khi commit (spec §4d).

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/autoAssign.test.ts`:

```ts
import { expect, test } from 'vitest';
import { computeThrough } from '../compute';
import { buildPlanRows } from '../rows';
import {
  proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent,
  proposeResetAssigned, proposeResetAvailable,
} from '../autoAssign';
import type { BudgetInput } from '../types';

function makeInput(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 20_000_000, status: 'cleared' },
      { id: 't2', accountId: 'a1', date: '2026-01-15', categoryId: 'food', amount: -1_800_000, status: 'cleared' },
      { id: 't3', accountId: 'a1', date: '2026-02-12', categoryId: 'food', amount: -2_200_000, status: 'cleared' },
    ],
    assignments: [
      { categoryId: 'food', month: '2026-01', assigned: 2_000_000 },
      { categoryId: 'food', month: '2026-02', assigned: 3_000_000 },
    ],
    targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

const setup = (month: string) => {
  const input = makeInput();
  const summaries = computeThrough(input, month);
  return { input, summaries, rows: buildPlanRows(input, summaries, month) };
};

test('assignedLastMonth copy đúng số tháng trước', () => {
  const { summaries, rows } = setup('2026-03');
  expect(proposeAssignedLastMonth(rows, summaries, '2026-03'))
    .toEqual([{ categoryId: 'food', newAssigned: 3_000_000 }]);
});

test('spentLastMonth = chi tiêu thực tháng trước', () => {
  const { summaries, rows } = setup('2026-03');
  expect(proposeSpentLastMonth(rows, summaries, '2026-03'))
    .toEqual([{ categoryId: 'food', newAssigned: 2_200_000 }]);
});

test('averageAssigned = trung bình 12 tháng gần nhất (làm tròn)', () => {
  const { input, summaries, rows } = setup('2026-03');
  // (2M + 3M) / 2 = 2.5M
  expect(proposeAverageAssigned(rows, summaries, '2026-03', input.firstMonth))
    .toEqual([{ categoryId: 'food', newAssigned: 2_500_000 }]);
});

test('averageSpent = trung bình chi tiêu', () => {
  const { input, summaries, rows } = setup('2026-03');
  // (1.8M + 2.2M) / 2 = 2M
  expect(proposeAverageSpent(rows, summaries, '2026-03', input.firstMonth))
    .toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});

test('tháng đầu tiên không có lịch sử → đề xuất rỗng', () => {
  const { input, summaries, rows } = setup('2026-01');
  expect(proposeAssignedLastMonth(rows, summaries, '2026-01')).toEqual([]);
  expect(proposeAverageAssigned(rows, summaries, '2026-01', input.firstMonth)).toEqual([]);
});

test('resetAssigned đưa assigned về 0', () => {
  const { rows } = setup('2026-02');
  expect(proposeResetAssigned(rows)).toEqual([{ categoryId: 'food', newAssigned: 0 }]);
});

test('resetAvailable rút available dương về RTA', () => {
  const { rows } = setup('2026-02');
  // Feb: start 200k + assign 3M − 2.2M = available 1M → newAssigned = 3M − 1M = 2M
  expect(proposeResetAvailable(rows)).toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/autoAssign.test.ts`
Expected: FAIL — "Cannot find module '../autoAssign'"

- [ ] **Step 3: Implement `app/src/engine/autoAssign.ts`:**

```ts
import { prevMonth } from './dates';
import type { Month, MonthSummary, PlanRow, Proposal } from './types';

/** Các tháng lịch sử N−1 … N−limit, không lùi quá firstMonth. */
function historyMonths(month: Month, firstMonth: Month, limit = 12): Month[] {
  const out: Month[] = [];
  let m = prevMonth(month);
  while (out.length < limit && m >= firstMonth) {
    out.push(m);
    m = prevMonth(m);
  }
  return out;
}

export function proposeAssignedLastMonth(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
): Proposal[] {
  const prev = summaries.get(prevMonth(month));
  if (!prev) return [];
  return rows
    .map((r) => ({ categoryId: r.categoryId, newAssigned: prev.categories.get(r.categoryId)?.assigned ?? 0 }))
    .filter((p) => p.newAssigned !== rows.find((r) => r.categoryId === p.categoryId)!.assigned);
}

export function proposeSpentLastMonth(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
): Proposal[] {
  const prev = summaries.get(prevMonth(month));
  if (!prev) return [];
  return rows
    .map((r) => {
      const act = prev.categories.get(r.categoryId)?.activity ?? 0;
      return { categoryId: r.categoryId, newAssigned: Math.max(0, -act) };
    })
    .filter((p) => p.newAssigned !== rows.find((r) => r.categoryId === p.categoryId)!.assigned);
}

function average(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month,
  firstMonth: Month, pick: (assigned: number, activity: number) => number,
): Proposal[] {
  const hist = historyMonths(month, firstMonth);
  if (hist.length === 0) return [];
  return rows
    .map((r) => {
      const sum = hist.reduce((s, m) => {
        const cm = summaries.get(m)?.categories.get(r.categoryId);
        return s + (cm ? pick(cm.assigned, cm.activity) : 0);
      }, 0);
      return { categoryId: r.categoryId, newAssigned: Math.round(sum / hist.length) };
    })
    .filter((p) => p.newAssigned !== rows.find((r) => r.categoryId === p.categoryId)!.assigned);
}

export function proposeAverageAssigned(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month, firstMonth: Month,
): Proposal[] {
  return average(rows, summaries, month, firstMonth, (assigned) => assigned);
}

export function proposeAverageSpent(
  rows: PlanRow[], summaries: Map<Month, MonthSummary>, month: Month, firstMonth: Month,
): Proposal[] {
  return average(rows, summaries, month, firstMonth, (_a, activity) => Math.max(0, -activity));
}

export function proposeResetAssigned(rows: PlanRow[]): Proposal[] {
  return rows
    .filter((r) => r.assigned !== 0)
    .map((r) => ({ categoryId: r.categoryId, newAssigned: 0 }));
}

export function proposeResetAvailable(rows: PlanRow[]): Proposal[] {
  return rows
    .filter((r) => r.available > 0)
    .map((r) => ({ categoryId: r.categoryId, newAssigned: r.assigned - r.available }));
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 8 PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add history-based and reset auto-assign proposals"
```

---

### Task 8: Underfunded + Priority Stack (Partial Fill)

**Files:**
- Modify: `app/src/engine/autoAssign.ts` (thêm `proposeUnderfunded`)
- Test: `app/src/engine/__tests__/underfunded.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/engine/__tests__/underfunded.test.ts`:

```ts
import { expect, test } from 'vitest';
import { proposeUnderfunded } from '../autoAssign';
import type { PlanRow, Target } from '../types';

function row(p: Partial<PlanRow> & { categoryId: string }): PlanRow {
  return {
    kind: 'other', startBalance: 0, assigned: 0, activity: 0,
    available: 0, target: null, needed: 0, snoozed: false, ...p,
  };
}
const bill = (categoryId: string, amount: number, dueDay: number): Target =>
  ({ categoryId, strategy: 'set_aside', amount, cadence: 'monthly', dueDay });
const monthly = (categoryId: string, amount: number): Target =>
  ({ categoryId, strategy: 'set_aside', amount, cadence: 'monthly' });

// Scenario "Partial Fill" từ spec module-A-smart-addOn §2: RTA 500, tổng cần 1000
function scenarioRows(): PlanRow[] {
  return [
    row({ categoryId: 'tv', kind: 'other', available: -50, activity: -50 }), // Red
    row({ categoryId: 'rent', kind: 'bill', target: bill('rent', 400, 1), needed: 400 }),
    row({ categoryId: 'internet', kind: 'bill', target: bill('internet', 150, 15), needed: 150 }),
    row({ categoryId: 'groceries', kind: 'need', target: monthly('groceries', 300), needed: 300 }),
    row({ categoryId: 'saving', kind: 'saving', target: monthly('saving', 100), needed: 100 }),
  ];
}

test('partial fill theo đúng priority stack, dừng khi hết RTA', () => {
  const out = proposeUnderfunded(scenarioRows(), 500);
  // ① Red tv: cover 50 (newAssigned 0 + 50)  → còn 450
  // ② rent (bill, due 1): 400                 → còn 50
  // ③ internet (bill, due 15): 50/150 partial → còn 0
  // groceries, saving: không được gì
  expect(out).toEqual([
    { categoryId: 'tv', newAssigned: 50 },
    { categoryId: 'rent', newAssigned: 400 },
    { categoryId: 'internet', newAssigned: 50 },
  ]);
});

test('RTA dư thì fill đủ tất cả', () => {
  const out = proposeUnderfunded(scenarioRows(), 2_000);
  expect(out).toEqual([
    { categoryId: 'tv', newAssigned: 50 },
    { categoryId: 'rent', newAssigned: 400 },
    { categoryId: 'internet', newAssigned: 150 },
    { categoryId: 'groceries', newAssigned: 300 },
    { categoryId: 'saving', newAssigned: 100 },
  ]);
});

test('RTA = 0 → không đề xuất gì', () => {
  expect(proposeUnderfunded(scenarioRows(), 0)).toEqual([]);
});

test('bill due sớm hơn được ưu tiên trong cùng kind', () => {
  const rows = [
    row({ categoryId: 'late', kind: 'bill', target: bill('late', 100, 25), needed: 100 }),
    row({ categoryId: 'early', kind: 'bill', target: bill('early', 100, 5), needed: 100 }),
  ];
  expect(proposeUnderfunded(rows, 100)).toEqual([{ categoryId: 'early', newAssigned: 100 }]);
});

test('category vừa red vừa có target: cover trước, toGo xếp theo kind', () => {
  const rows = [
    row({ categoryId: 'food', kind: 'need', available: -100, activity: -100,
          target: monthly('food', 200), needed: 200 }),
    row({ categoryId: 'rent', kind: 'bill', target: bill('rent', 300, 1), needed: 300 }),
  ];
  // RTA 450: cover food 100 → rent 300 → food toGo 50/200
  expect(proposeUnderfunded(rows, 450)).toEqual([
    { categoryId: 'food', newAssigned: 150 }, // 100 cover + 50 partial toGo
    { categoryId: 'rent', newAssigned: 300 },
  ]);
});

test('snoozed không được fill', () => {
  const rows = [
    row({ categoryId: 'vac', kind: 'saving', target: monthly('vac', 200), needed: 0, snoozed: true }),
  ];
  expect(proposeUnderfunded(rows, 500)).toEqual([]);
});
```

- [ ] **Step 2: Verify FAIL**

Run: `npx vitest run src/engine/__tests__/underfunded.test.ts`
Expected: FAIL — "proposeUnderfunded is not exported"

- [ ] **Step 3: Thêm vào cuối `app/src/engine/autoAssign.ts`:**

```ts
import type { CategoryKind, Target } from './types'; // gộp vào import có sẵn ở đầu file

const KIND_PRIORITY: Record<CategoryKind, number> = { bill: 1, need: 2, saving: 3, other: 4 };

/** Sort key trong cùng bucket: bill due sớm đứng trước. */
function dueTiebreak(t: Target | null): number {
  if (!t) return 99;
  if (t.cadence === 'monthly') return t.dueDay ?? 31;
  if (t.cadence === 'weekly') return t.dueWeekday ?? 7;
  return 50; // yearly/custom: sau các bill trong tháng
}

/**
 * Nút Underfunded (spec §4d): fill theo Priority Stack
 * ① cover Red → ② bill theo due gần nhất → ③ need → ④ saving → ⑤ other.
 * Trả về newAssigned tuyệt đối; tổng delta không vượt rta.
 */
export function proposeUnderfunded(rows: PlanRow[], rta: number): Proposal[] {
  if (rta <= 0) return [];
  let remaining = rta;

  interface Want { categoryId: string; amount: number; priority: number; tiebreak: number; order: number }
  const wants: Want[] = [];
  rows.forEach((r, i) => {
    const cover = Math.max(0, -r.available);
    if (cover > 0) wants.push({ categoryId: r.categoryId, amount: cover, priority: 0, tiebreak: 0, order: i });
    if (r.target && !r.snoozed) {
      const gap = Math.max(0, r.needed - r.assigned);
      if (gap > 0) {
        wants.push({
          categoryId: r.categoryId, amount: gap,
          priority: KIND_PRIORITY[r.kind], tiebreak: dueTiebreak(r.target), order: i,
        });
      }
    }
  });
  wants.sort((a, b) => a.priority - b.priority || a.tiebreak - b.tiebreak || a.order - b.order);

  const delta = new Map<string, number>();
  for (const w of wants) {
    if (remaining <= 0) break;
    const give = Math.min(w.amount, remaining);
    delta.set(w.categoryId, (delta.get(w.categoryId) ?? 0) + give);
    remaining -= give;
  }

  return rows
    .filter((r) => delta.has(r.categoryId))
    .map((r) => ({ categoryId: r.categoryId, newAssigned: r.assigned + delta.get(r.categoryId)! }));
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 6 PASS. Chạy `npm test` → toàn bộ suite PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/src/engine
git commit -m "feat(engine): add underfunded auto-assign with priority stack partial fill"
```

---

### Task 9: Public API + Golden Scenario test

**Files:**
- Create: `app/src/engine/index.ts`
- Test: `app/src/engine/__tests__/scenario.test.ts`
- Delete: `app/src/engine/__tests__/sanity.test.ts` (hết nhiệm vụ)

- [ ] **Step 1: Tạo `app/src/engine/index.ts`:**

```ts
export * from './types'; // đã gồm type Month (re-export từ dates)
export {
  monthOf, nextMonth, prevMonth, monthRange,
  monthsRemaining, daysInMonth, weekdayCountInMonth,
} from './dates'; // KHÔNG export * — tránh ambiguous re-export Month với types.ts
export { computeThrough } from './compute';
export { needed, toGo, type NeedContext } from './targets';
export { buildPlanRows } from './rows';
export { categoryStatus, type CategoryStatus } from './status';
export { isOverspent, isUnderfunded, isOverfunded, isMoneyAvailable, isSnoozed } from './filters';
export {
  proposeUnderfunded, proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent,
  proposeResetAssigned, proposeResetAvailable,
} from './autoAssign';
```

- [ ] **Step 2: Viết golden test** — `app/src/engine/__tests__/scenario.test.ts` (scenario "Payday" từ `knowledge-based/understand-target-and-autoAssign.md` §3, chạy xuyên qua toàn bộ public API):

```ts
import { expect, test } from 'vitest';
import {
  computeThrough, buildPlanRows, categoryStatus,
  isOverspent, isUnderfunded, proposeUnderfunded,
} from '../index';
import type { BudgetInput } from '../index';

/**
 * Golden scenario (kb): lương về RTA 1.320.000 (đơn vị nghìn đồng trong kb gốc
 * là $ — đây dùng VND ngàn), "TV, phone and internet" đang overspent −200.000.
 * Kỳ vọng: cover TV trước, rồi bill theo due, rồi need.
 */
function scenario(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'tv', groupId: 'g1', name: 'TV/Internet', kind: 'bill', isSystem: false },
      { id: 'elec', groupId: 'g1', name: 'Điện', kind: 'bill', isSystem: false },
      { id: 'food', groupId: 'g2', name: 'Ăn uống', kind: 'need', isSystem: false },
      { id: 'vac', groupId: 'g3', name: 'Du lịch', kind: 'saving', isSystem: false },
    ],
    transactions: [
      // Tháng 5: chi TV 200k mà không assign → overspent
      { id: 't1', accountId: 'a1', date: '2026-05-20', categoryId: 'tv', amount: -200_000, status: 'cleared' },
      // Tháng 6: lương về
      { id: 't2', accountId: 'a1', date: '2026-06-01', categoryId: 'rta', amount: 1_320_000, status: 'cleared' },
    ],
    assignments: [],
    targets: [
      { categoryId: 'elec', strategy: 'set_aside', amount: 400_000, cadence: 'monthly', dueDay: 15 },
      { categoryId: 'food', strategy: 'refill', amount: 600_000, cadence: 'monthly' },
      { categoryId: 'vac', strategy: 'set_aside', amount: 500_000, cadence: 'monthly' },
    ],
    snoozes: [],
    firstMonth: '2026-05',
  };
}

test('golden: overspent tháng 5 trừ vào RTA tháng 6 (rollover)', () => {
  const summaries = computeThrough(scenario(), '2026-06');
  // RTA Jun = 0 (May) + 1.320k − 0 assigned + (−200k overspent May) = 1.120k
  expect(summaries.get('2026-06')!.rta).toBe(1_120_000);
  // TV reset về 0 đầu tháng 6
  expect(summaries.get('2026-06')!.categories.get('tv')!.available).toBe(0);
});

test('golden: tháng 5 TV là red, filter Overspent bắt đúng', () => {
  const input = scenario();
  const summaries = computeThrough(input, '2026-05');
  const rows = buildPlanRows(input, summaries, '2026-05');
  const tv = rows.find((r) => r.categoryId === 'tv')!;
  expect(categoryStatus(tv)).toBe('red');
  expect(rows.filter(isOverspent).map((r) => r.categoryId)).toEqual(['tv']);
});

test('golden: tháng 6 underfunded → auto-assign đủ vì RTA dư', () => {
  const input = scenario();
  const summaries = computeThrough(input, '2026-06');
  const rows = buildPlanRows(input, summaries, '2026-06');
  expect(rows.filter(isUnderfunded).map((r) => r.categoryId)).toEqual(['elec', 'food', 'vac']);

  const rta = summaries.get('2026-06')!.rta; // 1.120k, tổng cần 1.500k → partial
  const proposals = proposeUnderfunded(rows, rta);
  // elec (bill, due 15): 400k → food (need): 600k → vac (saving): 120k/500k partial
  expect(proposals).toEqual([
    { categoryId: 'elec', newAssigned: 400_000 },
    { categoryId: 'food', newAssigned: 600_000 },
    { categoryId: 'vac', newAssigned: 120_000 },
  ]);
});

test('golden: áp proposals → vac vẫn yellow, còn lại green', () => {
  const input = scenario();
  let summaries = computeThrough(input, '2026-06');
  const proposals = proposeUnderfunded(buildPlanRows(input, summaries, '2026-06'), summaries.get('2026-06')!.rta);
  input.assignments = proposals.map((p) => ({ categoryId: p.categoryId, month: '2026-06', assigned: p.newAssigned }));

  summaries = computeThrough(input, '2026-06');
  const rows = buildPlanRows(input, summaries, '2026-06');
  expect(summaries.get('2026-06')!.rta).toBe(0); // Rule 1: every dong has a job
  const status = Object.fromEntries(rows.map((r) => [r.categoryId, categoryStatus(r)]));
  expect(status['elec']).toBe('green');
  expect(status['food']).toBe('green');
  expect(status['vac']).toBe('yellow'); // còn thiếu 380k
});
```

- [ ] **Step 3: Xóa sanity test**

```powershell
Remove-Item app/src/engine/__tests__/sanity.test.ts
```

- [ ] **Step 4: Verify toàn bộ suite**

Run: `npm test`
Expected: tất cả file test PASS (~45 tests). Nếu golden test fail → debug bằng skill systematic-debugging, KHÔNG sửa expected value cho khớp output.

- [ ] **Step 5: Commit**

```powershell
git add -A app/src/engine
git commit -m "feat(engine): add public API and golden payday scenario test"
```

---

## Phase 1 hoàn thành khi

- [ ] `npm test` pass 100%, không skip
- [ ] `app/src/engine/` không import gì từ React/Supabase (kiểm: `grep -r "supabase\|react" app/src/engine/` → 0 kết quả)
- [ ] Golden scenario từ kb chạy đúng end-to-end qua public API
