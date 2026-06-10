# WNAP Song ngữ VI/EN (i18n) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép chuyển toàn bộ UI WNAP giữa Tiếng Việt và English bằng nút cờ tròn trên header, đổi tức thì, mặc định Tiếng Việt.

**Architecture:** Module i18n custom nhẹ (không thêm dependency): từ điển phẳng `vi`/`en`, hàm thuần `translate()`, provider `useI18n` lưu `localStorage['wnap.lang']`, nút `LangSwitch` cờ SVG. Mọi component dùng `t('key')` thay chuỗi hard-code.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind v4, Vitest. Không thêm thư viện mới.

**Lưu ý type-check:** `tsc --noEmit` trong `app/` là no-op. Type-check thật = `npm run build`. Mọi lệnh chạy trong thư mục `D:\Project\Finance-Tracker\app`.

---

## File Structure

- Create `app/src/i18n/translate.ts` — hàm thuần tra cứu + chèn biến + fallback.
- Create `app/src/i18n/dict.ts` — 2 từ điển `vi`/`en` + types `Lang`, `TKey`.
- Create `app/src/i18n/useI18n.tsx` — `I18nProvider` + hook `useI18n()`.
- Create `app/src/i18n/LangSwitch.tsx` — nút cờ tròn + `FlagVN`/`FlagGB` SVG.
- Create `app/src/i18n/__tests__/translate.test.ts`, `app/src/i18n/__tests__/dict.parity.test.ts`.
- Modify `app/src/App.tsx` — bọc `I18nProvider`, thêm `LangSwitch`, dịch chuỗi loading.
- Modify các component UI để dùng `t()` (Task 7–10).

---

## Task 1: Hàm thuần `translate()` (TDD)

**Files:**
- Create: `app/src/i18n/translate.ts`
- Test: `app/src/i18n/__tests__/translate.test.ts`

- [ ] **Step 1: Viết test fail**

```ts
// app/src/i18n/__tests__/translate.test.ts
import { describe, it, expect } from 'vitest';
import { translate } from '../translate';

const d = {
  vi: { greet: 'Chào {name}', only: 'Chỉ VI' },
  en: { greet: 'Hi {name}' },
} as unknown as Parameters<typeof translate>[0];

describe('translate', () => {
  it('trả đúng chuỗi theo lang', () => {
    expect(translate(d, 'en', 'greet', { name: 'A' })).toBe('Hi A');
  });
  it('chèn biến', () => {
    expect(translate(d, 'vi', 'greet', { name: 'Bố' })).toBe('Chào Bố');
  });
  it('thiếu key ở en → fallback vi', () => {
    expect(translate(d, 'en', 'only')).toBe('Chỉ VI');
  });
  it('thiếu hẳn → trả chính key', () => {
    expect(translate(d, 'en', 'missing')).toBe('missing');
  });
  it('biến thiếu giữ nguyên placeholder', () => {
    expect(translate(d, 'en', 'greet')).toBe('Hi {name}');
  });
});
```

- [ ] **Step 2: Chạy test, kỳ vọng FAIL**

Run: `npm test -- translate`
Expected: FAIL ("Cannot find module '../translate'").

- [ ] **Step 3: Viết `translate.ts`**

```ts
// app/src/i18n/translate.ts
type Dict = Record<string, Record<string, string>>;

export function translate(
  dict: Dict,
  lang: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = dict[lang]?.[key] ?? dict.vi?.[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
```

- [ ] **Step 4: Chạy test, kỳ vọng PASS**

