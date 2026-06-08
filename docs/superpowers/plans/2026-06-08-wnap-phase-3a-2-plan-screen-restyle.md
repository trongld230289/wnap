# WNAP Phase 3A-2: Plan Screen Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle toàn bộ Plan screen (RTA, filter cards, bảng + AvailableBar, các modal Assign/Move/Target) sang vibe Calm Fintech bằng Tailwind + shadcn — không đổi logic.

**Architecture:** Đổi inline-style → Tailwind classes + shadcn (Button/Input/Select/Card/Badge; modal đã bọc Dialog ở 3A-1). Gom màu status về 1 helper `ui/statusColor.ts`. Giữ NGUYÊN props/hành vi mọi component → 94 test xanh, `npm run build` PASS.

**Tech Stack:** React 19, Tailwind v4, shadcn/ui. Tiền VND `formatVnd`.

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-phase-3a-design-system-restyle-design.md`.

**Prerequisite:** 3A-1 merged (Tailwind+shadcn+tokens, `@/` alias, `Modal`→Dialog, `AppTabs`→Tabs). Components ở `app/src/plan/`. Mọi lệnh trong `app/`.

> **VERIFY bằng `npm run build`** (chạy `tsc -b && vite build`) — KHÔNG dùng `npx tsc --noEmit` (no-op ở repo này). `npx vitest run` phải giữ 94 pass.

---

## File Structure

```
app/src/
  ui/statusColor.ts        ← map BarColor/status → Tailwind text/bg class (Task 1, NEW)
  plan/
    AvailableBar.tsx       ← Tailwind (Task 1, REPLACE)
    MonthNav.tsx           ← shadcn Button (Task 2, REPLACE)
    RtaHeader.tsx          ← Tailwind pill + Button (Task 2, REPLACE)
    FilterCards.tsx        ← Card/Badge (Task 2, REPLACE)
    CategoryTable.tsx      ← Tailwind table + AssignedCell (Task 3, REPLACE)
    AssignPopover.tsx      ← Button/Input/Select trong Dialog (Task 4, REPLACE)
    MoveMoneyModal.tsx     ← Input/Select/Button (Task 5, REPLACE)
    TargetEditorModal.tsx  ← Input/Select/Button (Task 5, REPLACE)
    PlanScreen.tsx         ← layout Tailwind + Button (Task 6, REPLACE)
```

Giữ NGUYÊN mọi import logic (`useBudget`, engine, `barFill`, `planFilters`, `format`, `autoAssign`) và props.

---

### Task 1: statusColor helper + AvailableBar

**Files:** Create `app/src/ui/statusColor.ts`; Replace `app/src/plan/AvailableBar.tsx`.

- [ ] **Step 1: Tạo `app/src/ui/statusColor.ts`:**

```ts
import type { BarColor } from '../budget/barFill';

/** Class màu chữ + nền-mờ (badge) cho từng màu status, dùng chung toàn UI. */
export const STATUS_TEXT: Record<BarColor, string> = {
  red: 'text-status-red',
  yellow: 'text-status-amber',
  green: 'text-status-green',
  gray: 'text-status-gray',
};
export const STATUS_BAR_BG: Record<BarColor, string> = {
  red: 'bg-status-red',
  yellow: 'bg-status-amber',
  green: 'bg-status-green',
  gray: 'bg-status-gray',
};
```

- [ ] **Step 2: Thay `app/src/plan/AvailableBar.tsx`:**

```tsx
import { barFill } from '../budget/barFill';
import { formatVnd } from '../budget/format';
import { STATUS_TEXT, STATUS_BAR_BG } from '../ui/statusColor';
import { cn } from '@/lib/utils';
import type { PlanRow } from '../engine';

