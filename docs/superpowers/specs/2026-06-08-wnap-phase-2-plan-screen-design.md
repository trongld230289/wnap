# WNAP Phase 2 (Sub-project A): Plan Screen — Design

**Ngày:** 2026-06-08
**Phạm vi:** Module A (Plan Screen) v1 — màn hình ngân sách trung tâm, ráp UI React lên engine thuần đã có (`app/src/engine/`) + dữ liệu Supabase (schema Phase 0). KHÔNG bao gồm Module B (Ledger) — làm sub-project sau.

**Tiền đề đã có:**
- Engine Phase 1 (69 test pass): `computeThrough`, `buildPlanRows`, `categoryStatus`, filters (`isOverspent`/`isUnderfunded`/`isOverfunded`/`isMoneyAvailable`/`isSnoozed`), `needed`/`toGo`, `propose*` (7 nút auto-assign), date helpers. Public API ở `app/src/engine/index.ts`.
- Phase 0: Supabase (auth, RLS, 12 bảng, RPC create/join budget). App gate auth→setup→home. Client ở `app/src/lib/supabase.ts`.

---

## 1. Mục tiêu & phạm vi

### Trong v1
- **Chuyển tháng** (prev/next) — mặc định tháng hiện tại.
- **RTA header** + **popover Assign**: tab Auto (7 nút engine, có preview trước khi áp) và tab Manual (nhập số + chọn category).
- **Bảng nhóm/category**: cột `Category | Assigned | Activity | Available`. Nhóm gập được.
  - **Assigned** sửa tại chỗ (click → input → blur lưu).
  - **Available** hiển thị **thanh tiến độ + số**, màu theo `categoryStatus`.
- **CRUD** category groups + categories (tạo/đổi tên/xóa). Tạo target & sửa cũng từ đây.
- **5 Filter cards** (toggle lọc bảng).
- **Target editor** (modal/popover trên category): strategy / amount / cadence / due; kèm nút **Snooze tháng này**.
- **Move Money (Rule 3)**: click ô Available → modal chọn nguồn/đích + số tiền.

### Để sau (ngoài v1)
- **Module B** (accounts, transactions, 3 balances, reconcile) — vì vậy cột **Activity** và trạng thái **đỏ overspent** trong v1 chỉ phản ánh dữ liệu sẵn có; sẽ đầy đủ khi ráp Module B.
- **Inspector sidebar** (auto-assign theo selection — trùng popover Assign).
- **Action Log** & **realtime sync** 2 vợ chồng → Phase 3.
- **Delight Layer** micro-animation → Phase 3 (cấu trúc bar/status v1 thiết kế sẵn để gắn animation sau).

---

## 2. Luồng dữ liệu: Supabase ↔ engine ↔ React

**Nguyên tắc:** đơn giản-đúng trước, tối ưu sau. Một context React load toàn bộ dữ liệu budget rồi để engine thuần tính mọi số dẫn xuất.

### `BudgetProvider` + `useBudget()`
1. Khi có `budget_id` (từ App gate Phase 0), **fetch song song** toàn bộ:
   - `category_groups`, `categories` (lọc theo budget), `targets`, `target_snoozes`, `assignments`, `transactions`.
2. `mappers.ts` chuyển row Supabase (snake_case, uuid) → kiểu engine (`Category`, `Transaction`, `Assignment`, `Target`, `Snooze`) và gom thành `BudgetInput` (`firstMonth` = tháng nhỏ nhất có dữ liệu, hoặc tháng hiện tại nếu rỗng).
3. State `viewMonth` (Month `'YYYY-MM'`). Dẫn xuất bằng `useMemo`:
   - `summaries = computeThrough(input, viewMonth)`
   - `rows = buildPlanRows(input, summaries, viewMonth)`
   - `rta = summaries.get(viewMonth).rta`
4. **Mutation** = ghi Supabase rồi **refetch + recompute** (chấp nhận round-trip; optimistic update để sau nếu thấy chậm):
   - Sửa assigned → upsert `assignments` (PK `category_id, month`).
   - Move money → 2 upsert `assignments` (giảm nguồn, tăng đích) trong 1 lần.
   - Áp auto-assign → batch upsert `assignments` theo `Proposal[]` (newAssigned tuyệt đối).
   - Set/sửa target → upsert `targets`; Snooze → insert/delete `target_snoozes`.
   - CRUD group/category → insert/update/delete bảng tương ứng (nhớ điền `budget_id` denormalized).

