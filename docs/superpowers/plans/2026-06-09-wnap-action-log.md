# Action Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ghi minh bạch các lần phân bổ tiền `[giờ|người|category|cũ→mới]` qua trigger DB và hiển thị trong Dialog "Hoạt động gần đây", cập nhật live qua realtime đã có.

**Architecture:** Trigger `after insert/update on assignments` ghi `action_log` (user = `auth.uid()`). Client fetch `action_log` (50 gần nhất) + `budget_members` trong `refetch` (đã chạy mỗi khi assign đổi nhờ realtime broadcast) → map sang `recentMoves` → Dialog hiển thị. Pure `mapActionLog` test bằng vitest. Không đổi engine/mutation.

**Tech Stack:** React 19 + TS, shadcn Dialog (qua `plan/Modal`), Supabase trigger.

**Lưu ý chung:** Lệnh chạy trong `app/`. Type-check = `npm run build`. Test: `npm test -- --run <path>`. Branch `feat/wnap-action-log`.

---

### Task 0: Tạo branch

- [ ] **Step 1:** `git checkout main && git checkout -b feat/wnap-action-log` → Expected: `Switched to a new branch 'feat/wnap-action-log'`

---

### Task 1: `mapActionLog` pure (TDD)

**Files:**
- Create: `app/src/budget/actionLog.ts`
- Test: `app/src/budget/__tests__/actionLog.test.ts`

- [ ] **Step 1: Viết test thất bại `app/src/budget/__tests__/actionLog.test.ts`**

```ts
import { expect, test } from 'vitest';
import { mapActionLog } from '../actionLog';

const members = [
  { user_id: 'u1', display_name: 'Chồng' },
  { user_id: 'u2', display_name: 'Vợ' },
];

test('map raw → entry, resolve tên người', () => {
  const rows = [
    { id: 2, user_id: 'u2', entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 100, new_value: 300, created_at: '2026-06-09T10:00:00Z' },
    { id: 1, user_id: 'u1', entity_ref: { category_id: 'c2', month: '2026-06' }, old_value: null, new_value: 500, created_at: '2026-06-09T09:00:00Z' },
  ];
  expect(mapActionLog(rows, members)).toEqual([
    { id: 2, userName: 'Vợ', categoryId: 'c1', month: '2026-06', oldValue: 100, newValue: 300, at: '2026-06-09T10:00:00Z' },
    { id: 1, userName: 'Chồng', categoryId: 'c2', month: '2026-06', oldValue: null, newValue: 500, at: '2026-06-09T09:00:00Z' },
  ]);
});

test('user lạ / null → (?)', () => {
  const rows = [
    { id: 3, user_id: 'ghost', entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 0, new_value: 50, created_at: 't' },
    { id: 4, user_id: null, entity_ref: { category_id: 'c1', month: '2026-06' }, old_value: 0, new_value: 50, created_at: 't' },
  ];
  expect(mapActionLog(rows, members).map((e) => e.userName)).toEqual(['(?)', '(?)']);
});

test('entity_ref null → categoryId rỗng, newValue null → 0', () => {
  const rows = [{ id: 5, user_id: 'u1', entity_ref: null, old_value: null, new_value: null, created_at: 't' }];
  expect(mapActionLog(rows, members)[0]).toMatchObject({ categoryId: '', month: '', newValue: 0 });
});
```

- [ ] **Step 2:** Run `cd app; npm test -- --run src/budget/__tests__/actionLog.test.ts` → FAIL (`Cannot find module '../actionLog'`).

- [ ] **Step 3: Viết `app/src/budget/actionLog.ts`**

```ts
export interface RawActionLog {
  id: number;
  user_id: string | null;
  entity_ref: { category_id: string; month: string } | null;
  old_value: number | null;
  new_value: number | null;
  created_at: string;
}

export interface BudgetMember { user_id: string; display_name: string; }

export interface ActionLogEntry {
  id: number;
  userName: string;
  categoryId: string;
  month: string;
  oldValue: number | null;
  newValue: number;
  at: string;
}

/** Map dòng action_log + danh sách thành viên → entry đã có tên người. */
export function mapActionLog(rows: RawActionLog[], members: BudgetMember[]): ActionLogEntry[] {
  const nameById = new Map(members.map((m) => [m.user_id, m.display_name]));
  return rows.map((r) => ({
    id: r.id,
    userName: r.user_id ? nameById.get(r.user_id) ?? '(?)' : '(?)',
    categoryId: r.entity_ref?.category_id ?? '',
    month: r.entity_ref?.month ?? '',
    oldValue: r.old_value,
    newValue: r.new_value ?? 0,
    at: r.created_at,
  }));
}
```

