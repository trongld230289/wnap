# WNAP Module B: Account Ledger — Design

**Ngày:** 2026-06-08
**Phạm vi:** Module B (Ledger) — sổ giao dịch thực tế. Sub-project cuối của Phase 2, ráp lên engine + Plan screen đã có. Khi có transaction thật, cột **Activity** và trạng thái **đỏ overspent** trên Plan screen (Module A) mới đầy đủ.

**Tiền đề đã có:**
- Engine Phase 1: `computeThrough` đã xử lý transactions (inflow vào system category → RTA; outflow có category → activity; giao dịch `category_id = null` bị bỏ qua trong budget math).
- Module A (Plan screen) xong & merged; data layer `useBudget` (`app/src/budget/useBudget.tsx`) là nguồn sự thật chung, đã fetch transactions.
- Schema Phase 0 đã có bảng `accounts`, `transactions`, `payees` (xem `supabase/migrations/0001_schema.sql`).

---

## 1. Mục tiêu & phạm vi

### Trong v1
- **Sidebar accounts** nhóm CASH / SAVINGS + view **All Accounts** (tổng hợp); tạo account mới.
- **Bảng giao dịch**: status icon · Ngày · Payee · Category (kèm "còn …" available) · Memo · Outflow · Inflow.
- **Nhập / sửa / xóa** transaction. Nhập kiểu **lai**: dòng inline trên desktop, modal trên mobile.
- **3 balances**: Cleared / Uncleared / Working (`Working = Cleared + Uncleared`).
- **Toggle trạng thái** uncleared ↔ cleared bằng click icon.
- **Reconciliation**: nút Đối soát → so số dư ngân hàng với Cleared → khóa cleared→reconciled (`reconciled_at`); cảnh báo soft-lock khi sửa giao dịch reconciled; hiện "Đối soát X ngày trước".
- **Payee autocomplete**: gợi ý từ payees đã dùng, tự tạo payee mới khi gõ tên lạ.
- **Transfer giữa 2 account**: ghi 2 transaction liên kết, `category_id = null` (không đụng budget).

### Ngoài v1 (Phase 3)
- Polish UI + Delight Layer animations (design skills).
- Payee rename/merge, account đóng/ẩn nâng cao, lọc/tìm/sắp xếp giao dịch, đính kèm.

---

## 2. Điều hướng & màn hình
- Thêm **tab bar trên cùng** (`nav/AppTabs`): `Kế hoạch (Plan)` | `Sổ giao dịch (Ledger)`. State `tab` ở `App.tsx` (trong `BudgetProvider`).
- **Ledger desktop**: `AccountSidebar` (trái, ~180px) + vùng chính (`BalanceHeader` + `TransactionTable`).
- **Mobile**: sidebar thu thành dropdown chọn account ở đầu; nhập giao dịch qua modal.
- Account đang chọn lưu ở state `selectedAccountId | 'all'` trong `LedgerScreen`.

---

## 3. Dữ liệu — tái dùng + 1 migration

Bảng có sẵn (Phase 0): `accounts(id,budget_id,name,type cash|savings,reconciled_at,sort_order,closed)`, `transactions(id,budget_id,account_id,date,payee_id,category_id,memo,amount,status uncleared|cleared|reconciled,created_by,...)`, `payees(id,budget_id,name)`.

**Migration `supabase/migrations/0004_transfer.sql`:** thêm cột `transfer_id uuid` (nullable) trên `transactions` để liên kết 2 dòng của 1 transfer. Không phá dữ liệu cũ.

**Quy ước số tiền:** `amount` BIGINT VND, **âm = outflow, dương = inflow** (nhất quán engine). Form tách ô Outflow/Inflow nhưng lưu 1 field `amount` có dấu.

**Transfer:** 2 transaction cùng `transfer_id`, `category_id = null`:
- account nguồn: `amount = -X` (outflow), payee hiển thị "Chuyển → {tên account đích}".
- account đích: `amount = +X` (inflow), payee "Nhận từ {tên account nguồn}".
- Vì `category_id = null` → engine bỏ qua trong budget math (không đổi RTA/activity). Sửa/xóa 1 dòng transfer áp dụng cho cả cặp (qua `transfer_id`).

---

## 4. Kiến trúc data layer

Mở rộng **`useBudget`** (nguồn sự thật chung), KHÔNG tạo context tách rời — để thêm/sửa giao dịch ở Ledger tự khiến Plan screen recompute (Activity/RTA/đỏ).

- Thêm vào fetch: `accounts` (lọc `closed = false`, order `sort_order`). Expose `accounts: {id,name,type,reconciledAt}[]`.
- Expose `transactions` thô đã map (id, accountId, date, payeeId, categoryId, memo, amount, status, transferId) cho Ledger render (Plan chỉ cần activity tổng nên đã có).
- **Mutations** (mỗi cái: ghi Supabase rồi `refetch`):
  - `addTransaction(t)` / `updateTransaction(id, patch)` / `deleteTransaction(id)`.
  - `addAccount(name, type)`.
  - `addTransfer(fromAccId, toAccId, amount, date)` — sinh `transfer_id`, insert cặp.
  - `setTxStatus(id, 'cleared' | 'uncleared')` — chỉ áp khi status hiện chưa `reconciled`.
  - `reconcileAccount(accId)` — update mọi tx `status='cleared'` của account → `reconciled`; set `accounts.reconciled_at = now()`.
  - `upsertPayee(name) → payeeId` — tìm payee theo tên (case-insensitive) trong budget, không có thì insert; trả id.
