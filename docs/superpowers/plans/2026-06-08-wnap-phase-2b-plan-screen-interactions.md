# WNAP Phase 2B: Plan Screen Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung các tương tác còn lại của Module A lên Plan Screen đã có: popover Assign (Auto 7 nút + Manual), Move Money (Rule 3), Target editor, Snooze — tất cả ghi Supabase qua engine có sẵn.

**Architecture:** Thêm logic định tuyến auto-assign thuần (`autoAssign.ts`, test Vitest). Mở rộng context `useBudget` với mutations (setTarget/removeTarget/setSnooze/moveMoney/applyProposals) + expose `summaries`/`firstMonth`. Ba modal React (Target/Move/Assign) dùng chung `Modal.tsx`. Mutation = ghi Supabase rồi refetch+recompute (như 2A). UI trần (inline style) — polish để sau.

**Tech Stack:** React 19, Vite, TypeScript, Vitest, @supabase/supabase-js. Tiền VND số nguyên. Tháng `'YYYY-MM'`.

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-phase-2-plan-screen-design.md` (mục §1 "Để sau" + §2 mutations).

**Prerequisite:** Phase 2A đã merged vào `main` (PlanScreen foundation: useBudget, CategoryTable, RtaHeader, FilterCards, MonthNav, AvailableBar). Engine `app/src/engine/index.ts` xuất sẵn: `proposeUnderfunded`, `proposeAssignedLastMonth`, `proposeSpentLastMonth`, `proposeAverageAssigned`, `proposeAverageSpent`, `proposeResetAssigned`, `proposeResetAvailable`, types `Proposal`/`MonthSummary`/`TargetStrategy`/`TargetCadence`. Mọi lệnh chạy trong `app/`.

---

## File Structure

```
app/src/
  budget/
    autoAssign.ts          ← AUTO_KINDS + computeProposals (Task 1, NEW)
    useBudget.tsx          ← thêm mutations + expose summaries/firstMonth (Task 2, MODIFY)
    __tests__/autoAssign.test.ts
  plan/
    Modal.tsx              ← overlay dùng chung (Task 3, NEW)
    TargetEditorModal.tsx  ← (Task 3, NEW)
    MoveMoneyModal.tsx     ← (Task 4, NEW)
    AssignPopover.tsx      ← Auto + Manual (Task 5, NEW)
    RtaHeader.tsx          ← thêm nút Assign (Task 6, MODIFY)
    CategoryTable.tsx      ← nút Mục tiêu + click Available → Move (Task 6, MODIFY)
    PlanScreen.tsx         ← host modal + state (Task 6, MODIFY)
```

Chạy 1 file test: `npx vitest run src/budget/__tests__/<file>` ; chạy hết: `npm test` ; type-check: `npx tsc --noEmit`.

---

### Task 1: autoAssign.ts — định tuyến 7 nút auto-assign

**Files:**
- Create: `app/src/budget/autoAssign.ts`
- Test: `app/src/budget/__tests__/autoAssign.test.ts`

- [ ] **Step 1: Viết test fail** — `app/src/budget/__tests__/autoAssign.test.ts`:

```ts
import { expect, test } from 'vitest';
import { computeThrough, buildPlanRows } from '../../engine';
import type { BudgetInput } from '../../engine';
import { AUTO_KINDS, computeProposals } from '../autoAssign';

function input(): BudgetInput {
  return {
    categories: [
      { id: 'rta', groupId: 'g0', name: 'Inflow', kind: 'other', isSystem: true },
      { id: 'food', groupId: 'g1', name: 'Ăn uống', kind: 'need', isSystem: false },
    ],
    transactions: [
      { id: 't1', accountId: 'a1', date: '2026-01-05', categoryId: 'rta', amount: 20_000_000, status: 'cleared' },
      { id: 't2', accountId: 'a1', date: '2026-01-15', categoryId: 'food', amount: -1_800_000, status: 'cleared' },
    ],
    assignments: [{ categoryId: 'food', month: '2026-01', assigned: 2_000_000 }],
    targets: [], snoozes: [], firstMonth: '2026-01',
  };
}