Run: `npm test -- translate`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/i18n/translate.ts app/src/i18n/__tests__/translate.test.ts
git commit -m "feat(i18n): pure translate() with fallback + interpolation"
```

---

## Task 2: Từ điển `dict.ts` (VI/EN đầy đủ)

**Files:**
- Create: `app/src/i18n/dict.ts`

Đây là bảng dịch trung tâm. Key phẳng, tiền tố theo vùng. Đây là nội dung khởi tạo — Task 7–10 có thể thêm key mới phát sinh khi bóc tách, **luôn thêm cả `vi` và `en`**.

- [ ] **Step 1: Tạo `dict.ts`**

```ts
// app/src/i18n/dict.ts
export const dict = {
  vi: {
    // common
    'common.cancel': 'Hủy',
    'common.ok': 'OK',
    'common.save': 'Lưu',
    'common.confirm': 'Đồng ý',
    'common.add': 'Thêm',
    'common.loading': 'Đang tải…',
    // auth
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu (≥6 ký tự)',
    'auth.signIn': 'Đăng nhập',
    'auth.signUp': 'Đăng ký',
    'auth.toSignUp': 'Chưa có tài khoản? Đăng ký',
    'auth.toSignIn': 'Đã có tài khoản? Đăng nhập',
    // setup
    'setup.title': 'Thiết lập WNAP',
    'setup.displayName': 'Tên hiển thị của bạn',
    'setup.createNew': 'Tạo budget mới',
    'setup.budgetName': 'Tên ngân sách',
    'setup.createBtn': 'Tạo budget',
    'setup.orJoin': 'Hoặc join bằng invite code',
    'setup.codePlaceholder': 'Mã 6 ký tự',
    'setup.joinBtn': 'Join budget',
    // nav
    'nav.plan': 'Kế hoạch',
    'nav.ledger': 'Sổ giao dịch',
    // user menu
    'menu.account': 'Menu tài khoản',
    'menu.invite': 'Mời thành viên',
    'menu.motion': 'Hiệu ứng chuyển động',
    'menu.on': 'Bật',
    'menu.off': 'Tắt',
    'menu.signOut': 'Đăng xuất',
    // invite
    'invite.title': 'Mời thành viên',
    'invite.desc': 'Gửi mã này cho người nhà. Mỗi mã dùng một lần cho một người.',
    'invite.copyHint': 'Bấm để copy',
    'invite.copied': 'Đã chép',
    'invite.copy': 'Copy',
    'invite.step1': 'Người nhà mở app, đăng ký tài khoản.',
    'invite.step2': 'Ở màn thiết lập, nhập mã vào ô "join bằng invite code".',
    'invite.step3': 'Bấm Join budget là vào chung ngân sách.',
    'invite.regen': 'Tạo mã khác',
    'invite.copyErr': 'Không copy được — hãy chép tay mã bên trên.',
    // plan
    'plan.loading': 'Đang tải ngân sách…',
    'plan.addGroup': '＋ Nhóm',
    'plan.addCategory': '＋ Category',
    'plan.activity': '📋 Hoạt động',
    'plan.newGroup': 'Nhóm mới',
    'plan.groupName': 'Tên nhóm',
    'plan.groupPlaceholder': 'vd Chi phí cố định',
    'plan.create': 'Tạo',
    'plan.newCategory': 'Category mới',
    'plan.categoryName': 'Tên category',
    'plan.categoryPlaceholder': 'vd Tiền điện',
    'plan.noGroupTitle': 'Chưa có nhóm',
    'plan.noGroupDesc': 'Tạo nhóm trước đã rồi mới thêm category.',
    'plan.monthLabel': 'Tháng {month}/{year}',
    // filters
    'filter.overspent': 'Vượt chi',
    'filter.underfunded': 'Thiếu hụt',
    'filter.overfunded': 'Dư thừa',
    'filter.moneyAvailable': 'Tiền sẵn có',
    'filter.snoozed': 'Tạm hoãn',
    // category table headers
    'col.category': 'DANH MỤC',
    'col.assigned': 'ĐÃ PHÂN BỔ',
    'col.activity': 'HOẠT ĐỘNG',
    'col.available': 'CÒN LẠI',
    // rta
    'rta.ready': 'Sẵn sàng phân bổ',
    'rta.assign': '+ Phân bổ',
    // move money
    'move.title': 'Chuyển tiền',
    'move.from': 'Từ',
    'move.to': 'Đến',
    'move.has': 'có',
    'move.amount': 'Số tiền',
    'move.submit': 'Chuyển',
    'move.errAmount': 'Nhập số tiền > 0',
    'move.errTo': 'Chọn category đích',
    // target editor
    'target.title': 'Mục tiêu · {name}',
    'target.strategy': 'Chiến lược',
    'target.setAside': 'Gom đều mỗi tháng',
    'target.refill': 'Bơm đầy tới mức',
    'target.haveBalance': 'Đạt số dư trước hạn',
    'target.amount': 'Số tiền',
    'target.cadence': 'Chu kỳ',
    'target.monthly': 'Hằng tháng',
    'target.weekly': 'Hằng tuần',
    'target.yearly': 'Hằng năm',
    'target.custom': 'Tùy chỉnh (theo hạn)',
    'target.weekday': 'Thứ trong tuần',
    'target.deadline': 'Hạn (deadline)',
    'target.dueDay': 'Ngày đến hạn trong tháng (tùy chọn, 1–31)',
    'target.save': 'Lưu',
    'target.snooze': '😴 Snooze',
    'target.unsnooze': 'Bỏ snooze',
    'target.remove': 'Xóa mục tiêu',
    'target.errAmount': 'Nhập số tiền > 0',
    'target.errDate': 'Chọn ngày hạn (deadline)',
    'weekday.mon': 'Thứ 2', 'weekday.tue': 'Thứ 3', 'weekday.wed': 'Thứ 4',
    'weekday.thu': 'Thứ 5', 'weekday.fri': 'Thứ 6', 'weekday.sat': 'Thứ 7', 'weekday.sun': 'Chủ nhật',
    // ledger
    'ledger.loading': 'Đang tải sổ giao dịch…',
    'ledger.addTxn': '＋ Thêm giao dịch',
    'ledger.transfer': '⇄ Chuyển khoản',
    'ledger.pickAccount': 'Chọn 1 tài khoản để thêm giao dịch',
    'ledger.pickAccountEmpty': 'Chọn 1 tài khoản để thêm giao dịch (tạo tài khoản trước)',
    'ledger.confirmEditTitle': 'Giao dịch đã đối soát',
    'ledger.confirmEditDesc': 'Sửa có thể làm lệch số dư ngân hàng. Tiếp tục?',
    'ledger.confirmEditOk': 'Vẫn sửa',
    'ledger.confirmDelDesc': 'Xóa có thể làm lệch số dư. Tiếp tục?',
    'ledger.confirmDelOk': 'Vẫn xóa',
    'ledger.confirmDelTitle': 'Xóa giao dịch này?',
    'ledger.delete': 'Xóa',
    // account sidebar
    'acct.all': 'Tất cả tài khoản',
    'acct.cash': 'Tiền mặt',
    'acct.savings': 'Tiết kiệm',
    'acct.add': '＋ Thêm tài khoản',
    'acct.addTitle': 'Thêm tài khoản',
    'acct.name': 'Tên tài khoản',
    'acct.namePlaceholder': 'vd Ví tiền mặt, Vietcombank',
    'acct.type': 'Loại',
    'acct.typeCash': 'Tiền mặt (Cash)',
    'acct.typeSavings': 'Tiết kiệm (Savings)',
    'acct.errName': 'Nhập tên tài khoản',
    // transaction table/form
    'txn.empty': 'Chưa có giao dịch',
    'txn.colDate': 'Ngày', 'txn.colPayee': 'Payee', 'txn.colCategory': 'Category',
    'txn.colMemo': 'Memo', 'txn.colOutflow': 'Outflow', 'txn.colInflow': 'Inflow',
    'txn.transfer': '(Transfer)',
    'txn.lockedTitle': 'Giao dịch đã khóa',
    'txn.lockedDesc': 'Giao dịch đã đối soát nên không đổi trạng thái được.',
    'txn.pickCategory': '— Chọn category —',
    'txn.memo': 'Memo',
    'txn.update': 'Cập nhật',
    'txn.errAmount': 'Nhập Outflow hoặc Inflow',
    // transfer form
    'transfer.title': 'Chuyển khoản giữa tài khoản',
    'transfer.from': 'Từ', 'transfer.to': 'Đến', 'transfer.amount': 'Số tiền', 'transfer.date': 'Ngày',
    'transfer.submit': 'Chuyển',
    'transfer.errAmount': 'Nhập số tiền > 0',
    'transfer.errTo': 'Chọn tài khoản đích',
  },
  en: {
    'common.cancel': 'Cancel',
    'common.ok': 'OK',
    'common.save': 'Save',
    'common.confirm': 'Confirm',
    'common.add': 'Add',
    'common.loading': 'Loading…',
    'auth.email': 'Email',
    'auth.password': 'Password (≥6 chars)',
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.toSignUp': "No account? Sign up",
    'auth.toSignIn': 'Have an account? Sign in',
    'setup.title': 'Set up WNAP',
    'setup.displayName': 'Your display name',
    'setup.createNew': 'Create a new budget',
    'setup.budgetName': 'Budget name',
    'setup.createBtn': 'Create budget',
    'setup.orJoin': 'Or join with an invite code',
    'setup.codePlaceholder': '6-char code',
    'setup.joinBtn': 'Join budget',
    'nav.plan': 'Plan',
    'nav.ledger': 'Ledger',
    'menu.account': 'Account menu',
    'menu.invite': 'Invite member',
    'menu.motion': 'Motion effects',
    'menu.on': 'On',
    'menu.off': 'Off',
    'menu.signOut': 'Sign out',
    'invite.title': 'Invite member',
    'invite.desc': 'Send this code to your family. Each code works once for one person.',
    'invite.copyHint': 'Click to copy',
    'invite.copied': 'Copied',
    'invite.copy': 'Copy',
    'invite.step1': 'They open the app and sign up.',
    'invite.step2': 'On the setup screen, enter the code in "join with an invite code".',
    'invite.step3': 'Tap Join budget to share the budget.',
    'invite.regen': 'Generate another code',
    'invite.copyErr': 'Copy failed — please copy the code above manually.',
    'plan.loading': 'Loading budget…',
    'plan.addGroup': '＋ Group',
    'plan.addCategory': '＋ Category',
    'plan.activity': '📋 Activity',
    'plan.newGroup': 'New group',
    'plan.groupName': 'Group name',
    'plan.groupPlaceholder': 'e.g. Fixed costs',
    'plan.create': 'Create',
    'plan.newCategory': 'New category',
    'plan.categoryName': 'Category name',
    'plan.categoryPlaceholder': 'e.g. Electricity',
    'plan.noGroupTitle': 'No group yet',
    'plan.noGroupDesc': 'Create a group first, then add a category.',
    'plan.monthLabel': '{month}/{year}',
    'filter.overspent': 'Overspent',
    'filter.underfunded': 'Underfunded',
    'filter.overfunded': 'Overfunded',
    'filter.moneyAvailable': 'Money Available',
    'filter.snoozed': 'Snoozed',
    'col.category': 'CATEGORY',
    'col.assigned': 'ASSIGNED',
    'col.activity': 'ACTIVITY',
    'col.available': 'AVAILABLE',
    'rta.ready': 'Ready to Assign',
    'rta.assign': '+ Assign',
    'move.title': 'Move money',
    'move.from': 'From',
    'move.to': 'To',
    'move.has': 'has',
    'move.amount': 'Amount',
    'move.submit': 'Move',
    'move.errAmount': 'Enter an amount > 0',
    'move.errTo': 'Pick a destination category',
    'target.title': 'Target · {name}',
    'target.strategy': 'Strategy',
    'target.setAside': 'Set aside (even monthly)',
    'target.refill': 'Refill up to',
    'target.haveBalance': 'Have balance by',
    'target.amount': 'Amount',
    'target.cadence': 'Cadence',
    'target.monthly': 'Monthly',
    'target.weekly': 'Weekly',
    'target.yearly': 'Yearly',
    'target.custom': 'Custom (by deadline)',
    'target.weekday': 'Day of week',
    'target.deadline': 'Deadline',
    'target.dueDay': 'Due day of month (optional, 1–31)',
    'target.save': 'Save',
    'target.snooze': '😴 Snooze',
    'target.unsnooze': 'Unsnooze',
    'target.remove': 'Remove target',
    'target.errAmount': 'Enter an amount > 0',
    'target.errDate': 'Pick a deadline',
    'weekday.mon': 'Mon', 'weekday.tue': 'Tue', 'weekday.wed': 'Wed',
    'weekday.thu': 'Thu', 'weekday.fri': 'Fri', 'weekday.sat': 'Sat', 'weekday.sun': 'Sun',
    'ledger.loading': 'Loading ledger…',
    'ledger.addTxn': '＋ Add transaction',
    'ledger.transfer': '⇄ Transfer',
    'ledger.pickAccount': 'Pick an account to add a transaction',
    'ledger.pickAccountEmpty': 'Pick an account to add a transaction (create one first)',
    'ledger.confirmEditTitle': 'Reconciled transaction',
    'ledger.confirmEditDesc': 'Editing may unbalance the bank balance. Continue?',
    'ledger.confirmEditOk': 'Edit anyway',
    'ledger.confirmDelDesc': 'Deleting may unbalance the balance. Continue?',
    'ledger.confirmDelOk': 'Delete anyway',
    'ledger.confirmDelTitle': 'Delete this transaction?',
    'ledger.delete': 'Delete',
    'acct.all': 'All accounts',
    'acct.cash': 'Cash',
    'acct.savings': 'Savings',
    'acct.add': '＋ Add account',
    'acct.addTitle': 'Add account',
    'acct.name': 'Account name',
    'acct.namePlaceholder': 'e.g. Cash wallet, Vietcombank',
    'acct.type': 'Type',
    'acct.typeCash': 'Cash',
    'acct.typeSavings': 'Savings',
    'acct.errName': 'Enter an account name',
    'txn.empty': 'No transactions yet',
    'txn.colDate': 'Date', 'txn.colPayee': 'Payee', 'txn.colCategory': 'Category',
    'txn.colMemo': 'Memo', 'txn.colOutflow': 'Outflow', 'txn.colInflow': 'Inflow',
    'txn.transfer': '(Transfer)',
    'txn.lockedTitle': 'Transaction locked',
    'txn.lockedDesc': 'This transaction is reconciled, so its status cannot change.',
    'txn.pickCategory': '— Pick a category —',
    'txn.memo': 'Memo',
    'txn.update': 'Update',
    'txn.errAmount': 'Enter an Outflow or Inflow',
    'transfer.title': 'Transfer between accounts',
    'transfer.from': 'From', 'transfer.to': 'To', 'transfer.amount': 'Amount', 'transfer.date': 'Date',
    'transfer.submit': 'Transfer',
    'transfer.errAmount': 'Enter an amount > 0',
    'transfer.errTo': 'Pick a destination account',
  },
} as const;

