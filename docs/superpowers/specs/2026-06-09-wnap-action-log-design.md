# WNAP Action Log ("Hoạt động gần đây") — Design

**Ngày:** 2026-06-09
**Phạm vi:** Phase 3, sub-project cuối. Ghi lại minh bạch các lần **phân bổ tiền** (assign / move money / auto-assign) — `[giờ | người | category | cũ→mới]` — và hiển thị trong panel "Hoạt động gần đây", cập nhật **live** qua realtime đã có. **Không đổi engine/logic mutation.**

**Hướng đã chốt:** Ghi bằng **Postgres trigger trên `assignments`** (không phụ thuộc client nhớ ghi). UI là **Dialog** (không phải side-panel trượt). Phạm vi v1: chỉ assignment (không log transaction).

---

## 1. Bối cảnh

- Bảng `action_log` đã có sẵn (0001): `id, budget_id, user_id, action text, entity_ref jsonb, old_value bigint, new_value bigint, created_at`; index `(budget_id, created_at desc)`; RLS member-read (`actionlog_select`, 0002). Chưa có cơ chế ghi.
- Phân bổ tiền ở client là `upsert` thẳng vào `assignments` (`setAssigned`, `moveMoney`, `applyProposals`) — KHÔNG qua RPC. Vậy **một trigger trên `assignments`** bắt được tất cả.
- `budget_members.display_name` có sẵn để map `user_id → tên`.
- Realtime broadcast (Module D) đã trigger trên `assignments` → mọi thay đổi assign đã gây `refetch`. Nếu `refetch` cũng kéo `action_log`, panel tự cập nhật live (kể cả move của partner) — **không cần thêm hạ tầng**.

## 2. Ghi log (DB)

`supabase/migrations/0007_action_log.sql`:
- Hàm trigger `public.log_assignment_change()` (SECURITY DEFINER, `search_path=public`):
  - Chỉ ghi khi `NEW.assigned is distinct from OLD.assigned` (UPDATE) hoặc INSERT có `assigned <> 0` (tránh nhiễu dòng 0→0).
  - `insert into action_log(budget_id, user_id, action, entity_ref, old_value, new_value)` với
    `user_id = auth.uid()`, `action = 'assign'`,
    `entity_ref = jsonb_build_object('category_id', NEW.category_id, 'month', NEW.month)`,
    `old_value = (TG_OP='UPDATE' ? OLD.assigned : null)`, `new_value = NEW.assigned`.
  - `return null` (AFTER trigger).
- Trigger `after insert or update on assignments for each row execute function log_assignment_change()`.
- Apply lên Supabase + append `apply_all.sql`.

**Lưu ý:** Move money = 2 upsert (X giảm, Y tăng) → **2 dòng log** (đúng, minh bạch hai vế). Auto-assign nhiều category → nhiều dòng. Chấp nhận.

## 3. Đọc + live (client)

- `fetchRaw` (hoặc 1 fetch phụ trong provider) thêm:
  - `action_log` gần nhất: `select('id,user_id,action,entity_ref,old_value,new_value,created_at').eq('budget_id',…).order('created_at',{ascending:false}).limit(50)`.
  - `budget_members`: `select('user_id,display_name').eq('budget_id',…)` → map tên.
- Expose qua `useBudget`: `recentMoves: ActionLogEntry[]` (đã map sẵn tên + category name dùng `categoryName`).
- Vì `action_log` được fetch trong cùng `refetch`, và assignment-change đã broadcast→refetch, panel **tự cập nhật live**.
- Type `ActionLogEntry`: `{ id, userName, categoryId, categoryName, month, oldValue, newValue, at }`.

## 4. UI

- Component `app/src/plan/ActivityDialog.tsx` (shadcn Dialog qua `plan/Modal`): tiêu đề "Hoạt động gần đây", danh sách `recentMoves`:
  - Mỗi dòng: `[giờ ngắn] · [userName] · [categoryName]  [oldValue] → [newValue]`.
  - Delta tăng → `text-status-green`, giảm → `text-status-red`; số `tabular-nums`; `formatVnd`.
  - Empty state: "Chưa có hoạt động".
- Nút mở: **"📋 Hoạt động"** trên thanh nút Plan (cạnh ＋ Nhóm / ＋ Category) trong `PlanScreen`.
- Hàm format pure `formatMove(entry) → string` tách riêng để test.

## 5. Edge / error
- INSERT lần đầu assigned=0 → bỏ qua (điều kiện). Set 0→0 (no-op) → `is distinct from` false → bỏ.
- `auth.uid()` null (không nên xảy ra vì mutation cần auth) → user_id null → panel hiện "(?)" cho tên.
- Giới hạn 50 dòng (đủ cho "gần đây"; YAGNI phân trang).
- Múi giờ: hiển thị giờ local từ `created_at` (timestamptz).

## 6. Ngoài scope (sau)
- Log transaction (chi/thu), target/snooze, account.
- Phân loại action chi tiết (assign vs move vs auto) — v1 gộp 'assign'.
- Phân trang / lọc theo người / undo từ log.

## 7. Testing
- **Vitest (pure):** `formatMove` — tăng/giảm, format VND, tên + category; `mapActionLog` (raw rows + members → ActionLogEntry[]).
- **Không unit-test** Dialog/trigger.
- **E2e Playwright:** tự sửa Assigned → mở Dialog thấy dòng mới đúng `cũ→mới` + tên mình; sửa ở tab kia → panel (đang mở/ mở lại) thấy dòng của partner (live qua realtime).
- **Regression:** `npm run build` pass; 107 test cũ + test mới xanh.

## 8. Verify hoàn thành
- Trigger 0007 đã apply; sửa assign sinh đúng dòng log (kiểm trên Supabase + UI).
- Dialog hiển thị đúng, màu delta đúng, live qua realtime.
- Build pass, test xanh.

## 9. Ghi chú triển khai
- ⚠️ Type-check thật = `npm run build` (KHÔNG `tsc --noEmit`). (Xem [[wnap-phase-status]].)
- Branch `feat/wnap-action-log`, commit nhỏ, verify e2e, merge `main`, xoá branch.
- Realtime broadcast trên `assignments` đã có → log live "miễn phí"; không thêm broadcast cho `action_log`.

Related: `2026-06-07-wnap-design.md` (§5d Action Log), [[wnap-realtime-broadcast-gotcha]], [[wnap-supabase-setup]].