function ctxAt(month: string) {
  const i = input();
  const summaries = computeThrough(i, month);
  const rows = buildPlanRows(i, summaries, month);
  return { rows, rta: summaries.get(month)!.rta, summaries, month, firstMonth: '2026-01' };
}

test('AUTO_KINDS có 7 nút đúng thứ tự', () => {
  expect(AUTO_KINDS.map((k) => k.id)).toEqual([
    'underfunded', 'assignedLastMonth', 'spentLastMonth',
    'averageAssigned', 'averageSpent', 'resetAvailable', 'resetAssigned',
  ]);
});

test('route assignedLastMonth → copy assigned tháng trước', () => {
  expect(computeProposals('assignedLastMonth', ctxAt('2026-02')))
    .toEqual([{ categoryId: 'food', newAssigned: 2_000_000 }]);
});

test('route spentLastMonth → chi tiêu tháng trước', () => {
  expect(computeProposals('spentLastMonth', ctxAt('2026-02')))
    .toEqual([{ categoryId: 'food', newAssigned: 1_800_000 }]);
});

test('route resetAssigned → assigned đang có về 0', () => {
  expect(computeProposals('resetAssigned', ctxAt('2026-01')))
    .toEqual([{ categoryId: 'food', newAssigned: 0 }]);
});
```

- [ ] **Step 2: Verify FAIL** — Run: `npx vitest run src/budget/__tests__/autoAssign.test.ts` → Expected: "Cannot find module '../autoAssign'".

- [ ] **Step 3: Implement** — `app/src/budget/autoAssign.ts`:

```ts
import {
  proposeUnderfunded, proposeAssignedLastMonth, proposeSpentLastMonth,
  proposeAverageAssigned, proposeAverageSpent, proposeResetAssigned, proposeResetAvailable,
} from '../engine';
import type { PlanRow, Proposal, Month, MonthSummary } from '../engine';

export type AutoKind =
  | 'underfunded' | 'assignedLastMonth' | 'spentLastMonth'
  | 'averageAssigned' | 'averageSpent' | 'resetAvailable' | 'resetAssigned';

export interface AutoCtx {
  rows: PlanRow[];
  rta: number;
  summaries: Map<Month, MonthSummary>;
  month: Month;
  firstMonth: Month;
}

export const AUTO_KINDS: { id: AutoKind; label: string }[] = [
  { id: 'underfunded', label: 'Underfunded — lấp đủ target' },
  { id: 'assignedLastMonth', label: 'Assigned Last Month' },
  { id: 'spentLastMonth', label: 'Spent Last Month' },
  { id: 'averageAssigned', label: 'Average Assigned' },
  { id: 'averageSpent', label: 'Average Spent' },
  { id: 'resetAvailable', label: 'Reset Available' },
  { id: 'resetAssigned', label: 'Reset Assigned' },
];

export function computeProposals(kind: AutoKind, ctx: AutoCtx): Proposal[] {
  const { rows, rta, summaries, month, firstMonth } = ctx;
  switch (kind) {
    case 'underfunded': return proposeUnderfunded(rows, rta);
    case 'assignedLastMonth': return proposeAssignedLastMonth(rows, summaries, month);
    case 'spentLastMonth': return proposeSpentLastMonth(rows, summaries, month);
    case 'averageAssigned': return proposeAverageAssigned(rows, summaries, month, firstMonth);
    case 'averageSpent': return proposeAverageSpent(rows, summaries, month, firstMonth);
    case 'resetAvailable': return proposeResetAvailable(rows);
    case 'resetAssigned': return proposeResetAssigned(rows);
  }
}
```

- [ ] **Step 4: Verify PASS** — chạy lại Step 2. Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/autoAssign.ts app/src/budget/__tests__/autoAssign.test.ts
git commit -m "feat(plan): add auto-assign kind routing (computeProposals)"
```