export type Lang = keyof typeof dict;          // 'vi' | 'en'
export type TKey = keyof typeof dict['vi'];
```

- [ ] **Step 2: Commit**

```bash
git add app/src/i18n/dict.ts
git commit -m "feat(i18n): vi/en dictionary"
```

---

## Task 3: Test parity từ điển

**Files:**
- Create: `app/src/i18n/__tests__/dict.parity.test.ts`

- [ ] **Step 1: Viết test**

```ts
// app/src/i18n/__tests__/dict.parity.test.ts
import { describe, it, expect } from 'vitest';
import { dict } from '../dict';

describe('dict parity', () => {
  it('vi và en có cùng tập key', () => {
    const vi = Object.keys(dict.vi).sort();
    const en = Object.keys(dict.en).sort();
    expect(en).toEqual(vi);
  });
  it('không có giá trị rỗng', () => {
    for (const lang of ['vi', 'en'] as const)
      for (const [k, v] of Object.entries(dict[lang]))
        expect(v, `${lang}.${k}`).not.toBe('');
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `npm test -- parity`
Expected: PASS. Nếu FAIL → có key lệch giữa vi/en, sửa `dict.ts` cho khớp.

- [ ] **Step 3: Commit**

```bash
git add app/src/i18n/__tests__/dict.parity.test.ts
git commit -m "test(i18n): dict vi/en key parity"
```

---

## Task 4: Provider `useI18n`

**Files:**
- Create: `app/src/i18n/useI18n.tsx`

- [ ] **Step 1: Viết `useI18n.tsx`**

```tsx
// app/src/i18n/useI18n.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dict, type Lang, type TKey } from './dict';
import { translate } from './translate';

interface I18nApi {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nApi | null>(null);

function initialLang(): Lang {
  const saved = localStorage.getItem('wnap.lang');
  return saved === 'en' ? 'en' : 'vi';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('wnap.lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(dict, lang, key, vars),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `✓ built`. (Chưa dùng provider nên không lỗi runtime.)

- [ ] **Step 3: Commit**

```bash
git add app/src/i18n/useI18n.tsx
git commit -m "feat(i18n): I18nProvider + useI18n hook"
```

---

## Task 5: `LangSwitch` nút cờ tròn SVG

**Files:**
- Create: `app/src/i18n/LangSwitch.tsx`

- [ ] **Step 1: Viết `LangSwitch.tsx`**

```tsx
// app/src/i18n/LangSwitch.tsx
import { useI18n } from './useI18n';

function FlagVN() {
  return (
    <svg viewBox="0 0 30 20" className="h-full w-full object-cover" aria-hidden>
      <rect width="30" height="20" fill="#da251d" />
      <path fill="#ff0" d="M15 4l1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 14.84l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="h-full w-full object-cover" aria-hidden>
      <clipPath id="gb-c"><rect width="60" height="30" /></clipPath>
      <g clipPath="url(#gb-c)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  const next = lang === 'vi' ? 'en' : 'vi';
  const label = next === 'en' ? 'Chuyển sang English' : 'Đổi sang Tiếng Việt';
  return (
    <button
      onClick={() => setLang(next)}
      title={label}
      aria-label={label}
      className="size-7 shrink-0 overflow-hidden rounded-full border transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {lang === 'vi' ? <FlagVN /> : <FlagGB />}
    </button>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add app/src/i18n/LangSwitch.tsx
git commit -m "feat(i18n): LangSwitch round flag button (inline SVG)"
```

---

## Task 6: Wire `I18nProvider` + `LangSwitch` vào App

**Files:**
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Thêm import**

Thêm vào khối import của `App.tsx`:
```tsx
import { I18nProvider, useI18n } from './i18n/useI18n';
import { LangSwitch } from './i18n/LangSwitch';
```

- [ ] **Step 2: Bọc toàn bộ cây render bằng `I18nProvider`**

Đổi tên `export default function App()` hiện tại thành `function AppInner()`. Thêm wrapper mới:
```tsx
export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  // ...toàn bộ nội dung App() cũ giữ nguyên...
}
```

- [ ] **Step 3: Dịch chuỗi loading + thêm `LangSwitch` vào header**

Trong `AppInner`, lấy `t`:
```tsx
const { t } = useI18n();
```
Đổi `<p className="p-10 text-muted-foreground">Đang tải…</p>` → `{t('common.loading')}`.

Trong header, thêm `LangSwitch` bên phải `UserMenu` — bọc cả hai trong 1 div:
```tsx
<header className="mx-auto flex max-w-[980px] items-center justify-between gap-2 px-3 pt-3">
  <span className="text-lg font-bold text-primary">WNAP</span>
  <div className="flex items-center gap-2">
    <UserMenu
      displayName={budget.display_name}
      budgetName={budget.budget_name}
      budgetId={budget.budget_id}
    />
    <LangSwitch />
  </div>
</header>
```

- [ ] **Step 4: Verify build + chạy app**

Run: `npm run build`
Expected: `✓ built`. Nút cờ hiện bên phải menu; bấm đổi cờ (chưa dịch nội dung khác cũng không sao).

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(i18n): mount I18nProvider + LangSwitch in header"
```

---

## Task 7: Dịch shell/nav + dialog mặc định

**Files:**
- Modify: `app/src/nav/AppTabs.tsx`, `app/src/budget/UserMenu.tsx`, `app/src/budget/InviteDialog.tsx`, `app/src/components/feedback/DialogProvider.tsx`

Mẫu chung: thêm `import { useI18n } from '@/i18n/useI18n'` (hoặc đường dẫn tương đối), gọi `const { t } = useI18n();`, thay literal bằng `t('key')`.

> **Lưu ý alias:** dự án có alias `@/` trỏ `app/src`. Có thể dùng `@/i18n/useI18n`.

- [ ] **Step 1: `AppTabs.tsx`** — cần `t`; map:

| Literal | Key |
|---|---|
| `Kế hoạch` | `nav.plan` |
| `Sổ giao dịch` | `nav.ledger` |

`AppTabs` hiện không gọi hook — thêm `const { t } = useI18n();` đầu component.

- [ ] **Step 2: `UserMenu.tsx`** — map:

| Literal | Key |
|---|---|
| `aria-label="Menu tài khoản"` | `menu.account` |
| `Mời thành viên` | `menu.invite` |
| `Hiệu ứng chuyển động` | `menu.motion` |
| `Bật` / `Tắt` (badge) | `menu.on` / `menu.off` |
| `Đăng xuất` | `menu.signOut` |

- [ ] **Step 3: `InviteDialog.tsx`** — map: tiêu đề `invite.title`, mô tả `invite.desc`, `title="Bấm để copy"`→`invite.copyHint`, `Đã chép`→`invite.copied`, `Copy`→`invite.copy`, 3 `<li>`→`invite.step1/2/3`, `Tạo mã khác`→`invite.regen`, lỗi copy→`invite.copyErr`.

- [ ] **Step 4: `DialogProvider.tsx`** — thay default labels bằng `t`:
  - `'Hủy'` → `t('common.cancel')`
  - confirm text mặc định `'Đồng ý'` → `t('common.confirm')`
  - prompt text mặc định `'Lưu'` → `t('common.save')`
  - notify text mặc định `'OK'` → `t('common.ok')`

  (Giữ cơ chế cho phép caller override qua opts; chỉ đổi giá trị fallback.)

- [ ] **Step 5: Verify build**

Run: `npm run build` → `✓ built`.

- [ ] **Step 6: Commit**

```bash
git add app/src/nav/AppTabs.tsx app/src/budget/UserMenu.tsx app/src/budget/InviteDialog.tsx app/src/components/feedback/DialogProvider.tsx
git commit -m "feat(i18n): translate shell, nav, user menu, invite, dialog defaults"
```

---

## Task 8: Dịch Auth/Setup

**Files:**
- Modify: `app/src/pages/AuthPage.tsx`, `app/src/pages/SetupPage.tsx`

- [ ] **Step 1: `AuthPage.tsx`** — thêm `const { t } = useI18n();`; map:

| Literal | Key |
|---|---|
| placeholder `Email` | `auth.email` |
| placeholder `Mật khẩu (≥6 ký tự)` | `auth.password` |
| `Đăng nhập` | `auth.signIn` |
| `Đăng ký` | `auth.signUp` |
| `Chưa có tài khoản? Đăng ký` | `auth.toSignUp` |
| `Đã có tài khoản? Đăng nhập` | `auth.toSignIn` |

(Lỗi `error.message` từ Supabase giữ nguyên — không dịch.)

- [ ] **Step 2: `SetupPage.tsx`** — thêm `const { t } = useI18n();`; map:

| Literal | Key |
|---|---|
| `Thiết lập WNAP` | `setup.title` |
| `Tên hiển thị của bạn` | `setup.displayName` |
| `Tạo budget mới` | `setup.createNew` |
| `Tạo budget` | `setup.createBtn` |
| `Hoặc join bằng invite code` | `setup.orJoin` |
| placeholder `Mã 6 ký tự` | `setup.codePlaceholder` |
| `Join budget` | `setup.joinBtn` |

Giá trị mặc định `budgetName='Ngân sách gia đình'` là **dữ liệu** người dùng sửa được → giữ nguyên, không dịch. Thêm label `setup.budgetName` nếu muốn nhãn cho ô tên ngân sách.

- [ ] **Step 3: Verify build** → `npm run build` → `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/AuthPage.tsx app/src/pages/SetupPage.tsx
git commit -m "feat(i18n): translate auth + setup screens"
```

---

## Task 9: Dịch khu Plan

**Files:**
- Modify: `app/src/plan/PlanScreen.tsx`, `app/src/plan/MonthNav.tsx`, `app/src/plan/RtaHeader.tsx`, `app/src/plan/FilterCards.tsx`, `app/src/plan/CategoryTable.tsx`, `app/src/plan/MoveMoneyModal.tsx`, `app/src/plan/TargetEditorModal.tsx`, `app/src/plan/ActivityDialog.tsx`, `app/src/plan/AssignPopover.tsx`

- [ ] **Step 1: `PlanScreen.tsx`** — `t` đã có dialog; thêm `useI18n`. Map: `Đang tải ngân sách…`→`plan.loading`; nút `＋ Nhóm`→`plan.addGroup`, `＋ Category`→`plan.addCategory`, `📋 Hoạt động`→`plan.activity`. Trong `onAddGroup/onAddCategory` đổi opts của `prompt/notify`:
  - newGroup: `title: t('plan.newGroup'), label: t('plan.groupName'), placeholder: t('plan.groupPlaceholder'), confirmText: t('plan.create')`
  - noGroup notify: `title: t('plan.noGroupTitle'), description: t('plan.noGroupDesc')`
  - newCategory: `title: t('plan.newCategory'), label: t('plan.categoryName'), placeholder: t('plan.categoryPlaceholder'), confirmText: t('plan.create')`

- [ ] **Step 2: `MonthNav.tsx`** — thêm `useI18n`. Thay `Tháng {formatMonth(viewMonth)}`. `viewMonth` dạng `YYYY-MM`. Tách:
```tsx
const [y, m] = viewMonth.split('-');
const label = lang === 'en'
  ? new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
  : t('plan.monthLabel', { month: m, year: y });
```
Lấy `const { t, lang } = useI18n();`. Hiển thị `{label}`.

- [ ] **Step 3: `RtaHeader.tsx`** — đọc file, map nhãn `Sẵn sàng phân bổ`→`rta.ready`, nút `+ Assign`→`rta.assign`. (Giữ format số tiền nguyên.)

- [ ] **Step 4: `FilterCards.tsx`** — nhãn filter render bằng `t`. `planFilters.ts` đổi `label` thành key id; tại `FilterCards` map id→`t('filter.'+id)`. Cụ thể đổi `PLAN_FILTERS[].label` không dùng nữa cho hiển thị; trong `FilterCards` dùng `t(\`filter.${f.id}\`)`. (id: overspent/underfunded/overfunded/moneyAvailable/snoozed — trùng hậu tố key.)

- [ ] **Step 5: `CategoryTable.tsx`** — header cột: `CATEGORY`→`col.category`, `ASSIGNED`→`col.assigned`, `ACTIVITY`→`col.activity`, `AVAILABLE`→`col.available`. Thêm `useI18n`.

- [ ] **Step 6: `MoveMoneyModal.tsx`** — map: tiêu đề `Chuyển tiền`→`move.title`, `Từ`→`move.from`, `Đến`→`move.to`, `có`→`move.has`, `Số tiền`→`move.amount`, nút `Chuyển`→`move.submit`, lỗi inline `Nhập số tiền > 0`→`move.errAmount`, `Chọn category đích`→`move.errTo`.

- [ ] **Step 7: `TargetEditorModal.tsx`** — map đầy đủ: tiêu đề `Mục tiêu · {name}`→`target.title` với `{name: categoryName(categoryId)}`; nhãn `Chiến lược/Số tiền/Chu kỳ/Thứ trong tuần/Hạn (deadline)/Ngày đến hạn…`; các `SelectItem` strategy (`target.setAside/refill/haveBalance`), cadence (`target.monthly/weekly/yearly/custom`), weekday (`weekday.mon…sun`); nút `Lưu`→`target.save`, `😴 Snooze`/`Bỏ snooze`→`target.snooze`/`target.unsnooze`, `Xóa mục tiêu`→`target.remove`; lỗi inline `target.errAmount`/`target.errDate`.

- [ ] **Step 8: `ActivityDialog.tsx` + `AssignPopover.tsx`** — đọc file, với MỖI literal tiếng Việt tạo key mới theo tiền tố `activity.*` / `assign.*`, **thêm cả vi/en vào `dict.ts`**, rồi thay bằng `t()`. (Parity test sẽ chặn nếu thêm thiếu 1 bên.)

- [ ] **Step 9: Verify build + test** → `npm run build` (`✓ built`) + `npm test` (parity PASS).

- [ ] **Step 10: Commit**

```bash
git add app/src/plan app/src/budget/planFilters.ts app/src/i18n/dict.ts
git commit -m "feat(i18n): translate Plan screen + targets + filters"
```

---

## Task 10: Dịch khu Ledger

**Files:**
- Modify: `app/src/ledger/LedgerScreen.tsx`, `AccountSidebar.tsx`, `AddAccountDialog.tsx`, `BalanceHeader.tsx`, `TransactionTable.tsx`, `TransactionForm.tsx`, `TransferForm.tsx`, `ReconcileModal.tsx`

- [ ] **Step 1: `LedgerScreen.tsx`** — map: `Đang tải sổ giao dịch…`→`ledger.loading`, `＋ Thêm giao dịch`→`ledger.addTxn`, `⇄ Chuyển khoản`→`ledger.transfer`, dòng chọn account→`ledger.pickAccount`/`ledger.pickAccountEmpty` (tùy `accounts.length`); confirm opts edit/delete→`ledger.confirm*` + `ledger.delete`.

- [ ] **Step 2: `AccountSidebar.tsx`** — `Tất cả tài khoản`→`acct.all`, `Tiền mặt`→`acct.cash`, `Tiết kiệm`→`acct.savings`. (`＋ Thêm tài khoản` nằm trong `AddAccountDialog`.)

- [ ] **Step 3: `AddAccountDialog.tsx`** — `＋ Thêm tài khoản`→`acct.add`, tiêu đề `Thêm tài khoản`→`acct.addTitle`, nhãn `Tên tài khoản`→`acct.name`, placeholder→`acct.namePlaceholder`, `Loại`→`acct.type`, options `acct.typeCash`/`acct.typeSavings`, `Hủy`→`common.cancel`, `Thêm`→`common.add`, lỗi→`acct.errName`.

- [ ] **Step 4: `TransactionTable.tsx`** — `Chưa có giao dịch`→`txn.empty`; header cột `Ngày/Payee/Category/Memo/Outflow/Inflow`→`txn.colDate/...`; `(Transfer)`→`txn.transfer`; notify locked→`txn.lockedTitle`/`txn.lockedDesc`. Thêm `useI18n` ở cả `TransactionTable` và `TransactionCard` (hoặc truyền `t` xuống — đơn giản hơn: gọi `useI18n` trong `TransactionCard`).

- [ ] **Step 5: `TransactionForm.tsx`** — placeholder `Payee` (giữ, là từ mượn — hoặc `txn.colPayee`), `— Chọn category —`→`txn.pickCategory`, `Memo`→`txn.memo`, `Outflow`/`Inflow` placeholder→`txn.colOutflow`/`txn.colInflow`, `Lưu`→`common.save`, `Cập nhật`→`txn.update`, `Hủy`→`common.cancel`, lỗi→`txn.errAmount`.

- [ ] **Step 6: `TransferForm.tsx`** — tiêu đề→`transfer.title`, `Từ/Đến/Số tiền/Ngày`→`transfer.from/to/amount/date`, nút `Chuyển`→`transfer.submit`, lỗi→`transfer.errAmount`/`transfer.errTo`.

- [ ] **Step 7: `BalanceHeader.tsx` + `ReconcileModal.tsx`** — đọc file; với mỗi literal tiếng Việt tạo key tiền tố `balance.*` / `reconcile.*`, **thêm vi/en vào `dict.ts`**, thay bằng `t()`.

- [ ] **Step 8: Verify build + test** → `npm run build` (`✓ built`) + `npm test` (110+ pass, parity PASS).

- [ ] **Step 9: Commit**

```bash
git add app/src/ledger app/src/i18n/dict.ts
git commit -m "feat(i18n): translate Ledger screen + forms + dialogs"
```

---

## Task 11: Quét sót + verify cuối + push

- [ ] **Step 1: Quét literal tiếng Việt còn sót**

Dùng Grep tìm dấu hiệu chuỗi tiếng Việt còn hard-code trong `app/src` (ngoài `dict.ts`): tìm các ký tự có dấu `[ăâđêôơưáàảãạ…]` trong `.tsx`. Với mỗi chỗ còn sót: thêm key vào `dict.ts` (vi+en) và thay bằng `t()`.

- [ ] **Step 2: Build + full test**

Run: `npm run build` → `✓ built`.
Run: `npm test` → tất cả pass, gồm `translate` (5) và `dict.parity`.

- [ ] **Step 3: Verify mắt thường (dev server)**

Run: `npm run dev`, mở app: đổi cờ VI↔EN trên header → kiểm Plan (filter cards, RTA, cột bảng, modal Target) và Ledger (sidebar, form, transfer) đổi ngôn ngữ đúng; reload trang giữ ngôn ngữ đã chọn (localStorage). Đóng dev server.

- [ ] **Step 4: Commit dọn (nếu Step 1 có sửa) + push**

```bash
git add -A
git commit -m "feat(i18n): catch remaining literals; finalize bilingual support"
git push
```

(Push → Vercel auto-deploy.)

---

## Self-Review (đã chạy)

- **Spec coverage:** module i18n (T1–4), LangSwitch cờ SVG (T5), wiring + default vi + persistence (T4,T6), dịch hết 2 chiều gồm thuật ngữ YNAB (T2 dict + T7–10), Auth/Setup (T8), test thuần + parity (T1,T3), giữ format tiền/ngày (T2 `move.has`/format không đụng; MonthNav xử lý theo lang). ✓
- **Placeholder scan:** infra có code đầy đủ; task dịch dùng bảng map literal→key cụ thể; 4 file chưa đọc (ActivityDialog, AssignPopover, BalanceHeader, ReconcileModal) có hướng dẫn rõ "tạo key tiền tố X, thêm vi/en, thay t()". Không có TODO/TBD. ✓
- **Type consistency:** `Lang`/`TKey` định nghĩa ở `dict.ts` dùng nhất quán; `t(key, vars?)` chữ ký khớp giữa `useI18n` và call-site; `translate(dict, lang, key, vars)` khớp test & provider. ✓
