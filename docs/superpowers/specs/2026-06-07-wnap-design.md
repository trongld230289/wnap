# WNAP — Design Document

**Ngày:** 2026-06-07
**Trạng thái:** Đã duyệt thiết kế qua brainstorming, chờ implementation plan
**Nguồn requirements:** `wnap/Plan/` và `wnap/knowledge-based/`

WNAP là bản rút gọn của YNAB cho gia đình 2 người (vợ chồng) tự dùng: zero-based budgeting với Target Engine đầy đủ, đồng bộ real-time giữa 2 thiết bị.

---

## 1. Các quyết định đã chốt

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Family Sync (Module D) | **Giữ** | 2 vợ chồng cùng dùng chung 1 budget |
| Nền tảng | **Web app responsive (PWA-ready)** trước, mobile app sau | 1 codebase, dùng được cả desktop lẫn điện thoại |
| Target Engine | **Full spec**: Weekly / Monthly / Yearly / Custom + 3 strategies | Giữ tính năng mạnh nhất của YNAB (Rule 2) |
| Month Rollover | **Chuẩn YNAB**: Available dương carry-over; Available âm reset về 0 và trừ vào RTA tháng sau | Budget luôn khớp tiền thật |
| Tiền tệ | **Chỉ VND**, lưu số nguyên (BIGINT), format `1.500.000 đ` | Đơn giản, không cần decimal/minor unit |
| Stack | **React + Vite + TypeScript + Supabase** (Option 1) | Solo dev; Supabase lo auth/realtime/DB để tập trung vào math engine |
| Reports (Reflect) | **Out of scope** | Theo `module-E-draft.md` |
| Bank sync, credit card logic | **Out of scope** | App rút gọn; account chỉ có CASH và SAVINGS |

---

## 2. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────┐
│  React SPA (Vite + TypeScript, PWA-ready)   │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Plan     │ │ Ledger   │ │ Settings/   │  │
│  │ Screen   │ │ Screen   │ │ Share       │  │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       └────────────┼──────────────┘         │
│  ┌─────────────────▼──────────────────────┐ │
│  │  Budget Math Engine (pure TS module)   │ │
│  │  RTA · Rollover · Target · Auto-Assign │ │
│  └─────────────────┬──────────────────────┘ │
└────────────────────┼────────────────────────┘
                     │ supabase-js + TanStack Query
┌────────────────────▼────────────────────────┐
│  Supabase                                   │
│  • PostgreSQL (data + RLS theo budget)      │
│  • Auth (email) + invite code               │
│  • Realtime (postgres_changes → sync 2 user)│
│  • RPC functions (move money, cover         │
│    overspending — atomic)                   │
└─────────────────────────────────────────────┘
```

### Nguyên tắc then chốt

1. **Math Engine là pure TypeScript module** (`budget-engine/`), không import UI/Supabase. Nhận input thô (transactions, assignments, targets), trả output (Available, RTA, To Go, màu trạng thái, danh sách auto-assign). Được TDD kỹ nhất toàn dự án.
2. **DB chỉ lưu sự kiện gốc** — transactions, assignments theo tháng, target config. Mọi số liệu dẫn xuất (Available, RTA, màu) **tính lại ở client**, không lưu xuống DB. Loại bỏ hoàn toàn lỗi lệch số liệu khi 2 user cùng sửa.
3. **Mutation nhiều bước phải atomic** — Move Money và Cover Overspending chạy qua Postgres RPC function (1 DB transaction), không bao giờ "tiền rời nguồn mà không tới đích".
4. **Last-write-wins** cho xung đột đồng thời (đúng spec Module D), Action Log ghi lại cả hai lần ghi để minh bạch.

---

## 3. Data Model (PostgreSQL)

```
budgets          (id, name, created_by, created_at)
budget_members   (budget_id, user_id, display_name, joined_at)
                 PK (budget_id, user_id)

accounts         (id, budget_id, name, type: cash|savings,
                  reconciled_at, sort_order)