**Lưu ý nhất quán:** mọi insert phải set đúng `budget_id` (schema denormalize — RLS dựa vào nó). Tiền là BIGINT VND số nguyên.

---

## 3. Ngữ nghĩa hiển thị

### Status màu (dùng `categoryStatus(row)` từ engine)
`red` (available<0) · `yellow` (có target chưa đạt) · `green` (target đạt / có tiền) · `gray-snoozed` · `gray`. Map sang màu: đỏ `#d23b3b`, vàng `#caa007`, xanh `#1f9d55`, xám `#999`.

### Thanh Available (component `AvailableBar`)
- Có target: `fill = clamp(available / target.amount, 0..1)`, màu theo status.
- `available < 0` (overspent): thanh đầy màu đỏ, số âm đỏ.
- Không target, `available > 0`: thanh đầy xanh (an toàn để tiêu).
- `available == 0`, không target: thanh rỗng xám.
- Luôn kèm **số chính xác** (định dạng VND, ví dụ `450.000`).

### Filter cards
Đếm = số row khớp predicate engine. Bấm 1 card → lọc bảng chỉ còn row khớp (toggle tắt để xem hết). Đa chọn: tạm thời chỉ 1 filter active 1 lúc (đơn giản v1).

---

## 4. Tách component (mỗi unit 1 việc, test/đọc độc lập được)

| Unit | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `lib/mappers.ts` | Supabase row ↔ engine types; gom `BudgetInput` | engine types |
| `budget/BudgetProvider.tsx` + `useBudget.ts` | fetch + compute + expose rows/rta/mutations | supabase, engine, mappers |
| `budget/format.ts` | format VND, parse input số | — |
| `plan/PlanScreen.tsx` | ghép các phần, giữ state filter & viewMonth | useBudget |
| `plan/MonthNav.tsx` | prev/next tháng | dates |
| `plan/RtaHeader.tsx` + `plan/AssignPopover.tsx` | hiện RTA; popover Auto/Manual, preview, áp | propose*, useBudget |
| `plan/FilterCards.tsx` | 5 thẻ đếm + toggle | filters |
| `plan/CategoryTable.tsx` → `GroupRow` → `CategoryRow` | render nhóm/row, sửa Assigned inline | useBudget |
| `plan/AvailableBar.tsx` | thanh + số + màu | status |
| `plan/MoveMoneyModal.tsx` | chuyển tiền 2 category | useBudget |
| `plan/TargetEditorModal.tsx` | tạo/sửa target + snooze | useBudget |
| `plan/crud/*` | thêm/sửa/xóa group & category | useBudget |

**Responsive:** `CategoryTable` render dạng bảng ở desktop (`≥768px`), dạng card dọc theo nhóm ở mobile (thanh tiến độ mặc định). Cùng dữ liệu `rows`, khác trình bày (CSS/breakpoint, không tách logic).

---

## 5. Kiểm thử

- **Unit (Vitest):** `mappers.ts` (Supabase shape → `BudgetInput` đúng), `format.ts` (VND ↔ số).
- **Engine:** giữ nguyên 69 test, không sửa.
- **End-to-end (Playwright)** như Phase 0, trên dev server thật + Supabase thật:
  1. Tạo group + vài category → hiện trong bảng (gray).
  2. Set target cho category → status chuyển yellow, filter Underfunded đếm đúng.
  3. Assign tay + dùng nút Auto (Underfunded) → RTA giảm, status chuyển green, áp đúng `propose*`.
  4. Move money giữa 2 category → available 2 bên đổi đúng.
  5. Snooze → status gray-snoozed, filter Snoozed bắt đúng.
  6. Chuyển tháng → rollover hiển thị đúng.
- **Styling:** lúc implement dùng skill `frontend-design` để polish; spec này chốt cấu trúc + luồng + ngữ nghĩa, không chốt pixel.

---

## 6. Rủi ro / quyết định mở
- **Overspent đỏ phụ thuộc transactions (Module B):** v1 vẫn tính đúng nếu có transaction trong DB; demo đỏ bằng cách seed/ hoặc chấp nhận đầy đủ khi ráp Module B. Không chặn v1.
- **Refetch-sau-mutation** có thể giật nhẹ với dữ liệu lớn — chấp nhận ở quy mô gia đình; optimistic update là cải tiến sau, không thuộc v1.
- **firstMonth** khi budget rỗng = tháng hiện tại; khi có dữ liệu = tháng nhỏ nhất giữa transaction/assignment sớm nhất.
