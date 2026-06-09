# WNAP — Mobile Responsive + PWA (Design)

**Date:** 2026-06-09
**Status:** Approved (brainstorming)
**Scope:** Một đợt gộp — responsive 375px toàn app + PWA cài được (cache vỏ app).

## 1. Mục tiêu & nguyên tắc

App đang verified **desktop-only**. Mục tiêu đợt này: hiển thị & thao tác tốt ở **375px** (iPhone SE/mini) và **cài được lên màn hình chính** điện thoại.

**Nguyên tắc:**
- Breakpoint ranh giới mobile↔desktop = Tailwind **`sm:` (640px)**. Dưới `sm:` = mobile layout; từ `sm:` trở lên = giữ nguyên desktop hiện tại.
- Chỉ **thêm** class responsive + **thêm** mobile variant. **Không đổi logic** nghiệp vụ: `engine/`, `useBudget`, realtime, delight giữ nguyên → **110 vitest phải vẫn pass**.
- Type-check thật = `npm run build` (KHÔNG dùng `tsc --noEmit`, là no-op — xem memory `wnap-phase-status`).

**Phạm vi file đụng tới:**
- Ledger: `TransactionTable`, `LedgerScreen`, `AccountSidebar`, `BalanceHeader`, `TransactionForm`, `ReconcileModal`, `TransferForm`
- Plan: `CategoryTable`, `PlanScreen`, `RtaHeader`, `FilterCards`, `MonthNav`, `AssignPopover`, `MoveMoneyModal`, `TargetEditorModal`, `ActivityDialog`
- Shell/nav: `App.tsx`, `AppTabs`
- PWA: `vite.config.ts`, `index.html`, `public/` (manifest + icons)

## 2. Ledger card variant (mobile)

`TransactionTable` render 2 cách theo viewport, **dùng chung data + handler** (toggle status, edit, delete — không nhân đôi logic `payeeName`/`toggle`):

- **≥ sm:** giữ nguyên `<table>` 8 cột hiện tại, bọc `hidden sm:block`.
- **< sm:** danh sách card (`sm:hidden`). Mỗi giao dịch = 1 card, tách component con `TransactionCard` trong cùng file:
  - Dòng 1: **Payee** (trái) · **số tiền** (phải) — đỏ outflow / xanh inflow, `tabular-nums`.
  - Dòng 2: ngày `dd/mm` · category (hoặc "⇄ {account}" cho transfer) · icon trạng thái (chạm để toggle clear↔uncleared).
  - Nút Sửa/Xóa nhỏ ở dòng 2: transfer **chỉ có Xóa** (giữ rule hiện tại); reconciled vẫn khóa toggle (giữ `window.alert`).
  - Empty state "Chưa có giao dịch" giữ nguyên cho cả 2 variant.

**Phần còn lại của Ledger:**
- `AccountSidebar`: < sm xếp ngang dạng chips cuộn được; ≥ sm giữ sidebar dọc.
- `BalanceHeader` + `TransactionForm`: < sm xếp dọc full-width.
- `LedgerScreen`: container flex đã có `flex-col`/responsive — kiểm tra và chỉnh để sidebar stack đúng trên mobile.

## 3. Plan screen + modals (mobile)

**CategoryTable (4 cột):** giữ dạng bảng cả 2 viewport, nén để vừa 375px:
- < sm: padding `px-2`, cột số `text-xs tabular-nums`, tên category `truncate`.
- Cột **Activity** ẩn < sm (`hidden sm:table-cell` cho cả `<th>` và `<td>`) → còn 3 cột (Category · Assigned · Available) vừa khít. Group header `colSpan` điều chỉnh tương ứng.
- Giữ `overflow-x-auto` sẵn có làm lưới an toàn.

**PlanScreen:**
- Header `MonthNav` + `RtaHeader`: đã có `flex-col sm:flex-row` — kiểm tra RTA pill không tràn.
- Hàng nút (`＋ Nhóm / ＋ Category / 📋 Hoạt động`): thêm `flex-wrap`.

**FilterCards:** < sm cuộn ngang dạng chips hoặc `grid-cols-2`, đảm bảo chạm được.

**Modals/popover** (`AssignPopover`, `MoveMoneyModal`, `TargetEditorModal`, `ActivityDialog`, `ReconcileModal`, `TransferForm`):
- shadcn Dialog: `max-h-[90dvh] overflow-y-auto`, width `w-[calc(100vw-2rem)] sm:max-w-md` để không tràn mép 375px.
- `AssignPopover` (Auto 7 nút): grid nút xuống `grid-cols-2` < sm.
- Input số tiền: thêm `inputMode="numeric"` để bật bàn phím số mobile.

## 4. Nav

Giữ **tab trên cùng** (`AppTabs`) cho cả mobile & desktop. Chỉ đảm bảo `TabsList` vừa 375px (full-width, không tràn). Không làm bottom nav bar đợt này.

## 5. PWA (cài được + cache vỏ app)

**Tooling:** thêm `vite-plugin-pwa` (devDependency) vào `vite.config.ts`:
- `registerType: 'autoUpdate'`, `injectRegister: 'auto'` (tự đăng ký SW, không sửa `main.tsx`).

**Manifest** (plugin sinh):
- `name`: "WNAP — Ngân sách"; `short_name`: "WNAP".
- `theme_color` / `background_color`: trắng/emerald theo Calm Fintech (lấy từ token `index.css`).
- `display: standalone`, `orientation: portrait`, `lang: vi`, `start_url: /`.
- **Icons:** cần PNG `192x192`, `512x512`, và `512x512` maskable. Hiện chỉ có `public/favicon.svg` → generate PNG từ favicon.svg lúc thực thi (script Node + sharp nếu khả dụng; nếu không, tạo icon tối giản). Cách tạo icon xác nhận khi execute plan.

**Service worker (Workbox qua plugin):**
- Precache toàn bộ app shell (HTML/JS/CSS/fonts/icons hashed) → mở lại nhanh, vào được vỏ app khi offline.
- **KHÔNG** cache request tới Supabase (`runtimeCaching` loại trừ domain Supabase / `NetworkOnly`) → tránh dữ liệu cũ, giữ realtime đúng. **Không offline data** đợt này.

**index.html:** thêm `<meta name="theme-color">`, `apple-mobile-web-app-capable`, `apple-touch-icon`.

## 6. Verify (definition of done)

- `npm run build` pass (typecheck thật) — không lỗi TS.
- `npm test` — **110 vitest vẫn pass** (không đụng logic).
- `npm run preview` → Playwright:
  - Screenshot Plan + Ledger + ít nhất 1 modal ở **375px** không tràn, thao tác được (toggle status card, sửa assigned, mở modal).
  - Manifest hợp lệ + service worker đăng ký thành công; Lighthouse/`beforeinstallprompt` cho thấy "installable".
  - 0 console error.
- Desktop (≥ sm) không regression so với hiện tại.

## 7. Out of scope

- Offline data / mutation queue / conflict resolution (PWA chỉ cache vỏ app).
- Bottom nav bar.
- Code-splitting, dark mode, animation mở rộng (roadmap riêng).