export function AvailableBar({ row }: { row: PlanRow }) {
  const { pct, color } = barFill(row);
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', STATUS_BAR_BG[color])} style={{ width: `${pct * 100}%` }} />
      </span>
      <span className={cn('min-w-[80px] text-right font-semibold tabular-nums', STATUS_TEXT[color])}>
        {formatVnd(row.available)}
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/statusColor.ts app/src/plan/AvailableBar.tsx
git commit -m "feat(ui): restyle AvailableBar with status color tokens"
```

---

### Task 2: MonthNav + RtaHeader + FilterCards

**Files:** Replace `app/src/plan/MonthNav.tsx`, `app/src/plan/RtaHeader.tsx`, `app/src/plan/FilterCards.tsx`.

- [ ] **Step 1: Thay `app/src/plan/MonthNav.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { nextMonth, prevMonth } from '../engine';
import { formatMonth } from '../budget/format';
import { Button } from '@/components/ui/button';

export function MonthNav() {
  const { viewMonth, setViewMonth } = useBudget();
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(prevMonth(viewMonth))}>◀</Button>
      <span className="min-w-[120px] text-center font-semibold">Tháng {formatMonth(viewMonth)}</span>
      <Button variant="ghost" size="icon" onClick={() => setViewMonth(nextMonth(viewMonth))}>▶</Button>
    </div>
  );
}
```

- [ ] **Step 2: Thay `app/src/plan/RtaHeader.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';

export function RtaHeader({ onAssign }: { onAssign: () => void }) {
  const { rta } = useBudget();
  const tone = rta < 0 ? 'bg-status-red' : rta === 0 ? 'bg-status-gray' : 'bg-primary';
  return (
    <div className={cn('flex items-center gap-3 rounded-full px-4 py-2 text-primary-foreground shadow-sm', tone)}>
      <span className="font-semibold">Sẵn sàng phân bổ: <span className="tabular-nums">{formatVnd(rta)}₫</span></span>
      <button onClick={onAssign} className="rounded-md bg-white/20 px-2 py-0.5 text-sm font-medium hover:bg-white/30">＋ Assign</button>
    </div>
  );
}
```

- [ ] **Step 3: Thay `app/src/plan/FilterCards.tsx`:**

```tsx
import { useBudget } from '../budget/useBudget';
import { PLAN_FILTERS, filterCounts } from '../budget/planFilters';
import type { FilterId } from '../budget/planFilters';
import { cn } from '@/lib/utils';