---

### Task 2: useBudget — mutations + expose summaries/firstMonth

**Files:**
- Modify (thay toàn bộ nội dung): `app/src/budget/useBudget.tsx`

Verify bằng `tsc` (file wiring Supabase, không unit-test).

- [ ] **Step 1: Thay toàn bộ `app/src/budget/useBudget.tsx` bằng:**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeThrough, buildPlanRows, monthOf } from '../engine';
import type { Month, PlanRow, Proposal, MonthSummary, TargetStrategy, TargetCadence } from '../engine';
import { toBudgetInput, deriveFirstMonth } from '../lib/mappers';
import type { RawBudgetData } from '../lib/mappers';

export interface TargetInput {
  strategy: TargetStrategy;
  amount: number;
  cadence: TargetCadence;
  dueDay: number | null;
  dueWeekday: number | null;
  dueDate: string | null;
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
  categoryName: (id: string) => string;
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

  const setTarget = useCallback(async (categoryId: string, t: TargetInput) => {
    await supabase.from('targets').upsert(
      {
        budget_id: budgetId, category_id: categoryId,
        strategy: t.strategy, amount: t.amount, cadence: t.cadence,
        due_day: t.dueDay, due_weekday: t.dueWeekday, due_date: t.dueDate,
      },
      { onConflict: 'category_id' },
    );
    await refetch();
  }, [budgetId, refetch]);

  const removeTarget = useCallback(async (categoryId: string) => {
    await supabase.from('targets').delete().eq('budget_id', budgetId).eq('category_id', categoryId);
    await refetch();
  }, [budgetId, refetch]);

