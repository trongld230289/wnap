# Realtime Sync (Module D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ thời gian thực giữa 2 thiết bị dùng chung budget — thay đổi của người này hiện trên máy người kia ≤2s, không reload.

**Architecture:** Realtime Broadcast — trigger DB phát `db_change` tới topic `budget:<id>`; client subscribe **private channel** (authorize qua RLS `realtime.messages`); mỗi broadcast → `refetch()` đã **debounce 400ms** ở `BudgetProvider`. Tận dụng `refetch()` + engine recompute sẵn có; không đổi logic mutation. `debounce` là pure, test bằng vitest fake timers.

> ⚠️ **PIVOT (đã thực thi & verify):** Plan ban đầu (Task 2/4 dưới) dùng `postgres_changes` + publication (`0005`). Verify e2e cho thấy postgres_changes **bị RLS chặn** (0 event dù SUBSCRIBED; xác nhận bằng cách disable RLS → event chảy). Đã chuyển sang **Broadcast**: `useRealtime` dùng private broadcast channel; migration **`0006_broadcast.sql`** (trigger 8 bảng + policy `realtime.messages`) thay vai trò của `0005`. Task 2 và Task 4 đọc theo bản broadcast trong spec `2026-06-08-wnap-realtime-sync-design.md` §2/§4. Task 1 (debounce), Task 3 (wiring `BudgetProvider`), Task 0/5 (branch/verify/merge) **giữ nguyên**.

**Tech Stack:** React 19 + TypeScript, `@supabase/supabase-js` realtime (đã có), Postgres publication migration.

**Lưu ý chung:**
- Mọi lệnh chạy trong `app/`. Type-check thật = `npm run build` (KHÔNG `tsc --noEmit`). Test: `npm test -- --run <path>`.
- Branch: `feat/wnap-realtime-sync`. Commit nhỏ theo task.
- File data layer: `app/src/budget/useBudget.tsx` (đã có `refetch`, `BudgetProvider`, đã import `useMemo`).

---

### Task 0: Tạo branch

- [ ] **Step 1: Tạo branch từ main**

Run:
```bash
git checkout main && git checkout -b feat/wnap-realtime-sync
```
Expected: `Switched to a new branch 'feat/wnap-realtime-sync'`

---

### Task 1: `debounce` util (TDD)

**Files:**
- Create: `app/src/budget/debounce.ts`
- Test: `app/src/budget/__tests__/debounce.test.ts`

- [ ] **Step 1: Viết test thất bại `app/src/budget/__tests__/debounce.test.ts`**

```ts
import { expect, test, vi } from 'vitest';
import { debounce } from '../debounce';

test('gộp nhiều lần gọi trong cửa sổ thành 1', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); d(); d();
  expect(n).toBe(0);
  vi.advanceTimersByTime(399);
  expect(n).toBe(0);
  vi.advanceTimersByTime(1);
  expect(n).toBe(1);
  vi.useRealTimers();
});

test('gọi lại sau khi đã chạy → chạy thêm lần nữa', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); vi.advanceTimersByTime(400);
  expect(n).toBe(1);
  d(); vi.advanceTimersByTime(400);
  expect(n).toBe(2);
  vi.useRealTimers();
});

test('cancel chặn lần đang chờ', () => {
  vi.useFakeTimers();
  let n = 0;
  const d = debounce(() => { n++; }, 400);
  d(); d.cancel();
  vi.advanceTimersByTime(400);
  expect(n).toBe(0);
  vi.useRealTimers();
});
```

- [ ] **Step 2: Chạy test xác nhận FAIL**

Run: `cd app; npm test -- --run src/budget/__tests__/debounce.test.ts`
Expected: FAIL — `Failed to resolve import "../debounce"`.

- [ ] **Step 3: Viết `app/src/budget/debounce.ts`**

```ts
/** Trailing debounce: gộp các lần gọi sát nhau thành 1; có cancel(). */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; fn(...args); }, ms);
  }) as T & { cancel: () => void };
  wrapped.cancel = () => {
    if (timer) { clearTimeout(timer); timer = undefined; }
  };
  return wrapped;
}
```