export function FilterCards({ active, onToggle }: { active: FilterId | null; onToggle: (id: FilterId) => void }) {
  const { rows } = useBudget();
  const counts = filterCounts(rows);
  return (
    <div className="flex flex-wrap gap-2">
      {PLAN_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onToggle(f.id)}
          className={cn(
            'min-w-[92px] rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-accent',
            active === f.id ? 'border-primary ring-1 ring-primary' : 'border-border',
          )}
        >
          <div className="text-lg font-bold tabular-nums">{counts[f.id]}</div>
          <div className="text-xs text-muted-foreground">{f.label}</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 5: Commit**

```bash
git add app/src/plan/MonthNav.tsx app/src/plan/RtaHeader.tsx app/src/plan/FilterCards.tsx
git commit -m "feat(ui): restyle MonthNav, RtaHeader, FilterCards"
```

---

### Task 3: CategoryTable + AssignedCell

**Files:** Replace `app/src/plan/CategoryTable.tsx`.

Giữ NGUYÊN props `{ visibleRows, onMoveMoney, onEditTarget }`, hành vi sửa Assigned inline, click Available → onMoveMoney, 🎯 → onEditTarget.

- [ ] **Step 1: Thay `app/src/plan/CategoryTable.tsx`:**

```tsx
import { Fragment, useState } from 'react';
import { useBudget } from '../budget/useBudget';
import { AvailableBar } from './AvailableBar';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import type { PlanRow } from '../engine';

function AssignedCell({ row }: { row: PlanRow }) {
  const { setAssigned } = useBudget();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing) {
    return (
      <Input
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-24 text-right"
      />
    );
  }
  return (
    <button onClick={() => { setText(String(row.assigned)); setEditing(true); }}
      className="cursor-text border-b border-dashed border-primary/40 text-primary tabular-nums">
      {formatVnd(row.assigned)}
    </button>
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

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">Assigned</th>
            <th className="px-3 py-2 text-right font-medium">Activity</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
          </tr>
        </thead>
        <tbody>
          {groups.filter((g) => !g.isSystem).map((g) => {
            const rows = byGroup.get(g.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <Fragment key={g.id}>
                <tr><td colSpan={4} className="bg-muted/60 px-3 py-1.5 font-semibold text-foreground/80">{g.name}</td></tr>
                {rows.map((r) => (
                  <tr key={r.categoryId} className="border-b last:border-0">
                    <td className="px-3 py-2 text-left">
                      {categoryName(r.categoryId)}
                      <button onClick={() => onEditTarget(r.categoryId)} title="Mục tiêu" className="ml-1.5 opacity-60 hover:opacity-100">🎯</button>
                    </td>
                    <td className="px-3 py-2 text-right"><AssignedCell row={r} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatVnd(r.activity)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => onMoveMoney(r.categoryId)} title="Chuyển tiền" className="cursor-pointer"><AvailableBar row={r} /></button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

> Lưu ý: dùng `Fragment` để gom nhóm (group-header row + category rows) trong cùng `<tbody>` — hợp lệ HTML, gọn hơn table-trong-td trước đây.

- [ ] **Step 2: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/CategoryTable.tsx
git commit -m "feat(ui): restyle CategoryTable with Tailwind + grouped tbody"
```

---

### Task 4: AssignPopover

**Files:** Replace `app/src/plan/AssignPopover.tsx`.

Giữ NGUYÊN logic: `Modal` (Dialog) bọc; tab Auto (7 nút `AUTO_KINDS` → `computeProposals` → preview → `applyProposals`) / Manual (`setAssigned` cộng thêm).

- [ ] **Step 1: Thay `app/src/plan/AssignPopover.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { AUTO_KINDS, computeProposals } from '../budget/autoAssign';
import type { AutoKind } from '../budget/autoAssign';
import type { Proposal } from '../engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function AssignPopover({ onClose }: { onClose: () => void }) {
  const { rows, rta, summaries, viewMonth, firstMonth, categoryName, applyProposals, setAssigned } = useBudget();
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [preview, setPreview] = useState<{ kind: AutoKind; proposals: Proposal[] } | null>(null);
  const [manualCat, setManualCat] = useState(rows[0]?.categoryId ?? '');
  const [manualAmt, setManualAmt] = useState('');

  const ctx = { rows, rta, summaries, month: viewMonth, firstMonth };

  async function applyAuto() { if (preview) { await applyProposals(preview.proposals); onClose(); } }
  async function applyManual() {
    const amt = parseVnd(manualAmt);
    if (amt === 0 || !manualCat) return;
    const cur = rows.find((r) => r.categoryId === manualCat)?.assigned ?? 0;
    await setAssigned(manualCat, cur + amt);
    onClose();
  }

  return (
    <Modal title={`Phân bổ · RTA ${formatVnd(rta)}₫`} onClose={onClose}>
      <div className="mb-3 flex gap-1">
        <Button size="sm" variant={tab === 'auto' ? 'default' : 'secondary'} onClick={() => setTab('auto')}>Auto</Button>
        <Button size="sm" variant={tab === 'manual' ? 'default' : 'secondary'} onClick={() => setTab('manual')}>Manual</Button>
      </div>
      {tab === 'auto' ? (
        <div className="space-y-1">
          {AUTO_KINDS.map((k) => (
            <button key={k.id} onClick={() => setPreview({ kind: k.id, proposals: computeProposals(k.id, ctx) })}
              className={cn('block w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent',
                preview?.kind === k.id ? 'border-primary' : 'border-border')}>
              {k.label}
            </button>
          ))}
          {preview && (
            <div className="mt-2 rounded-lg bg-accent p-2.5 text-sm text-accent-foreground">
              {preview.proposals.length === 0 ? 'Không có thay đổi.' : (
                <ul className="list-disc pl-5">
                  {preview.proposals.map((p) => <li key={p.categoryId}>{categoryName(p.categoryId)} → <span className="tabular-nums">{formatVnd(p.newAssigned)}</span></li>)}
                </ul>
              )}
            </div>
          )}
          <Button className="mt-3 w-full" onClick={applyAuto} disabled={!preview || preview.proposals.length === 0}>Áp đề xuất</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={manualCat} onValueChange={setManualCat}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {rows.map((r) => <SelectItem key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="Cộng thêm vào Assigned (vd 500.000)" />
          <Button className="w-full" onClick={applyManual}>Phân bổ</Button>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/AssignPopover.tsx
git commit -m "feat(ui): restyle AssignPopover with shadcn"
```

---

### Task 5: MoveMoneyModal + TargetEditorModal

**Files:** Replace `app/src/plan/MoveMoneyModal.tsx`, `app/src/plan/TargetEditorModal.tsx`.

Giữ NGUYÊN logic & props (`{fromId,onClose}` / `{categoryId,onClose}`), `moveMoney`/`setTarget`/`removeTarget`/`setSnooze`.

- [ ] **Step 1: Thay `app/src/plan/MoveMoneyModal.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Từ</Label>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">{categoryName(fromId)} — có <span className="tabular-nums">{formatVnd(from.available)}₫</span></div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Đến</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {others.map((r) => <SelectItem key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)} ({formatVnd(r.available)}₫)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Số tiền</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
        </div>
        <Button className="w-full" onClick={move}>Chuyển</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Thay `app/src/plan/TargetEditorModal.tsx`:**

```tsx
import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { TargetStrategy, TargetCadence } from '../engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const lbl = 'text-xs text-muted-foreground';
  return (
    <Modal title={`Mục tiêu · ${categoryName(categoryId)}`} onClose={onClose}>
      <div className="space-y-2">
        <div><Label className={lbl}>Chiến lược</Label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as TargetStrategy)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="set_aside">Set aside (gom đều mỗi tháng)</SelectItem>
              <SelectItem value="refill">Refill up to (bơm đầy tới mức)</SelectItem>
              <SelectItem value="have_balance">Have balance by (đạt số dư trước hạn)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lbl}>Số tiền</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
        </div>
        <div><Label className={lbl}>Chu kỳ</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as TargetCadence)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Hằng tháng</SelectItem>
              <SelectItem value="weekly">Hằng tuần</SelectItem>
              <SelectItem value="yearly">Hằng năm</SelectItem>
              <SelectItem value="custom">Tùy chỉnh (theo hạn)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isWeekly && (<div><Label className={lbl}>Thứ trong tuần</Label>
          <Select value={dueWeekday} onValueChange={setDueWeekday}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Thứ 2</SelectItem><SelectItem value="2">Thứ 3</SelectItem><SelectItem value="3">Thứ 4</SelectItem>
              <SelectItem value="4">Thứ 5</SelectItem><SelectItem value="5">Thứ 6</SelectItem><SelectItem value="6">Thứ 7</SelectItem><SelectItem value="0">Chủ nhật</SelectItem>
            </SelectContent>
          </Select></div>)}
        {needsDate && (<div><Label className={lbl}>Hạn (deadline)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>)}
        {!isWeekly && !needsDate && (<div><Label className={lbl}>Ngày đến hạn trong tháng (tùy chọn, 1–31)</Label>
          <Input value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="vd 15" /></div>)}
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={save}>Lưu</Button>
          <Button variant="secondary" onClick={async () => { await setSnooze(categoryId, !row.snoozed); onClose(); }}>
            {row.snoozed ? 'Bỏ snooze' : '😴 Snooze'}
          </Button>
        </div>
        {t && <Button variant="ghost" className="w-full text-destructive" onClick={async () => { await removeTarget(categoryId); onClose(); }}>Xóa mục tiêu</Button>}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/plan/MoveMoneyModal.tsx app/src/plan/TargetEditorModal.tsx
