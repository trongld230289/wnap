# WNAP Realtime Sync (Module D) — Design

**Ngày:** 2026-06-08
**Phạm vi:** Phase 3, sub-project thứ 3. Đồng bộ thời gian thực giữa 2 thiết bị dùng chung 1 budget (2 vợ chồng): thay đổi của người này tự hiện trên máy người kia **≤ 2 giây**, không cần reload. **Không đổi engine/logic mutation — chỉ thêm lớp lắng nghe → refetch.**

**Hướng đã chốt (đã sửa sau verify):** **Realtime Broadcast qua trigger DB → private channel → debounced `refetch()`**. UX khi nhận thay đổi remote: **im lặng**, để Delight Layer làm tín hiệu trực quan (số count-up, sweep… tự chạy cho hành động của partner).

> ⚠️ **Đổi hướng so với bản đầu (postgres_changes).** Bản đầu dùng `postgres_changes` per-table + filter `budget_id`. Verify e2e 2-tab cho thấy: channel SUBSCRIBED nhưng **0 event** (cả INSERT lẫn UPDATE, có/không filter). Cô lập bằng `disable row level security` → event chảy ngay ⇒ **root cause: RLS chặn postgres_changes** (auth.uid() không pass trong RLS check dựa WAL; thử cả auto-auth của supabase-js lẫn `setAuth` thủ công đều fail). Chuyển sang **Broadcast** — dùng authorization qua **private channel** (kiểm RLS `realtime.messages` lúc subscribe bằng token user, đường được hỗ trợ) — verify chạy đúng **với RLS bật**.

---

## 1. Bối cảnh kiến trúc (vì sao đơn giản)

`BudgetProvider` (`app/src/budget/useBudget.tsx`) đã có **một `refetch()` duy nhất** kéo lại toàn bộ data của budget (8 truy vấn song song) rồi engine tính lại trong `useMemo`. Mọi mutation local đã gọi `refetch()`. Vì vậy realtime chỉ cần: nghe mọi thay đổi DB thuộc budget → gọi `refetch()` (có debounce). Không dùng TanStack Query (spec gốc nhắc nhưng code thực tế là `useState` + `refetch`).

Data hộ gia đình nhỏ → refetch-toàn-bộ rẻ; không cần patch state theo từng row (YAGNI).

## 2. Thành phần

**Module mới `app/src/budget/useRealtime.ts`:**
- Hook `useRealtime(budgetId: string, onChange: () => void)`.
- Tạo **một private channel** `supabase.channel('budget:<budgetId>', { config: { private: true } })`.
- Lắng nghe `channel.on('broadcast', { event: 'db_change' }, () => onChange())`.
- Trước `subscribe()`: lấy session token và `supabase.realtime.setAuth(token)` (private channel cần token để authorization).
- Mỗi broadcast → `onChange()` (đã debounce ở tầng provider). `removeChannel` khi cleanup; cờ `cancelled` tránh subscribe sau unmount (getSession async).
- Broadcast đến từ **trigger DB trên 8 bảng** (xem §4), không cần client liệt kê bảng.

**Debounce util mới `app/src/budget/debounce.ts`:**
- `debounce<T extends () => void>(fn: T, ms: number): T & { cancel: () => void }` — trailing debounce, gộp nhiều event sát nhau thành 1 lần gọi. Pure, test được.

**Tích hợp `BudgetProvider`:**
- Tạo `scheduleRefetch = useMemo(() => debounce(refetch, 400), [refetch])`.
- Gọi `useRealtime(budgetId, scheduleRefetch)`.
- Cleanup `scheduleRefetch.cancel()` khi unmount.
- **Không đổi** các mutation: vẫn `await refetch()` ngay sau mỗi mutation (feedback local tức thì). Echo realtime của chính mình rơi vào cửa sổ debounce → không refetch thừa.

## 3. Luồng dữ liệu

```
User B sửa Assigned ──upsert──▶ Supabase (assignments)
                                   │ AFTER trigger broadcast_budget_change
                                   │ realtime.broadcast_changes('budget:<id>','db_change',…)
        máy User A ◀──broadcast───┘ (private channel, authorize qua realtime.messages RLS)
        useRealtime → scheduleRefetch (debounce 400ms)
        → refetch() → engine tính lại (useMemo) → rows đổi
        → Delight Layer tự chạy animation cho thay đổi của B
```

Mục tiêu trễ: broadcast thường < 1s + debounce 400ms ⇒ ≤ 2s. (Verify thực tế ~tức thì.)

## 4. Migration Supabase

`supabase/migrations/0005_realtime.sql` — thêm 8 bảng vào publication realtime, **idempotent** (chỉ add bảng chưa có, tránh lỗi "already member"):
```sql
-- (0005 — KHÔNG dùng cho broadcast, giữ lại vô hại) publication idempotent…
```
- **`0005_realtime.sql`** (thêm 8 bảng vào publication `supabase_realtime`) là di sản của hướng postgres_changes — **không cần cho broadcast**, đã apply nên giữ lại vô hại.

**`supabase/migrations/0006_broadcast.sql`** — hướng broadcast thực dùng, gồm:
1. **Authorization policy** trên `realtime.messages`: budget member được `select` (nhận) broadcast khi `realtime.topic()` khớp `budget:<budget_id>` của mình:
   ```sql
   create policy "budget members receive broadcast" on realtime.messages
   for select to authenticated using (
     realtime.topic() like 'budget:%'
     and public.is_budget_member( split_part(realtime.topic(), ':', 2)::uuid )
   );
   ```
2. **Hàm trigger** `public.broadcast_budget_change()` (SECURITY DEFINER): lấy `budget_id` từ NEW/OLD theo `tg_op`, gọi `realtime.broadcast_changes('budget:'||bid, 'db_change', tg_op, tg_table_name, tg_table_schema, new, old)`.
3. **Trigger** `after insert or update or delete … for each row` trên **8 bảng** (loop idempotent: drop-then-create).
- Phải **apply lên Supabase** (như các migration trước). Cũng append vào `supabase/apply_all.sql`.
- RLS sẵn có (0002) không đổi; broadcast được authorize qua policy `realtime.messages` ở trên. Trigger có sẵn NEW/OLD đầy đủ → **không cần REPLICA IDENTITY FULL**.

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

## 8. Verify hoàn thành ✅ (đã verify e2e)
- 2 tab (2 client realtime) cùng budget, **RLS bật**: tab A sửa Assigned → tab B nhận `broadcast db_change` + UI tự cập nhật **không reload** (log `[RT] broadcast UPDATE assignments`, ~tức thì). Private channel `SUBSCRIBED` (authorization pass).
- Migration `0006_broadcast.sql` đã apply lên Supabase.
- Build pass, 107 test xanh.

## 9. Ghi chú triển khai
- ⚠️ Type-check thật = `npm run build` (root `tsconfig.json` có `files: []`). KHÔNG `tsc --noEmit`. (Xem [[wnap-phase-status]].)
- Branch `feat/wnap-realtime-sync`, commit nhỏ theo task, verify e2e 2-context, merge `main`, xoá branch.
- `supabase.ts` dùng `createClient` mặc định (realtime bật sẵn) — không cần đổi client config.

Related: `2026-06-07-wnap-design.md` (§5d Family Sync / Action Log), [[wnap-supabase-setup]].
