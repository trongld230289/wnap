# WNAP Realtime Sync (Module D) — Design

**Ngày:** 2026-06-08
**Phạm vi:** Phase 3, sub-project thứ 3. Đồng bộ thời gian thực giữa 2 thiết bị dùng chung 1 budget (2 vợ chồng): thay đổi của người này tự hiện trên máy người kia **≤ 2 giây**, không cần reload. **Không đổi engine/logic mutation — chỉ thêm lớp lắng nghe → refetch.**

**Hướng đã chốt:** **postgres_changes per-table (filter `budget_id`) → debounced `refetch()`** (hướng A). UX khi nhận thay đổi remote: **im lặng**, để Delight Layer làm tín hiệu trực quan (số count-up, sweep… tự chạy cho hành động của partner).

---

## 1. Bối cảnh kiến trúc (vì sao đơn giản)

`BudgetProvider` (`app/src/budget/useBudget.tsx`) đã có **một `refetch()` duy nhất** kéo lại toàn bộ data của budget (8 truy vấn song song) rồi engine tính lại trong `useMemo`. Mọi mutation local đã gọi `refetch()`. Vì vậy realtime chỉ cần: nghe mọi thay đổi DB thuộc budget → gọi `refetch()` (có debounce). Không dùng TanStack Query (spec gốc nhắc nhưng code thực tế là `useState` + `refetch`).

Data hộ gia đình nhỏ → refetch-toàn-bộ rẻ; không cần patch state theo từng row (YAGNI).

## 2. Thành phần

**Module mới `app/src/budget/useRealtime.ts`:**
- Hook `useRealtime(budgetId: string, onChange: () => void)`.
- Tạo **một channel** tên `budget:<budgetId>`.
- Subscribe `postgres_changes` (`event: '*'`, `schema: 'public'`) cho **8 bảng**, mỗi bảng 1 listener với `filter: 'budget_id=eq.<budgetId>'`:
  `category_groups, categories, targets, target_snoozes, assignments, transactions, accounts, payees`.
- Mỗi event bất kỳ → gọi `onChange()` (đã được debounce ở tầng provider — xem dưới).
- `subscribe()` khi mount/`budgetId` đổi; `supabase.removeChannel(channel)` khi cleanup.

**Debounce util mới `app/src/budget/debounce.ts`:**
- `debounce<T extends () => void>(fn: T, ms: number): T & { cancel: () => void }` — trailing debounce, gộp nhiều event sát nhau thành 1 lần gọi. Pure, test được.

**Tích hợp `BudgetProvider`:**
- Tạo `scheduleRefetch = useMemo(() => debounce(refetch, 400), [refetch])`.
- Gọi `useRealtime(budgetId, scheduleRefetch)`.
- Cleanup `scheduleRefetch.cancel()` khi unmount.
- **Không đổi** các mutation: vẫn `await refetch()` ngay sau mỗi mutation (feedback local tức thì). Echo realtime của chính mình rơi vào cửa sổ debounce → không refetch thừa.

## 3. Luồng dữ liệu

```
User B sửa Assigned  ──upsert──▶ Supabase (assignments)
                                    │ postgres_changes (INSERT/UPDATE)
        máy User A ◀───event───────┘
        useRealtime → scheduleRefetch (debounce 400ms)
        → refetch() → engine tính lại (useMemo) → rows đổi
        → Delight Layer tự chạy animation cho thay đổi của B
```

Mục tiêu trễ: event Supabase thường < 1s + debounce 400ms ⇒ ≤ 2s.

## 4. Migration Supabase

`supabase/migrations/0005_realtime.sql` — thêm 8 bảng vào publication realtime, **idempotent** (chỉ add bảng chưa có, tránh lỗi "already member"):
```sql
-- Bật realtime cho các bảng của budget (Module D)
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
- Phải **apply lên Supabase** (như 0004 trước đây). Cũng append vào `supabase/apply_all.sql`.
- RLS sẵn có (0002) → realtime tôn trọng RLS; client chỉ nhận event của budget mình là thành viên. `REPLICA IDENTITY` mặc định đủ (ta chỉ cần biết "có thay đổi", không cần giá trị cũ).
- 8 bảng đều có cột `budget_id` (đã dùng để filter trong `fetchRaw`) → filter `budget_id=eq.<id>` hợp lệ.

## 5. Conflict / edge / error

- **Conflict:** last-write-wins (đúng spec Module D, vốn sẵn qua `upsert onConflict`). 2 người sửa cùng ô Assigned → write sau thắng; cả 2 refetch → hội tụ cùng giá trị. Không khoá, không merge.
- **Echo bản thân:** debounce gộp; chấp nhận 1 refetch thừa nhẹ.
- **Bulk mutation** (vd `applyProposals` upsert nhiều assignment): nhiều event → debounce gộp thành 1 refetch.
- **Mất/khôi phục kết nối:** `supabase-js` tự reconnect channel; khi reconnect, 1 refetch (qua event kế tiếp) sẽ đồng bộ lại. Không cần indicator (đã chọn im lặng).
- **Lỗi subscribe / status `CHANNEL_ERROR`/`TIMED_OUT`:** log cảnh báo, không crash; app vẫn dùng được ở chế độ "refetch khi mutate" như trước.
- **Unmount / đổi budget:** removeChannel + cancel debounce, tránh leak / refetch sau khi unmount.
- **viewMonth:** refetch kéo mọi tháng; engine tính cho `viewMonth` hiện tại. Thay đổi remote ở tháng khác vẫn refetch (rẻ) nhưng chỉ ảnh hưởng hiển thị khi xem tháng đó.

## 6. Ngoài scope (làm sau nếu muốn)
- Indicator online/offline, toast "đã cập nhật".
- Presence (đang xem ai/đang gõ).
- Optimistic patch không refetch (hướng C).
- Action Log (sub-project riêng kế tiếp; realtime sẽ giúp Action Log hiện ngay).

## 7. Testing

- **Vitest (pure):** `debounce.ts` — gọi nhiều lần trong cửa sổ → `fn` chạy đúng 1 lần (dùng fake timers); `cancel()` chặn lần gọi đang chờ. (Vitest có `vi.useFakeTimers()` — chạy được ở node env hiện tại.)
- **Không unit-test** channel Supabase (integration).
- **E2e Playwright (2 browser context):** user A và user B cùng budget (2 test account `wnap.husband` / `wnap.wife`). A sửa Assigned 1 category → trong ≤2s, màn B tự cập nhật số (không reload). Kiểm thêm: A thêm transaction inflow → RTA ở B tăng. Đóng/mở lại để chắc cleanup không lỗi.
- **Regression:** `npm run build` pass; toàn bộ test cũ (104) + debounce test mới xanh.

## 8. Verify hoàn thành
- 2 thiết bị thật trên Supabase: thay đổi 1 bên hiện bên kia ≤2s, không reload; Delight chạy cho thay đổi remote.
- Migration 0005 đã apply; realtime hoạt động (không lỗi publication).
- Build pass, test xanh.

## 9. Ghi chú triển khai
- ⚠️ Type-check thật = `npm run build` (root `tsconfig.json` có `files: []`). KHÔNG `tsc --noEmit`. (Xem [[wnap-phase-status]].)
- Branch `feat/wnap-realtime-sync`, commit nhỏ theo task, verify e2e 2-context, merge `main`, xoá branch.
- `supabase.ts` dùng `createClient` mặc định (realtime bật sẵn) — không cần đổi client config.

Related: `2026-06-07-wnap-design.md` (§5d Family Sync / Action Log), [[wnap-supabase-setup]].
