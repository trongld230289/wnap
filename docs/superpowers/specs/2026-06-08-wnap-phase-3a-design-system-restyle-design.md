# WNAP Phase 3A: Design System + Restyle — Design

**Ngày:** 2026-06-08
**Phạm vi:** Phase 3, sub-project đầu — dựng nền design (Tailwind + shadcn/ui + design tokens) và **restyle toàn bộ giao diện** từ inline-style trần sang giao diện đẹp, đồng bộ. **CHỈ đổi trình bày — không đổi logic/engine/data flow.** Delight Layer animations, dark mode, realtime, Action Log = các sub-project Phase 3 sau.

**Vibe đã chốt:** *Calm Fintech* — trắng sạch, accent emerald, font Inter, tối giản, tin cậy.

**Tiền đề:** Phase 2 hoàn chỉnh & merged (Module A Plan + Module B Ledger chạy thật). UI hiện 100% inline-style. Engine 94 test pass.

---

## 1. Mục tiêu & ràng buộc

### Trong scope
- Cài **Tailwind CSS** (Vite plugin) + **shadcn/ui**; định nghĩa **design tokens** (màu/font/spacing/radius/shadow).
- Restyle **mọi màn**: `AuthPage`, `SetupPage`, App shell (header + tabs), `PlanScreen` + con (RtaHeader, FilterCards, CategoryTable/Row, AvailableBar), các modal Plan (AssignPopover, MoveMoneyModal, TargetEditorModal), `LedgerScreen` + con (AccountSidebar, BalanceHeader, TransactionTable/Row, TransactionForm), các modal Ledger (ReconcileModal, TransferForm), `Modal` wrapper.
- **Responsive** desktop + mobile (Plan bảng→card dọc; Ledger sidebar→dropdown ở mobile).

### Ràng buộc cứng
- **Không đổi hành vi/logic.** `useBudget`, engine, mappers, các hàm thuần (`ledgerBalances`, `barFill`, `planFilters`, `autoAssign`, `format`) giữ NGUYÊN. Chỉ thay markup + className + primitive trình bày.
- `npm test` (94) và `npx tsc --noEmit` phải giữ xanh sau mỗi bước.
- Giữ API/props của component khi thay primitive (vd `Modal` → shadcn Dialog nhưng signature `{title,onClose,children}` giữ nguyên để nơi gọi không đổi).

### Ngoài scope (Phase 3 sau)
- Delight Layer micro-animations (heo đất, hiệu ứng outflow…).
- Dark mode, realtime sync, Action Log.

---

## 2. Design tokens (Calm Fintech)

- **Primary:** emerald `#0f9d60` (và thang sáng/tối cho hover/active).
- **Neutral:** nền trắng `#ffffff`, surface `#f7f8fa`, border `#e6e8eb`, text `#1a2230` / muted `#6b7280`.
- **Status (giữ nghĩa engine):** red `#d23b3b` (overspent), yellow/amber `#d9a400` (underfunded), green = primary (funded), gray `#9aa0a6` (neutral/snoozed).
- **Typography:** Inter (Google Fonts hoặc `@fontsource`); số dùng `tabular-nums`.
- **Radius:** `rounded-xl` chủ đạo; **shadow:** nhẹ (`shadow-sm`/`shadow`).
- Token khai báo ở Tailwind theme + CSS variables trong `index.css` để đổi 1 chỗ áp toàn app. Status colors expose cho cả AvailableBar, FilterCards, TransactionTable dùng chung (thay map hex rải rác hiện tại).

---

## 3. Nền kỹ thuật