- [ ] **Step 4: Chạy test xác nhận PASS**

Run: `cd app; npm test -- --run src/budget/__tests__/debounce.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app/src/budget/debounce.ts app/src/budget/__tests__/debounce.test.ts
git commit -m "feat(realtime): debounce util (trailing + cancel)"
```

---

### Task 2: `useRealtime` hook

**Files:**
- Create: `app/src/budget/useRealtime.ts`

- [ ] **Step 1: Viết `app/src/budget/useRealtime.ts`**

```ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABLES = [
  'category_groups', 'categories', 'targets', 'target_snoozes',
  'assignments', 'transactions', 'accounts', 'payees',
] as const;

/**
 * Lắng nghe mọi thay đổi DB thuộc budget (8 bảng, filter budget_id) → gọi onChange.
 * onChange nên đã được debounce ở nơi gọi (BudgetProvider) để gộp event.
 */
export function useRealtime(budgetId: string, onChange: () => void): void {
  useEffect(() => {
    const channel = supabase.channel(`budget:${budgetId}`);
    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `budget_id=eq.${budgetId}` },
        () => onChange(),
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [budgetId, onChange]);
}
```

- [ ] **Step 2: Verify build**

Run: `cd app; npm run build`
Expected: PASS (chỉ cảnh báo chunk-size có sẵn). Nếu TS báo lỗi overload `postgres_changes`, KHÔNG đổi cấu trúc — kiểm tra lại object truyền vào đúng `{ event: '*', schema: 'public', table, filter }`. Đây là overload hợp lệ của supabase-js v2.

- [ ] **Step 3: Commit**

```bash
git add app/src/budget/useRealtime.ts
git commit -m "feat(realtime): useRealtime channel subscription (8 tables)"
```

---

### Task 3: Tích hợp vào `BudgetProvider`

**Files:**
- Modify: `app/src/budget/useBudget.tsx`

- [ ] **Step 1: Thêm 2 import**

Trong `app/src/budget/useBudget.tsx`, ngay sau dòng `import { supabase } from '../lib/supabase';` (dòng 2), thêm:
```tsx
import { useRealtime } from './useRealtime';
import { debounce } from './debounce';
```

- [ ] **Step 2: Gắn realtime sau effect refetch ban đầu**

Tìm đoạn (khoảng dòng 112):
```tsx
  useEffect(() => { refetch(); }, [refetch]);
```
Thêm NGAY SAU đoạn đó:
```tsx

  const scheduleRefetch = useMemo(() => debounce(() => { void refetch(); }, 400), [refetch]);
  useRealtime(budgetId, scheduleRefetch);
  useEffect(() => () => scheduleRefetch.cancel(), [scheduleRefetch]);
```
(`useMemo` đã được import sẵn ở đầu file. Không sửa bất kỳ mutation nào — chúng vẫn gọi `await refetch()` trực tiếp.)

- [ ] **Step 3: Verify build + test regression**

Run: `cd app; npm run build && npm test -- --run`
Expected: build PASS; toàn bộ test PASS (104 cũ + debounce 3 = 107).

- [ ] **Step 4: Commit**

```bash
git add app/src/budget/useBudget.tsx
git commit -m "feat(realtime): wire useRealtime + debounced refetch in BudgetProvider"
```

---

### Task 4: Migration bật realtime publication

**Files:**
- Create: `supabase/migrations/0005_realtime.sql`
- Modify: `supabase/apply_all.sql` (append nội dung migration)

- [ ] **Step 1: Tạo `supabase/migrations/0005_realtime.sql`**

```sql
-- 0005_realtime.sql — Bật realtime cho các bảng của budget (Module D)
-- Idempotent: chỉ add bảng chưa có trong publication.
do $$
declare t text;
begin
  foreach t in array array[
    'category_groups','categories','targets','target_snoozes',
    'assignments','transactions','accounts','payees'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```