category_groups  (id, budget_id, name, sort_order)
categories       (id, group_id, name, sort_order,
                  kind: bill|need|saving|other,    ← phục vụ Priority Stack
                  icon TEXT NULL,                  ← key animation/emoji cho Delight Layer
                  is_system: bool)                 ← "Inflow: Ready to Assign"

targets          (id, category_id UNIQUE, 
                  strategy: set_aside|refill|have_balance,
                  amount BIGINT,
                  cadence: weekly|monthly|yearly|custom,
                  due_day SMALLINT NULL,           ← 1–31 hoặc NULL = cuối tháng
                  due_weekday SMALLINT NULL,       ← cho weekly (0–6)
                  due_date DATE NULL,              ← cho yearly/custom deadline
                  created_at)
target_snoozes   (category_id, month CHAR(7))      ← 'YYYY-MM', PK cặp

payees           (id, budget_id, name)

transactions     (id, account_id, date DATE, payee_id NULL,
                  category_id NULL,                ← NULL khi chưa categorize
                  memo TEXT,
                  amount BIGINT,                   ← VND nguyên; âm = outflow, dương = inflow
                  status: uncleared|cleared|reconciled,
                  created_by, created_at, updated_at)

assignments      (category_id, month CHAR(7), assigned BIGINT,
                  updated_by, updated_at)
                 PK (category_id, month)           ← trái tim của YNAB

action_log       (id, budget_id, user_id, action TEXT,
                  entity_ref JSONB, old_value BIGINT, new_value BIGINT,
                  created_at)
```

### Ghi chú thiết kế

- **`assignments` theo `(category_id, month)`**: "Assigned tháng 6" độc lập "Assigned tháng 7" — đúng cấu trúc YNAB. Available không lưu mà tính từ chuỗi assignments + transactions.
- **`categories.kind`**: spec gốc thiếu metadata này; bắt buộc phải có để Priority Stack của Partial Fill phân biệt được Bills / Essential Needs / Savings.
- **Inflow**: giao dịch inflow categorize vào category hệ thống "Inflow: Ready to Assign" (`is_system = true`, mỗi budget tạo sẵn 1 cái) → cộng thẳng vào RTA, đúng spec Module A §1.
- **Số dư ban đầu**: khi tạo account, nhập số dư hiện có → hệ thống tự tạo 1 transaction "Starting Balance" (payee hệ thống, category = "Inflow: Ready to Assign", status = cleared) → tiền sẵn có đi vào RTA để được phân bổ như tiền lương.
- **RLS**: mọi bảng kiểm tra budget thuộc `budget_members` của user đang đăng nhập. 2 vợ chồng thấy chung toàn bộ, người ngoài không thấy gì. Cả hai đều có quyền "Administrator" như nhau (spec Module D §3).
- **Tiền**: BIGINT VND. Không có số thập phân ở bất kỳ đâu.

---

## 4. Math Engine

Module `budget-engine/` — pure functions, tính đệ quy theo tháng từ tháng đầu tiên của budget.

### 4a. Công thức lõi

```
Activity(cat, N)  = Σ amount của transactions thuộc cat trong tháng N

Available(cat, N) = max(Available(cat, N−1), 0)     ← số âm KHÔNG carry
                    + Assigned(cat, N)
                    + Activity(cat, N)

RTA(N) = RTA(N−1)
         + Σ inflow vào "Inflow: Ready to Assign" trong tháng N
         − Σ Assigned(N) (mọi category)
         + Σ min(Available(cat, N−1), 0)            ← overspent tháng trước trừ vào RTA