- [ ] **Step 4:** Run test again → PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add app/src/budget/actionLog.ts app/src/budget/__tests__/actionLog.test.ts
git commit -m "feat(actionlog): pure mapActionLog + types"
```

---

### Task 2: Migration trigger ghi action_log

**Files:**
- Create: `supabase/migrations/0007_action_log.sql`
- Modify: `supabase/apply_all.sql` (append)

- [ ] **Step 1: Tạo `supabase/migrations/0007_action_log.sql`**

```sql
-- 0007_action_log.sql — Ghi action_log khi phân bổ tiền (assign/move/auto). Module D §5d.
create or replace function public.log_assignment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(new.assigned, 0) = 0 then return null; end if;
  if tg_op = 'UPDATE' and new.assigned is not distinct from old.assigned then return null; end if;
  insert into action_log (budget_id, user_id, action, entity_ref, old_value, new_value)
  values (
    new.budget_id,
    auth.uid(),
    'assign',
    jsonb_build_object('category_id', new.category_id, 'month', new.month),
    case when tg_op = 'UPDATE' then old.assigned else null end,
    new.assigned
  );
  return null;
end; $$;

drop trigger if exists log_assignment_change on assignments;
create trigger log_assignment_change
after insert or update on assignments
for each row execute function public.log_assignment_change();
```

- [ ] **Step 2: Append vào cuối `supabase/apply_all.sql`** (đọc file trước, thêm ở cuối):
```sql

-- ===== 0007_action_log.sql =====
create or replace function public.log_assignment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(new.assigned, 0) = 0 then return null; end if;
  if tg_op = 'UPDATE' and new.assigned is not distinct from old.assigned then return null; end if;
  insert into action_log (budget_id, user_id, action, entity_ref, old_value, new_value)
  values (
    new.budget_id, auth.uid(), 'assign',
    jsonb_build_object('category_id', new.category_id, 'month', new.month),
    case when tg_op = 'UPDATE' then old.assigned else null end,
    new.assigned
  );
  return null;
end; $$;
drop trigger if exists log_assignment_change on assignments;
create trigger log_assignment_change after insert or update on assignments
for each row execute function public.log_assignment_change();
```

- [ ] **Step 3: Commit** (apply lên Supabase ở Task 5)
```bash
git add supabase/migrations/0007_action_log.sql supabase/apply_all.sql
git commit -m "feat(actionlog): 0007 trigger ghi action_log khi assign đổi"
```

---

### Task 3: Fetch + expose `recentMoves` trong `BudgetProvider`

**Files:**
- Modify: `app/src/budget/useBudget.tsx`

- [ ] **Step 1: Thêm import** (sau dòng `import { debounce } from './debounce';`):
```tsx
import { mapActionLog } from './actionLog';
import type { RawActionLog, BudgetMember, ActionLogEntry } from './actionLog';
```

- [ ] **Step 2: Thêm `recentMoves` vào interface `BudgetCtx`** (thêm cạnh `transactions: LedgerTxn[];`):
```tsx
  recentMoves: ActionLogEntry[];
```

- [ ] **Step 3: Mở rộng `FetchResult` + `fetchRaw`.** Thay interface `FetchResult` thành:
```tsx
interface FetchResult {
  raw: RawBudgetData;
  groups: BudgetCtx['groups'];
  accounts: RawAccount[];
  payees: RawPayee[];
  actionLog: RawActionLog[];
  members: BudgetMember[];
}
```
Trong `fetchRaw`, thêm 2 truy vấn vào mảng `Promise.all` (sau `pay`):
```tsx
    supabase.from('action_log').select('id,user_id,entity_ref,old_value,new_value,created_at').eq('budget_id', budgetId).order('created_at', { ascending: false }).limit(50),
    supabase.from('budget_members').select('user_id,display_name').eq('budget_id', budgetId),
