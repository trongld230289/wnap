# WNAP — Song ngữ VI/EN (i18n) — Design

Ngày: 2026-06-10
Trạng thái: Approved (brainstorming)

## Mục tiêu

Cho phép người dùng chuyển toàn bộ giao diện WNAP giữa **Tiếng Việt** và **English** bằng một nút cờ tròn trên header. Đổi tức thì, không reload. Mặc định Tiếng Việt.

## Phạm vi

- Dịch **tất cả** chuỗi giao diện hướng tới người dùng, **kể cả thuật ngữ tài chính kiểu YNAB** (Overspent, Underfunded, Overfunded, Money Available, Ready to Assign, Set aside, Refill up to, Have balance by, Snooze…).
  - VI ví dụ: Vượt chi / Thiếu hụt / Dư thừa / Tiền sẵn có / Sẵn sàng phân bổ / Gom đều / Bơm đầy tới / Đạt số dư trước hạn / Tạm hoãn.
- Bao gồm cả màn **Auth** và **Setup** (trước khi vào budget).
- **Không** đổi: định dạng tiền VND (`formatVnd`) và ngày (MM/YYYY, DD/MM) — trung tính ngôn ngữ, giữ nguyên.
- **Không** dịch dữ liệu người dùng nhập (tên category, payee, tài khoản, memo…).

## Cách làm: custom nhẹ, không thêm dependency

Theo triết lý dự án (đã từng tránh thêm dep ở Delight Layer). Không dùng i18next.

### Module `app/src/i18n/`

**`dict.ts`** — 2 từ điển `vi` và `en`, key phẳng nhóm theo tiền tố:
```ts
export const dict = {
  vi: { 'nav.plan': 'Kế hoạch', 'plan.overspent': 'Vượt chi', /* … */ },
  en: { 'nav.plan': 'Plan',     'plan.overspent': 'Overspent', /* … */ },
} as const;
export type Lang = keyof typeof dict;      // 'vi' | 'en'
export type TKey = keyof typeof dict['vi'];
```

**`translate.ts`** (thuần, test được) — hàm `translate(lang, key, vars?)`:
- Tra `dict[lang][key]`.
- Fallback: nếu thiếu ở `lang` → thử `dict.vi[key]` → cuối cùng trả chính `key` (để lộ chỗ sót khi dev).
- Chèn biến: thay `{name}` trong chuỗi bằng `vars.name`. Biến thiếu giữ nguyên `{name}`.

**`useI18n.tsx`** — `I18nProvider` + hook `useI18n()`:
- State `lang`, khởi tạo từ `localStorage['wnap.lang']` (fallback `'vi'`).
- `setLang(l)` → cập nhật state + ghi localStorage + set `document.documentElement.lang`.
- `t(key, vars?)` = `translate(lang, key, vars)`.
- Trả `{ lang, setLang, t }`.
- Provider đặt **ngoài cùng** trong `App` (bọc cả AuthPage/SetupPage).

### `i18n/LangSwitch.tsx` — nút cờ tròn

- **1 nút tròn** (`rounded-full overflow-hidden`, viền mảnh `border`), kích thước ~`size-7`, đặt **bên phải `UserMenu`** trên header.
- Hiện lá cờ của **ngôn ngữ đang dùng**: VI → cờ Việt Nam, EN → cờ Anh (Union Jack).
- Bấm → `setLang(lang === 'vi' ? 'en' : 'vi')` (đổi ngay).
- `title` + `aria-label` động: "Chuyển sang English" / "Đổi sang Tiếng Việt".
- **Cờ bằng SVG inline** (không emoji — Windows hiện emoji cờ thành chữ "VN"/"GB"). 2 component SVG nhỏ `FlagVN`, `FlagGB` trong cùng file, `object-cover` lấp tròn.

## Bóc tách chuỗi (phần việc lớn nhất)

Thay chuỗi hard-code → `t('…')` ở các vùng (gom để làm/build theo đợt):

1. **Shell + nav**: `App.tsx`, `nav/AppTabs.tsx`, `UserMenu.tsx`, `InviteDialog.tsx`, `DialogProvider.tsx` (nhãn nút mặc định Hủy/OK…).
2. **Auth/Setup**: `pages/AuthPage.tsx`, `pages/SetupPage.tsx`.
3. **Plan**: `RtaHeader`, `FilterCards` (+ `planFilters` nhãn), `CategoryTable`, `MonthNav`, `MoveMoneyModal`, `TargetEditorModal`, `ActivityDialog`, `AssignPopover`.
4. **Ledger**: `LedgerScreen`, `AccountSidebar`, `AddAccountDialog`, `BalanceHeader`, `TransactionTable`, `TransactionForm`, `TransferForm`, `ReconcileModal`.

Nhãn filter/strategy/cadence hiện là dữ liệu (vd trong `planFilters.ts`, `TargetEditorModal`): chuyển sang key i18n, render bằng `t()` tại component (không hard-code trong file data).

Tên tháng ("Tháng 06/2026" vs "Jun 2026"): VI giữ "Tháng MM/YYYY"; EN dùng "MMM YYYY" (mảng tên tháng tiếng Anh trong dict hoặc `toLocaleDateString('en')`). Quy ước: `MonthNav` gọi `t('plan.monthLabel', { month, year })` cho VI và format riêng cho EN qua nhánh `lang`.

## Test

- **`translate.test.ts`** (thuần): key có sẵn trả đúng; key thiếu ở `en` fallback về `vi`; key thiếu hẳn trả chính key; chèn biến `{n}`; biến thiếu giữ `{n}`.
- **`dict.parity.test.ts`**: tập key của `vi` === tập key của `en` (không sót/dư) — chặn lỗi quên dịch.
- Build (`npm run build`) pass; kiểm mắt VI↔EN trên Plan + Ledger.

## Không làm (YAGNI)

- Không lazy-load namespace, không plural rules, không thư viện format số/ngày theo locale.
- Không thêm ngôn ngữ thứ 3.
- Không dịch dữ liệu người dùng.

## Rủi ro / lưu ý

- App `tsc --noEmit` là no-op → **type-check thật bằng `npm run build`**.
- Số lượng chuỗi nhiều (~80–120) → plan chia 4 đợt theo vùng ở trên, build sau mỗi đợt.
- `dict` dùng `as const` để `TKey` chặt; nếu khó vì số lượng key, chấp nhận `Record<string,string>` + test parity bù.