- [ ] **Step 2: Append cùng nội dung vào cuối `supabase/apply_all.sql`**

Mở `supabase/apply_all.sql`, thêm vào CUỐI file một dòng phân tách và toàn bộ nội dung của `0005_realtime.sql` ở Step 1 (giữ nguyên các migration cũ phía trên):
```sql

-- ===== 0005_realtime.sql =====
do $$
declare t text;
begin
  foreach t in array array[
    'category_groups','categories','targets','target_snoozes',
    'assignments','transactions','accounts','payees'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```

- [ ] **Step 3: Commit (apply lên Supabase ở Task 5)**

```bash
git add supabase/migrations/0005_realtime.sql supabase/apply_all.sql
git commit -m "feat(realtime): 0005 publication migration (8 tables, idempotent)"
```

---

### Task 5: Apply migration + verify e2e 2 thiết bị + regression

**Files:** none (kiểm chứng)

- [ ] **Step 1: Apply migration lên Supabase**

Chạy nội dung `supabase/migrations/0005_realtime.sql` trong Supabase SQL Editor (project WNAP — xem `[[wnap-supabase-setup]]`). Hoàn tất không lỗi.
Verify đã vào publication (chạy trong SQL Editor):
```sql
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
order by tablename;
```
Expected: liệt kê đủ 8 bảng `accounts, assignments, categories, category_groups, payees, target_snoozes, targets, transactions`.

- [ ] **Step 2: Build + full test regression**

Run: `cd app; npm run build && npm test -- --run`
Expected: build PASS; toàn bộ test PASS (107).

- [ ] **Step 3: E2e 2 browser context (Playwright)**

Chạy dev (`cd app; npm run dev`). Mở 2 context độc lập (2 storage state):
- Context A đăng nhập `wnap.husband@gmail.com`, Context B đăng nhập `wnap.wife@gmail.com` (cùng budget). Cả 2 ở tab Kế hoạch, cùng tháng.
- Ở A: sửa Assigned 1 category (vd +200.000). Trong **≤2s**, màn B tự cập nhật số Assigned/Available + RTA (KHÔNG reload), và Delight chạy cho thay đổi đó.
- Ở B: thêm 1 giao dịch inflow vào "Ready to Assign". Trong ≤2s, RTA ở A tăng.
- Đóng 1 tab rồi thao tác tiếp ở tab kia → không lỗi console, không refetch sau unmount.
Expected: đồng bộ 2 chiều ≤2s, 0 console error.

- [ ] **Step 4: Merge vào main**

```bash
git checkout main
git merge --no-ff feat/wnap-realtime-sync -m "Merge Realtime sync (Module D)"
git branch -d feat/wnap-realtime-sync
```

---

## Self-Review (đã thực hiện khi viết plan)

**Spec coverage:**
- §2 useRealtime (8 bảng, filter budget_id, 1 channel) → T2. ✓
- §2 debounce util pure + tích hợp scheduleRefetch 400ms + cancel → T1, T3. ✓
- §2 không đổi mutation (vẫn await refetch) → T3 chỉ thêm dòng, không sửa mutation. ✓
- §4 migration 0005 idempotent + apply_all + apply lên Supabase + verify publication → T4, T5(Step1). ✓
- §5 conflict last-write-wins → vốn sẵn (upsert), không cần code mới. ✓
- §5 cleanup unmount (removeChannel + cancel) → T2 return cleanup + T3 cancel effect. ✓
- §7 test debounce (fake timers) + e2e 2-context + regression → T1, T5. ✓

**Placeholder scan:** không có TBD/TODO; mọi step có code/lệnh cụ thể. ✓
**Type consistency:** `debounce` trả `T & { cancel }`; `scheduleRefetch` dùng đúng (gọi như `() => void` cho `useRealtime`, `.cancel()` trong effect). `useRealtime(budgetId, onChange)` khớp chữ ký. `TABLES` 8 bảng khớp migration. ✓