  const setSnooze = useCallback(async (categoryId: string, snoozed: boolean) => {
    if (snoozed) {
      await supabase.from('target_snoozes').upsert(
        { budget_id: budgetId, category_id: categoryId, month: viewMonth },
        { onConflict: 'category_id,month', ignoreDuplicates: true },
      );
    } else {
      await supabase.from('target_snoozes').delete()
        .eq('category_id', categoryId).eq('month', viewMonth);
    }
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const moveMoney = useCallback(async (fromId: string, toId: string, amount: number) => {
    const assignedNow = (id: string) =>
      raw.assignments.find((a) => a.category_id === id && a.month === viewMonth)?.assigned ?? 0;
    await supabase.from('assignments').upsert(
      [
        { budget_id: budgetId, category_id: fromId, month: viewMonth, assigned: assignedNow(fromId) - amount },
        { budget_id: budgetId, category_id: toId, month: viewMonth, assigned: assignedNow(toId) + amount },
      ],
      { onConflict: 'category_id,month' },
    );
    await refetch();
  }, [budgetId, viewMonth, raw, refetch]);

  const applyProposals = useCallback(async (proposals: Proposal[]) => {
    if (proposals.length === 0) return;
    await supabase.from('assignments').upsert(
      proposals.map((p) => ({ budget_id: budgetId, category_id: p.categoryId, month: viewMonth, assigned: p.newAssigned })),
      { onConflict: 'category_id,month' },
    );
    await refetch();
  }, [budgetId, viewMonth, refetch]);

  const value: BudgetCtx = {
    loading, viewMonth, setViewMonth, rows, rta, summaries, firstMonth, groups,
    categoryName: (id) => nameById.get(id) ?? id,
    groupIdOf: (id) => groupById.get(id) ?? '',
    refetch, setAssigned, addGroup, addCategory,
    setTarget, removeTarget, setSnooze, moveMoney, applyProposals,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBudget(): BudgetCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBudget must be used within BudgetProvider');
  return v;
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → exit 0. Run `npx vitest run` → 87 tests pass (83 + 4 từ Task 1).

- [ ] **Step 3: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(plan): add target/snooze/move/proposal mutations to useBudget"
```

---

### Task 3: Modal.tsx + TargetEditorModal.tsx

**Files:**
- Create: `app/src/plan/Modal.tsx`, `app/src/plan/TargetEditorModal.tsx`

- [ ] **Step 1: Implement `app/src/plan/Modal.tsx`:**

```tsx
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, minWidth: 340, maxWidth: 420, width: '90%', boxShadow: '0 12px 40px #0003', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Đóng">✕</button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `app/src/plan/TargetEditorModal.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { TargetStrategy, TargetCadence } from '../engine';

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', color: '#999', marginTop: 8, display: 'block' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function TargetEditorModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { rows, categoryName, setTarget, removeTarget, setSnooze } = useBudget();
  const row = rows.find((r) => r.categoryId === categoryId)!;
  const t = row.target;
  const [strategy, setStrategy] = useState<TargetStrategy>(t?.strategy ?? 'set_aside');
  const [amount, setAmount] = useState(t ? formatVnd(t.amount) : '');
  const [cadence, setCadence] = useState<TargetCadence>(t?.cadence ?? 'monthly');
  const [dueDay, setDueDay] = useState(t?.dueDay != null ? String(t.dueDay) : '');
  const [dueWeekday, setDueWeekday] = useState(t?.dueWeekday != null ? String(t.dueWeekday) : '1');
  const [dueDate, setDueDate] = useState(t?.dueDate ?? '');

  const needsDate = strategy === 'have_balance' || cadence === 'yearly' || cadence === 'custom';
  const isWeekly = cadence === 'weekly';

  async function save() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (needsDate && !dueDate) { window.alert('Chọn ngày hạn (deadline)'); return; }
    await setTarget(categoryId, {
      strategy, amount: amt, cadence,
      dueDay: !needsDate && !isWeekly && dueDay ? Number(dueDay) : null,
      dueWeekday: isWeekly ? Number(dueWeekday) : null,
      dueDate: needsDate ? dueDate : null,
    });
    onClose();
  }

  return (
    <Modal title={`Mục tiêu · ${categoryName(categoryId)}`} onClose={onClose}>
      <label style={lbl}>Chiến lược</label>
      <select style={inp} value={strategy} onChange={(e) => setStrategy(e.target.value as TargetStrategy)}>
        <option value="set_aside">Set aside (gom đều mỗi tháng)</option>
        <option value="refill">Refill up to (bơm đầy tới mức)</option>
        <option value="have_balance">Have balance by (đạt số dư trước hạn)</option>
      </select>
      <label style={lbl}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
      <label style={lbl}>Chu kỳ</label>
      <select style={inp} value={cadence} onChange={(e) => setCadence(e.target.value as TargetCadence)}>
        <option value="monthly">Hằng tháng</option>
        <option value="weekly">Hằng tuần</option>
        <option value="yearly">Hằng năm</option>
        <option value="custom">Tùy chỉnh (theo hạn)</option>
      </select>
      {isWeekly && (
        <>
          <label style={lbl}>Thứ trong tuần</label>
          <select style={inp} value={dueWeekday} onChange={(e) => setDueWeekday(e.target.value)}>
            <option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option>
            <option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option>
          </select>
        </>
      )}
      {needsDate && (
        <>
          <label style={lbl}>Hạn (deadline)</label>
          <input style={inp} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </>
      )}
      {!isWeekly && !needsDate && (
        <>
          <label style={lbl}>Ngày đến hạn trong tháng (tùy chọn, 1–31)</label>
          <input style={inp} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="vd 15" />
        </>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={save} style={{ flex: 1, background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Lưu</button>
        <button onClick={async () => { await setSnooze(categoryId, !row.snoozed); onClose(); }}>
          {row.snoozed ? 'Bỏ snooze' : '😴 Snooze tháng này'}
        </button>
      </div>
      {t && (
        <button onClick={async () => { await removeTarget(categoryId); onClose(); }}
          style={{ marginTop: 8, color: '#c0392b', background: 'none', border: 0, cursor: 'pointer' }}>
          Xóa mục tiêu
        </button>
      )}
    </Modal>
  );
}
```

- [ ] **Step 3: Verify** — Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/src/plan/Modal.tsx app/src/plan/TargetEditorModal.tsx
git commit -m "feat(plan): add Modal wrapper and TargetEditorModal (with snooze)"
```

---

### Task 4: MoveMoneyModal.tsx

**Files:**
- Create: `app/src/plan/MoveMoneyModal.tsx`

- [ ] **Step 1: Implement `app/src/plan/MoveMoneyModal.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';

const lbl: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', color: '#999', marginTop: 8, display: 'block' };
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function MoveMoneyModal({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { rows, categoryName, moveMoney } = useBudget();
  const from = rows.find((r) => r.categoryId === fromId)!;
  const others = rows.filter((r) => r.categoryId !== fromId);
  const [toId, setToId] = useState(others[0]?.categoryId ?? '');
  const [amount, setAmount] = useState('');

  async function move() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (!toId) { window.alert('Chọn category đích'); return; }
    await moveMoney(fromId, toId, amt);
    onClose();
  }

  return (
    <Modal title="Chuyển tiền" onClose={onClose}>
      <label style={lbl}>Từ</label>
      <div style={{ ...inp, background: '#f6f6f8' }}>{categoryName(fromId)} — có {formatVnd(from.available)}₫</div>
      <label style={lbl}>Đến</label>
      <select style={inp} value={toId} onChange={(e) => setToId(e.target.value)}>
        {others.map((r) => (
          <option key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)} ({formatVnd(r.available)}₫)</option>
        ))}
      </select>
      <label style={lbl}>Số tiền</label>
      <input style={inp} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
      <button onClick={move} style={{ marginTop: 14, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Chuyển</button>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/MoveMoneyModal.tsx
git commit -m "feat(plan): add MoveMoneyModal (Rule 3)"
```

---

### Task 5: AssignPopover.tsx (Auto + Manual)

**Files:**
- Create: `app/src/plan/AssignPopover.tsx`

- [ ] **Step 1: Implement `app/src/plan/AssignPopover.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { AUTO_KINDS, computeProposals } from '../budget/autoAssign';
import type { AutoKind } from '../budget/autoAssign';
import type { Proposal } from '../engine';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function AssignPopover({ onClose }: { onClose: () => void }) {
  const { rows, rta, summaries, viewMonth, firstMonth, categoryName, applyProposals, setAssigned } = useBudget();
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [preview, setPreview] = useState<{ kind: AutoKind; proposals: Proposal[] } | null>(null);
  const [manualCat, setManualCat] = useState(rows[0]?.categoryId ?? '');
  const [manualAmt, setManualAmt] = useState('');

  const ctx = { rows, rta, summaries, month: viewMonth, firstMonth };
  const tabStyle = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 8, border: 0, cursor: 'pointer', background: on ? '#1f9d55' : '#f1f1f3', color: on ? '#fff' : '#777' });

  async function applyAuto() {
    if (preview) { await applyProposals(preview.proposals); onClose(); }
  }
  async function applyManual() {
    const amt = parseVnd(manualAmt);
    if (amt === 0 || !manualCat) return;
    const cur = rows.find((r) => r.categoryId === manualCat)?.assigned ?? 0;
    await setAssigned(manualCat, cur + amt);
    onClose();
  }

  return (
    <Modal title={`Phân bổ · RTA ${formatVnd(rta)}₫`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={tabStyle(tab === 'auto')} onClick={() => setTab('auto')}>Auto</button>
        <button style={tabStyle(tab === 'manual')} onClick={() => setTab('manual')}>Manual</button>
      </div>
      {tab === 'auto' ? (
        <div>
          {AUTO_KINDS.map((k) => (
            <button key={k.id} onClick={() => setPreview({ kind: k.id, proposals: computeProposals(k.id, ctx) })}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px', margin: '3px 0', borderRadius: 8, background: '#fff', cursor: 'pointer', border: preview?.kind === k.id ? '1px solid #2b6cb0' : '1px solid #e3e3e6' }}>
              {k.label}
            </button>
          ))}
          {preview && (
            <div style={{ marginTop: 10, background: '#f0f7f1', borderRadius: 8, padding: 10, fontSize: 13 }}>
              {preview.proposals.length === 0 ? 'Không có thay đổi.' : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {preview.proposals.map((p) => (
                    <li key={p.categoryId}>{categoryName(p.categoryId)} → {formatVnd(p.newAssigned)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button onClick={applyAuto} disabled={!preview || preview.proposals.length === 0}
            style={{ marginTop: 12, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>
            Áp đề xuất
          </button>
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 11, color: '#999' }}>Category</label>
          <select style={inp} value={manualCat} onChange={(e) => setManualCat(e.target.value)}>
            {rows.map((r) => <option key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)}</option>)}
          </select>
          <label style={{ fontSize: 11, color: '#999' }}>Cộng thêm vào Assigned</label>
          <input style={inp} value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="vd 500.000" />
          <button onClick={applyManual} style={{ marginTop: 12, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Phân bổ</button>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify** — Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/AssignPopover.tsx
git commit -m "feat(plan): add AssignPopover (Auto proposals + Manual)"
```

---

### Task 6: Wire modals vào RtaHeader + CategoryTable + PlanScreen

**Files:**
- Modify (thay toàn bộ): `app/src/plan/RtaHeader.tsx`, `app/src/plan/CategoryTable.tsx`, `app/src/plan/PlanScreen.tsx`

- [ ] **Step 1: Thay `app/src/plan/RtaHeader.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const bg = rta < 0 ? '#d23b3b' : rta === 0 ? '#9aa0a6' : '#1f9d55';
  return (
    <span style={{ background: bg, color: '#fff', padding: '8px 14px', borderRadius: 999, fontWeight: 600 }}>
      Ready to Assign: {formatVnd(rta)}₫
      <button onClick={onAssign} style={{ marginLeft: 10, background: 'rgba(255,255,255,.25)', color: '#fff', border: 0, borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}>＋ Assign</button>
    </span>
  );
}
```

- [ ] **Step 2: Thay `app/src/plan/CategoryTable.tsx`** (thêm 2 prop callback; nút 🎯 ở cột Category; click Available → Move):

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

interface Props {
  visibleRows: PlanRow[];
  onMoveMoney: (categoryId: string) => void;
  onEditTarget: (categoryId: string) => void;
}

export function CategoryTable({ visibleRows, onMoveMoney, onEditTarget }: Props) {
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
                      <td style={{ ...cell, textAlign: 'left' }}>
                        {categoryName(r.categoryId)}
                        <button onClick={() => onEditTarget(r.categoryId)} title="Mục tiêu"
                          style={{ marginLeft: 6, border: 0, background: 'none', cursor: 'pointer', opacity: 0.6 }}>🎯</button>
                      </td>
                      <td style={cell}><AssignedCell row={r} /></td>
                      <td style={cell}>{formatVnd(r.activity)}</td>
                      <td style={cell}>
                        <span onClick={() => onMoveMoney(r.categoryId)} title="Chuyển tiền" style={{ cursor: 'pointer' }}>
                          <AvailableBar row={r} />
                        </span>
                      </td>
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

- [ ] **Step 3: Thay `app/src/plan/PlanScreen.tsx`** (host modal + truyền callback):

```tsx
import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { MonthNav } from './MonthNav';
import { RtaHeader } from './RtaHeader';
import { FilterCards } from './FilterCards';
import { CategoryTable } from './CategoryTable';
import { AssignPopover } from './AssignPopover';
import { MoveMoneyModal } from './MoveMoneyModal';
import { TargetEditorModal } from './TargetEditorModal';
import { PLAN_FILTERS } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';

type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | null;

export function PlanScreen() {
  const { loading, rows, groups, addGroup, addCategory } = useBudget();
  const [active, setActive] = useState<FilterId | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

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
        <RtaHeader onAssign={() => setModal({ type: 'assign' })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <FilterCards active={active} onToggle={(id) => setActive(active === id ? null : id)} />
      </div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button onClick={onAddGroup}>＋ Nhóm</button>
        <button onClick={onAddCategory}>＋ Category</button>
      </div>
      <CategoryTable
        visibleRows={visibleRows}
        onMoveMoney={(id) => setModal({ type: 'move', fromId: id })}
        onEditTarget={(id) => setModal({ type: 'target', categoryId: id })}
      />
      {modal?.type === 'assign' && <AssignPopover onClose={() => setModal(null)} />}
      {modal?.type === 'move' && <MoveMoneyModal fromId={modal.fromId} onClose={() => setModal(null)} />}
      {modal?.type === 'target' && <TargetEditorModal categoryId={modal.categoryId} onClose={() => setModal(null)} />}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — Run: `npx tsc --noEmit` → exit 0. Run `npm test` → 87 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/plan/RtaHeader.tsx app/src/plan/CategoryTable.tsx app/src/plan/PlanScreen.tsx
git commit -m "feat(plan): wire Assign popover, Move Money and Target editor into Plan screen"
```

---

### Task 7: End-to-end verify (Playwright) + chốt

**Files:** không tạo file; verify hành vi thật trên dev server + Supabase. Dùng tài khoản Phase 0 (`wnap.husband@gmail.com` / `matkhau123`), budget "Ngân sách gia đình" đã có category "Điện".

- [ ] **Step 1:** `npm run dev`, đăng nhập, vào PlanScreen tháng hiện tại.

- [ ] **Step 2: Target editor + status** — bấm 🎯 ở "Điện" → chọn Set aside, Số tiền 400.000, Hằng tháng → Lưu. Kỳ vọng: nếu chưa assign đủ thì status **vàng** (Underfunded đếm tăng); nếu đã assign 400k thì **xanh**.

- [ ] **Step 3: Assign popover (Auto)** — bấm ＋ Assign → tab Auto → bấm **Underfunded** → preview hiện "Điện → …" → **Áp đề xuất**. Kỳ vọng: Assigned của Điện tăng tới mức target, status xanh, RTA giảm tương ứng. (Nếu RTA ≤ 0 thì preview có thể rỗng — assign tay chút tiền hoặc tạo inflow trước; chấp nhận.)

- [ ] **Step 4: Move Money** — tạo thêm 1 category (vd "Ăn uống"), assign cho nó ít tiền, rồi click ô **Available** của nó → modal Chuyển tiền → chọn đích "Điện", nhập số → Chuyển. Kỳ vọng: available nguồn giảm, đích tăng đúng số.

- [ ] **Step 5: Snooze** — 🎯 ở Điện → **Snooze tháng này** → status chuyển **gray-snoozed**, filter **Snoozed** đếm 1; mở lại 🎯 → **Bỏ snooze** → trở lại.

- [ ] **Step 6: Manual assign** — ＋ Assign → tab Manual → chọn category + nhập số → Phân bổ → Assigned cộng thêm đúng.

- [ ] **Step 7:** Không lỗi console đỏ. Dừng dev server.

---

## Phase 2B hoàn thành khi

- [ ] `npm test` PASS 100% (87 test), `npx tsc --noEmit` exit 0.
- [ ] Đặt/sửa/xóa target từ UI → status & filter cập nhật đúng.
- [ ] Snooze/bỏ snooze hoạt động (gray-snoozed + filter Snoozed).
- [ ] Assign popover Auto (7 nút, preview rồi áp) + Manual hoạt động; áp đúng `propose*`.
- [ ] Move Money chuyển đúng giữa 2 category.
- [ ] (Còn lại của Phase 2) Module B — Ledger (accounts, transactions, balances, reconcile).
```