```
Đổi dòng destructure cho khớp:
```tsx
  const [g, c, t, s, a, tx, acc, pay, al, mem] = await Promise.all([
```
Và thêm vào object return:
```tsx
    actionLog: (al.data ?? []) as RawActionLog[],
    members: (mem.data ?? []) as BudgetMember[],
```

- [ ] **Step 4: State + set trong refetch + recentMoves.** Thêm state (cạnh `const [rawPayees, setRawPayees] = …`):
```tsx
  const [rawActionLog, setRawActionLog] = useState<RawActionLog[]>([]);
  const [members, setMembers] = useState<BudgetMember[]>([]);
```
Trong `refetch`, sau `setRawPayees(r.payees);`:
```tsx
    setRawActionLog(r.actionLog);
    setMembers(r.members);
```
Thêm memo (cạnh các `useMemo` khác, ví dụ sau `const transactions = useMemo(...)`):
```tsx
  const recentMoves = useMemo(() => mapActionLog(rawActionLog, members), [rawActionLog, members]);
```

- [ ] **Step 5: Expose trong `value`.** Trong object `const value: BudgetCtx = { … }`, thêm `recentMoves` vào (cạnh `accounts, payees, transactions,`):
```tsx
    accounts, payees, transactions, recentMoves,
```

- [ ] **Step 6: Verify build + test**

Run: `cd app; npm run build && npm test -- --run`
Expected: build PASS; tất cả test PASS (107 + actionLog 3 = 110).

- [ ] **Step 7: Commit**
```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(actionlog): fetch action_log + members, expose recentMoves"
```

---

### Task 4: `ActivityDialog` + nút mở ở PlanScreen

**Files:**
- Create: `app/src/plan/ActivityDialog.tsx`
- Modify: `app/src/plan/PlanScreen.tsx`

- [ ] **Step 1: Tạo `app/src/plan/ActivityDialog.tsx`**

```tsx
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';

export function ActivityDialog({ onClose }: { onClose: () => void }) {
  const { recentMoves, categoryName } = useBudget();

  return (
    <Modal title="Hoạt động gần đây" onClose={onClose}>
      {recentMoves.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Chưa có hoạt động</p>
      ) : (
        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {recentMoves.map((m) => {
            const up = m.newValue >= (m.oldValue ?? 0);
            return (
              <li key={m.id} className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm last:border-0">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{new Date(m.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · </span>
                  <span className="font-medium">{m.userName}</span>
                  <span className="text-muted-foreground"> · {categoryName(m.categoryId)}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${up ? 'text-status-green' : 'text-status-red'}`}>
                  {m.oldValue !== null ? `${formatVnd(m.oldValue)} → ` : ''}{formatVnd(m.newValue)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Thêm nút + dialog vào `app/src/plan/PlanScreen.tsx`.**
(a) Thêm import sau `import { TargetEditorModal } …`:
```tsx
import { ActivityDialog } from './ActivityDialog';
```
(b) Thêm state cạnh `const [modal, setModal] = useState<ModalState>(null);`:
```tsx
  const [showActivity, setShowActivity] = useState(false);
```
(c) Thêm nút vào hàng nút (sau nút `＋ Category`):
```tsx
        <Button variant="outline" size="sm" onClick={() => setShowActivity(true)}>📋 Hoạt động</Button>
```
(d) Thêm render dialog (cạnh các `modal?.type === …`):
```tsx
      {showActivity && <ActivityDialog onClose={() => setShowActivity(false)} />}
```

- [ ] **Step 3: Verify build**

Run: `cd app; npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add app/src/plan/ActivityDialog.tsx app/src/plan/PlanScreen.tsx
git commit -m "feat(actionlog): ActivityDialog 'Hoạt động gần đây' + nút mở"
```

---

### Task 5: Apply migration + verify e2e + merge

**Files:** none

- [ ] **Step 1: Apply `0007_action_log.sql` lên Supabase** (SQL Editor, project WNAP — `[[wnap-supabase-setup]]`). Hoàn tất không lỗi.

- [ ] **Step 2: Build + full test regression**

Run: `cd app; npm run build && npm test -- --run`
Expected: build PASS; tất cả test PASS (110).

- [ ] **Step 3: E2e Playwright**

Chạy `cd app; npm run dev`. Đăng nhập, sang Plan.
- Sửa Assigned 1 category (vd 0→200.000) → mở "📋 Hoạt động" → thấy dòng mới: `[giờ] · [tên] · [category] (cũ) → 200.000`, màu xanh (tăng). Sửa giảm → dòng đỏ.
- (Realtime) Tab 2 sửa assign → mở Dialog tab 1 thấy dòng của tab 2 (live qua refetch).
Expected: dòng đúng người/category/cũ→mới, màu đúng, 0 console error.

- [ ] **Step 4: Merge**
```bash
git checkout main
git merge --no-ff feat/wnap-action-log -m "Merge Action Log (Recent Moves)"
git branch -d feat/wnap-action-log
```

---

## Self-Review (đã thực hiện)

**Spec coverage:** ghi trigger (T2) ✓; chỉ ghi khi đổi/insert≠0 (T2 điều kiện) ✓; fetch+map+expose recentMoves (T1,T3) ✓; live qua realtime refetch (T3, hạ tầng sẵn) ✓; Dialog UI màu delta + empty state (T4) ✓; nút mở Plan (T4) ✓; pure test mapActionLog (T1) ✓; e2e + build (T5) ✓; không đổi engine ✓.
**Placeholder scan:** không có TBD; mọi step có code/lệnh. ✓
**Type consistency:** `RawActionLog/BudgetMember/ActionLogEntry` (T1) dùng đúng ở T3; `mapActionLog(rows, members)` chữ ký khớp; `recentMoves: ActionLogEntry[]` khớp interface→provider→Dialog; select cột khớp `RawActionLog` (id,user_id,entity_ref,old_value,new_value,created_at). ✓