- **Tailwind CSS v4** qua `@tailwindcss/vite` plugin; `index.css` `@import "tailwindcss"` + khai báo theme tokens.
- **shadcn/ui:** `components.json` + alias `@/` (cấu hình `vite.config.ts` + `tsconfig` paths). Thêm component dùng tới: **Button, Dialog, Input, Select, Table, Tabs, Card, Badge, Label, Tooltip, Sonner (toast)**. Các file shadcn sinh ra ở `app/src/components/ui/`.
- **Thay primitive tự chế:**
  - `plan/Modal.tsx` → bọc shadcn **Dialog** (giữ props `{title,onClose,children}`).
  - `nav/AppTabs.tsx` → shadcn **Tabs** (giữ props `{tab,onChange}`).
  - Nút/input/select inline khắp nơi → **Button/Input/Select**.
  - Pill status / filter cards → **Badge/Card**.
- **Toast** (Sonner) thay vài `window.alert/confirm` ở chỗ hợp lý (không bắt buộc đổi hết; soft-lock vẫn có thể giữ confirm).

---

## 4. Kiến trúc khi restyle (giữ logic)

- Component "thông minh" (`PlanScreen`, `LedgerScreen`, modal, `useBudget`) giữ data flow; chỉ đổi phần render.
- Map status → màu **gom về 1 chỗ** (vd `app/src/ui/statusColor.ts` hoặc Tailwind classes) để `AvailableBar`/`FilterCards`/`TransactionRow` dùng chung, bỏ hex rải rác.
- Tách row trình bày nếu file phình: vd `CategoryTable` tách `CategoryRow.tsx`, `TransactionTable` tách `TransactionRow.tsx` — chỉ khi giúp gọn, không bắt buộc.
- **Responsive:** dùng Tailwind breakpoints. Plan: `md:` hiện bảng, dưới `md` hiện card dọc theo nhóm (AvailableBar đầy đủ). Ledger: `md:` sidebar trái; dưới `md` đổi sidebar thành `Select` chọn account ở đầu.

---

## 5. Tách công việc (mỗi plan ra phần nhìn được)

1. **Plan 3A-1 — Nền + shell + Auth/Setup:** cài Tailwind + shadcn, tokens, `index.css`, `components.json`, alias; restyle `AuthPage`, `SetupPage`, App header + Tabs, `Modal` wrapper → Dialog. Kết quả: vào app thấy theme mới, đăng nhập/setup đẹp.
2. **Plan 3A-2 — Plan screen:** restyle RtaHeader, FilterCards, CategoryTable/Row, AvailableBar, AssignPopover, MoveMoneyModal, TargetEditorModal + responsive.
3. **Plan 3A-3 — Ledger:** restyle AccountSidebar, BalanceHeader, TransactionTable/Row, TransactionForm, ReconcileModal, TransferForm + responsive.

(Mỗi plan tự chạy + verify được; làm tuần tự.)

---

## 6. Kiểm thử / verify
- **Đổi trình bày → logic test giữ nguyên:** `npm test` 94 pass, `npx tsc --noEmit` exit 0 sau mỗi plan.
- **Build:** `npm run build` pass (Tailwind/shadcn config đúng).
- **Verify hình ảnh (Playwright):** chụp screenshot từng màn ở **2 viewport** (desktop ~1280, mobile ~390) so sánh; click thử luồng chính (đăng nhập, assign, nhập giao dịch, mở modal) để chắc hành vi không vỡ.
- **Craft chi tiết** dùng skill `frontend-design` / `ui-ux-pro-max` lúc implement.

---

## 7. Rủi ro / quyết định mở
- Thay `Modal`/`AppTabs`/nút inline đụng nhiều import → giữ API cũ, đổi nội bộ; làm theo plan nhỏ.
- Tailwind v4 + shadcn cần cấu hình alias `@/` đúng ở `vite.config.ts` + `tsconfig.app.json` (paths). Plan 3A-1 lo việc này, verify bằng build.
- shadcn dùng `class-variance-authority`/`tailwind-merge`/`lucide-react` (deps mới) — chấp nhận.
- Khối lượng lớn → nghiêm túc giữ "chỉ trình bày", không nhân tiện đổi logic (tránh vỡ test).