git commit -m "feat(ui): restyle MoveMoney and TargetEditor modals with shadcn"
```

---

### Task 6: PlanScreen layout + responsive

**Files:** Replace `app/src/plan/PlanScreen.tsx`.

Giữ NGUYÊN logic (state `active`/`modal`, CRUD prompt, render modal theo `modal.type`).

- [ ] **Step 1: Thay `app/src/plan/PlanScreen.tsx`:**

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
import { Button } from '@/components/ui/button';

type ModalState =
  | { type: 'assign' }
  | { type: 'move'; fromId: string }
  | { type: 'target'; categoryId: string }
  | null;

export function PlanScreen() {
  const { loading, rows, groups, addGroup, addCategory } = useBudget();
  const [active, setActive] = useState<FilterId | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  if (loading) return <p className="m-10 text-muted-foreground">Đang tải ngân sách…</p>;

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
    <div className="mx-auto max-w-[980px] px-3 py-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNav />
        <RtaHeader onAssign={() => setModal({ type: 'assign' })} />
      </div>
      <div className="mb-3">
        <FilterCards active={active} onToggle={(id) => setActive(active === id ? null : id)} />
      </div>
      <div className="mb-2 flex gap-2">
        <Button variant="outline" size="sm" onClick={onAddGroup}>＋ Nhóm</Button>
        <Button variant="outline" size="sm" onClick={onAddCategory}>＋ Category</Button>
      </div>
      <div className="overflow-x-auto">
        <CategoryTable
          visibleRows={visibleRows}
          onMoveMoney={(id) => setModal({ type: 'move', fromId: id })}
          onEditTarget={(id) => setModal({ type: 'target', categoryId: id })}
        />
      </div>
      {modal?.type === 'assign' && <AssignPopover onClose={() => setModal(null)} />}
      {modal?.type === 'move' && <MoveMoneyModal fromId={modal.fromId} onClose={() => setModal(null)} />}
      {modal?.type === 'target' && <TargetEditorModal categoryId={modal.categoryId} onClose={() => setModal(null)} />}
    </div>
  );
}
```