- **Pure helpers (Vitest):**
  - `ledger/ledgerBalances.ts` → `balances(txs)` = `{cleared, uncleared, working}`; `cleared` = Σ amount của tx `status ∈ {cleared, reconciled}`, `uncleared` = Σ amount tx `status = uncleared`, `working = cleared + uncleared`. Lọc theo account hoặc toàn bộ (All Accounts).
  - `ledger/ledgerGroups.ts` → nhóm accounts theo `type` (cash/savings) + tính số dư working mỗi account để hiện ở sidebar.

---

## 5. Tách component (mỗi unit 1 việc)

| Unit | Trách nhiệm |
|---|---|
| `nav/AppTabs.tsx` | tab Plan / Ledger |
| `ledger/LedgerScreen.tsx` | ghép sidebar + header + table; giữ `selectedAccountId` |
| `ledger/AccountSidebar.tsx` | nhóm CASH/SAVINGS + All Accounts + thêm account; số dư mỗi account |
| `ledger/BalanceHeader.tsx` | Cleared/Uncleared/Working + tên account + "Đối soát X ngày trước" + nút Đối soát |
| `ledger/TransactionTable.tsx` → `TransactionRow.tsx` | render giao dịch; click icon đổi trạng thái; sửa/xóa |
| `ledger/TransactionForm.tsx` | form thêm/sửa (dùng inline ở desktop, trong `Modal` ở mobile) |
| `ledger/PayeeInput.tsx` | input + autocomplete payee |
| `ledger/CategoryPicker.tsx` | chọn category, hiện "còn …" (available từ rows) |
| `ledger/ReconcileModal.tsx` | nhập số dư ngân hàng, xác nhận đối soát |
| `ledger/TransferForm.tsx` | tạo transfer giữa 2 account |
| pure: `ledger/ledgerBalances.ts`, `ledger/ledgerGroups.ts` | tính balance & nhóm account |

Tái dùng `Modal.tsx`, `format.ts` (formatVnd/parseVnd/formatMonth) của Module A.

---

## 6. Reconciliation & soft-lock
- **Đối soát:** `BalanceHeader` → nút mở `ReconcileModal` → nhập số dư thực ở ngân hàng → hiện chênh lệch so với Cleared (chỉ cảnh báo, không chặn) → "Xác nhận đối soát" → `reconcileAccount`: cleared→reconciled + `reconciled_at`.
- **Soft-lock:** mở sửa giao dịch `status = 'reconciled'` → modal cảnh báo *"Giao dịch đã đối soát, sửa có thể làm lệch số dư ngân hàng. Tiếp tục?"* → đồng ý mới cho sửa.
- **History signal:** `BalanceHeader` hiện "Đối soát N ngày trước" từ `reconciled_at` (rỗng → "Chưa đối soát").
- **Status icon:** uncleared = ○, cleared = C (xanh), reconciled = 🔒. Click ○/C đổi qua lại (`setTxStatus`); 🔒 không click đổi trực tiếp (phải qua reconcile/soft-lock).

---

## 7. Kiểm thử
- **Unit (Vitest):** `ledgerBalances` (cleared gồm cả reconciled; uncleared; working; tổng hợp All Accounts; transfer không lọt vào budget nhưng có trong balance account), `ledgerGroups` (nhóm cash/savings + số dư).
- **Engine:** giữ nguyên 87 test (không sửa).
- **E2E Playwright (Supabase thật):**
  1. Tạo account "Vietcombank" (cash).
  2. Nhập **inflow** category "Inflow: Ready to Assign" 15tr → sang tab **Plan** thấy **RTA tăng 15tr**.
  3. Nhập **outflow** category "Điện" 400k → Plan: Điện **Activity −400k**, available giảm; nếu vượt → **đỏ overspent**.
  4. **Transfer** Vietcombank → Sổ tiết kiệm 2tr → 2 dòng đối ứng, budget không đổi.
  5. Toggle ○→C; **Reconcile** → cleared thành 🔒; sửa dòng 🔒 → hiện cảnh báo soft-lock.
- **Styling:** polish để Phase 3 (frontend-design / ui-ux-pro-max). Spec này chốt cấu trúc/luồng/ngữ nghĩa.

---

## 8. Rủi ro / quyết định mở
- **Transfer model bằng `transfer_id`** đủ cho v1 (sửa/xóa theo cặp); không hỗ trợ transfer xuyên budget (ngoài phạm vi).
- **Refetch-sau-mutation** chấp nhận ở quy mô gia đình (như Module A); optimistic update để sau.
- **All Accounts không cho nhập trực tiếp** (phải chọn 1 account để thêm giao dịch) — đơn giản hóa v1.
- Plan để tách thành nhiều plan nhỏ (vd: accounts+txn+balances → reconcile+transfer) khi writing-plans.