```

Overspent cuối tháng N−1 → đầu tháng N category đó về 0 và RTA giảm tương ứng (chuẩn YNAB Rule: budget luôn khớp tiền thật).

### 4b. Target → `needed(cat, N)` ("tháng này cần bao nhiêu")

| Strategy / Cadence | Công thức needed tháng N |
|---|---|
| **Set Aside Another** (accumulative) | `amount` — chỉ so với Assigned tháng này, bỏ qua số dư cũ |
| **Refill Up To** (maintenance) | `max(0, amount − Available đầu tháng N)` — số dư cuối tháng trước chỉ được tính từ ngày 1 tháng sau (spec Module C §2) |
| **Have a Balance Of** (goal theo deadline) | `(amount − Available hiện tại) / số tháng còn lại đến due_date` — tự redistribute khi hụt tháng trước (Rule 2, spec Module C §3) |
| **Weekly** | `amount × số lần due_weekday xuất hiện trong tháng N` |
| **Yearly / Custom** | quy về công thức Have a Balance Of với deadline = due_date |
| **Snoozed (tháng N)** | `0` — phần thiếu dồn vào các tháng còn lại, deadline giữ nguyên |

```
ToGo(cat, N) = needed(cat, N) − Assigned(cat, N)     (spec Module C §3)
```

### 4c. Trạng thái màu (ưu tiên từ trên xuống)

| Màu | Điều kiện |
|---|---|
| 🔴 Red (Overspent) | `Available < 0` |
| ⚪ Gray (Snoozed) | target bị snooze tháng này (badge "Snoozed") |
| 🟡 Yellow (Underfunded) | có target và `ToGo > 0` |
| 🟢 Green (Funded/Available) | đạt target, hoặc không target mà `Available > 0` |
| ⚪ Gray (Neutral) | `Available = 0`, không target |

### 4d. Auto-Assign

Mỗi button là 1 pure function trả về danh sách đề xuất `{categoryId, amount}` — UI hiển thị preview, user xác nhận rồi mới ghi vào `assignments`.

| Button | Logic |
|---|---|
| **Underfunded** | Fill `ToGo` của các category Yellow/Red. Khi RTA không đủ → **Priority Stack**: ① Red (overspent) → ② Bills theo due date gần nhất → ③ `kind = need` → ④ `kind = saving`. Hết RTA thì dừng, category còn lại giữ Yellow |
| **Assigned Last Month** | Copy `Assigned(cat, N−1)` |
| **Spent Last Month** | `−Activity(cat, N−1)` (chi tiêu thực tháng trước) |
| **Average Assigned** | Trung bình Assigned 12 tháng gần nhất (hoặc từ đầu budget nếu < 12) |
| **Average Spent** | Trung bình chi tiêu 12 tháng gần nhất |
| **Reset Available Amounts** | Đưa toàn bộ Available dương của selection về RTA |
| **Reset Assigned Amounts** | `Assigned(cat, N) = 0` cho selection |

Phạm vi áp dụng: không chọn gì = toàn bộ budget; có filter card active = chỉ category đang hiển thị ("Filtered Mode", spec add-on §1); có checkbox chọn = chỉ category được chọn (Inspector, spec Module A §3).

### 4e. Filter Cards (5 cái — spec Module A §4)

| Card | Điều kiện lọc |
|---|---|
| Overspent | `Available < 0` |
| Underfunded | có target, `ToGo > 0`, không snooze |
| Overfunded | `Available > needed` lũy kế (tiền vượt yêu cầu target / vượt cap Refill Up To) |
| Money Available | `Available > 0` |
| Snoozed | có snooze tháng hiện tại |

---

## 5. Màn hình & luồng chính

### 5a. Plan Screen (Module A)

- **RTA Header** (xanh lá, nổi bật) + nút Assign mở pop-over 2 tab: **Auto** (7 button trên) / **Manually** (nhập số + chọn category).
- **Bảng category**: nhóm theo category_groups; cột Assigned (edit trực tiếp inline) · Activity · Available (pill màu).
- **Inspector sidebar** (phải): context theo selection — không chọn gì = tổng cần fund toàn budget; chọn category = tổng cần fund của selection; panel Auto-Assign + cấu hình Target của category đang chọn.
- **Move Money modal**: click vào Available pill bất kỳ → modal "Move" (nguồn → đích, mặc định full số dư, search được, hiện balance từng đích, RTA luôn ở đầu danh sách). Available âm → modal "Cover overspending from" (chỉ hiện nguồn có số dư dương + RTA, auto-điền đúng số tiền đưa về 0, có chọn tháng).
- **Không chặn** việc move làm vỡ target — category chỉ chuyển Yellow, không có warning modal (Zero-Footprint, spec add-on §5).
- **Snooze**: toggle trên target của category, hiệu lực theo tháng.

### 5b. Ledger Screen (Module B)

- Sidebar trái: nhóm CASH / SAVINGS + "All Accounts".
- Bảng transaction: Date · Payee · Category · Memo · Outflow · Inflow · status icon.
- Khi chọn category cho outflow: dropdown hiển thị Available bên phải tên category (chỉ tham khảo — **không validate**, user tự xử lý ở Plan screen qua filter Overspent; spec Module B §2).
- **Triple balance** header: Cleared / Uncleared / Working (= Cleared + Uncleared).
- Status icon: vòng tròn rỗng (Uncleared) ↔ chữ C xanh (Cleared) — click để toggle; khóa xanh (Reconciled) — không toggle được.
- **Transaction mới nhập tay mặc định Uncleared** (sửa mâu thuẫn spec cũ — xem §8).
- **Reconcile**: nhập số dư bank → so với Cleared Balance → khớp thì toàn bộ cleared chuyển Reconciled (lock). Sửa transaction đã reconciled → warning modal "may cause mismatch, proceed?" (Soft Lock). Hiện "Reconciled X days ago" cạnh tên account.

### 5c. Delight Layer (micro-animations)

WNAP khác YNAB gốc ở chỗ: mỗi hành động tài chính có **animation phản hồi vui** để duy trì thói quen nhập liệu — yếu tố sống còn của zero-based budgeting.

| Hành động | Animation |
|---|---|
| Inflow (nạp tiền / nhận lương) | Đồng xu rơi vào ống heo 🐷 |
| Outflow (chi tiêu) | Animation theo `categories.icon` (phở bốc khói, ly cà phê, cây xăng...) |
| Assign tiền vào category | Tiền "chảy" từ RTA header vào hũ category |
| Cover overspending | Dập lửa 🔥 → 💧, pill chuyển Red → Gray/Green |
| Đạt target (Yellow → Green) | Confetti nhỏ / hũ đầy phát sáng |
| Reconcile khớp số dư | Dấu khóa đóng lại + checkmark |

- **Tech**: Lottie (lottie-react) cho animation có sẵn + Framer Motion cho transition/layout. Không đụng math engine — Delight Layer chỉ lắng nghe kết quả mutation.
- **Nguyên tắc**: animation ≤ 1.5 giây, không chặn thao tác tiếp theo, có setting tắt được (prefers-reduced-motion).
- `categories.icon`: user chọn icon khi tạo category; icon quyết định animation chi tiêu tương ứng; có bộ mặc định theo `kind`.

### 5d. Family Sync (Module D)

- **Invite flow**: chủ budget tạo invite code trong Settings → người kia đăng ký tài khoản + nhập code → thành `budget_member`. Quyền ngang nhau.
- **Realtime**: mỗi budget 1 Supabase channel, subscribe `postgres_changes` trên `transactions / assignments / targets / categories / category_groups` → TanStack Query invalidate → refetch → engine tính lại. Độ trễ mục tiêu ≤ 2 giây.
- **Action Log**: Postgres **trigger** trên `assignments` (insert/update) và bên trong các RPC (move money, cover overspending) tự ghi `[timestamp | user | action | old → new]` — không phụ thuộc client nhớ ghi. UI: side-panel "Recent Moves".

---

## 6. Edge cases & xử lý lỗi

- **Ngày tháng**: `date` lưu `YYYY-MM-DD`, tháng lưu `'YYYY-MM'` — so sánh chuỗi, không timezone math.
- **Due day 29–31**: tháng không có ngày đó → dùng ngày cuối tháng.
- **Offline**: v1 yêu cầu online; mất mạng → banner cảnh báo, disable mutation. (Offline queue để dành bản mobile.)
- **Xóa category còn tiền/transaction**: bắt buộc chọn category đích để dồn Available + re-categorize transactions trước khi xóa.
- **Xóa account**: chỉ cho phép đóng (closed), không xóa cứng — giữ lịch sử transaction.
- **2 user sửa cùng 1 ô Assigned**: last-write-wins, cả 2 lần đều có trong Action Log.
- **Số tiền**: input chỉ nhận số nguyên dương; outflow/inflow là 2 field tách biệt (đúng UI YNAB).

---

## 7. Testing

- **Math engine (trọng tâm)**: TDD bằng Vitest. Test case lấy thẳng từ scenario trong `knowledge-based/` và `module-A-smart-addOn.md`:
  - Rollover: dương carry, âm reset + trừ RTA tháng sau
  - Set Aside Another vs Refill Up To với số dư cũ (ví dụ $500 có sẵn, target $100)
  - Rule 2 redistribute: hụt tháng trước → tháng sau tăng đúng công thức
  - Snooze: needed = 0, nợ dồn về sau
  - Partial Fill: RTA 500/cần 1000 → đúng thứ tự Priority Stack, dừng khi RTA = 0
  - Weekly target × số tuần trong tháng
- **RPC**: integration test cho move money / cover overspending (atomic, log đúng).
- **RLS**: test user ngoài budget không đọc/ghi được.
- **UI**: smoke test luồng chính; UAT thủ công theo `ynap-all-use-case.md` (9 situations).

---

## 8. Sửa đổi so với spec gốc trong `wnap/Plan/`

1. **`module-A-B.md` §3** ghi "Cleared Balance: default state for new transactions" — **mâu thuẫn** với icon workflow ngay dưới. Chốt: transaction mới nhập tay mặc định **Uncleared**.
2. **Đánh số module thống nhất**: A = Plan Screen, B = Ledger, C = Target Engine, D = Family Sync. `overall-plan.md` còn ghi roadmap theo đánh số cũ (Module D = Auto-Assignment đã gộp vào A, Phase 3 còn nhắc Module E) — đọc theo doc này.
3. **Bổ sung `categories.kind`** (bill/need/saving/other) — spec gốc mô tả Priority Stack nhưng thiếu dữ liệu để phân loại.
4. **Bổ sung toàn bộ logic Month Rollover** (§4a) — spec gốc chưa định nghĩa.

---

## 9. Roadmap thực thi

| Phase | Nội dung | Deliverable |
|---|---|---|
| **0** | Setup: Vite + React + TS, Supabase project, schema + RLS, Auth, tạo budget + invite code | Đăng nhập được, 2 user vào chung 1 budget rỗng |
| **1** | **Math Engine** (TDD, pure TS): rollover, RTA, 3 target strategies × 4 cadence, snooze, auto-assign, filter, priority stack | `budget-engine/` pass toàn bộ test, chưa có UI |
| **2** | Ledger (Module B): CRUD account/payee/transaction, triple balance, status toggle, reconcile | Nhập chi tiêu thật hàng ngày được |
| **3** | Plan Screen (Module A + add-on): RTA header, bảng category, inline assign, Inspector, 5 filter cards, Move Money, Cover Overspending, Target config UI, Snooze + **Delight Layer** (animation §5c) | Dùng được đầy đủ chu trình YNAB 1 người, có animation |
| **4** | Sync polish (Module D): realtime subscription, Action Log UI, invite flow hoàn chỉnh, PWA manifest, responsive mobile | 2 vợ chồng dùng song song trên 2 thiết bị |

Mỗi phase dùng được thật trước khi sang phase sau (Phase 2 xong là bắt đầu nhập liệu thật được ngay).

---

## 10. Out of scope (v1)

- Reports / Reflect (module-E-draft đã xác nhận chưa cần)
- Bank sync / import file
- Credit card logic (account chỉ có cash & savings)
- Multi-currency
- Offline mode
- Mobile native app (sẽ làm sau khi web ổn định)
- Phân quyền chi tiết (cả 2 user đều admin)
- Chat-style transaction entry (gõ "ăn phở 50k" → tự parse) — backlog v2, sau khi app chạy ổn