> Responsive v1: header xếp dọc dưới `sm`; bảng `overflow-x-auto` cho mobile (card-per-category để Phase sau nếu cần). Đủ dùng cho gia đình.

- [ ] **Step 2: Verify** — `npm run build` PASS; `npx vitest run` 94 pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/PlanScreen.tsx
git commit -m "feat(ui): restyle PlanScreen layout + responsive header"
```

---

### Task 7: End-to-end verify (Playwright screenshot)

- [ ] **Step 1:** `npm run dev`, đăng nhập, tab Kế hoạch. Screenshot desktop (1280) + mobile (390).
- [ ] **Step 2:** Kiểm: RTA pill emerald, filter cards bo góc, bảng sạch + AvailableBar màu đúng, font Inter.
- [ ] **Step 3:** Mở popover Assign (Auto preview + Manual Select), Move Money (Select), Target editor (Select cadence) → render đẹp, đóng được, **hành vi không vỡ** (assign/move/target vẫn ghi đúng — đối chiếu nhanh số liệu).
- [ ] **Step 4:** Không lỗi console đỏ. Dừng dev server.

---

## 3A-2 hoàn thành khi

- [ ] `npm run build` PASS, `npx vitest run` 94 pass.
- [ ] Toàn Plan screen mang vibe Calm Fintech (RTA, filter, bảng, AvailableBar, 3 modal).
- [ ] Mọi hành vi (assign inline, auto-assign, move money, target, snooze, filter, month nav) vẫn chạy đúng.
- [ ] (Plan 3A-3) restyle Ledger.
```
