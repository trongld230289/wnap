# WNAP Mobile Responsive + PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm WNAP hiển thị & thao tác tốt ở 375px và cài được lên màn hình chính điện thoại (PWA cache vỏ app).

**Architecture:** Chỉ thêm class responsive (breakpoint Tailwind `sm:` = 640px) + thêm mobile variant cho bảng giao dịch; không đổi logic nghiệp vụ. PWA qua `vite-plugin-pwa` (Workbox) precache app shell, loại trừ Supabase khỏi cache.

**Tech Stack:** React 19 + TypeScript, Tailwind v4, shadcn/ui (radix), Vite 8, `vite-plugin-pwa`, `sharp` (gen icons), Vitest, Playwright (verify).

**⚠️ Verification model:** Test env là **node (không jsdom)** → vitest chỉ test pure logic; phần này là presentational/config nên **không thêm vitest**. Verify mỗi task bằng: `npm run build` (typecheck thật — KHÔNG dùng `tsc --noEmit`) + Playwright screenshot ở 375px. Toàn bộ **110 vitest hiện có phải vẫn pass** (không đụng logic). Spec: `docs/superpowers/specs/2026-06-09-wnap-mobile-responsive-pwa-design.md`.

**Branch:** tạo branch `feat/mobile-responsive-pwa` trước Task 1.

---

### Task 1: Ledger — TransactionTable card variant (mobile)

**Files:**
- Modify: `app/src/ledger/TransactionTable.tsx`

- [ ] **Step 1: Thay TransactionTable để có 2 variant (table ≥sm / card <sm)**

Thay toàn bộ nội dung `app/src/ledger/TransactionTable.tsx` bằng:

```tsx
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { cn } from '@/lib/utils';
import type { LedgerTxn } from '../lib/mappers';

const STATUS_ICON: Record<string, string> = { uncleared: '○', cleared: 'C', reconciled: '🔒' };

export function TransactionTable({ txns, onEdit, onDelete }: { txns: LedgerTxn[]; onEdit: (t: LedgerTxn) => void; onDelete: (t: LedgerTxn) => void }) {
  const { categoryName, accountName, payees, setTxStatus } = useBudget();
  const payeeName = (id: string | null) => (id ? payees.find((p) => p.id === id)?.name ?? '' : '');

  function toggle(t: LedgerTxn) {
    if (t.status === 'reconciled') { window.alert('Giao dịch đã đối soát (đã khóa).'); return; }
    setTxStatus(t.id, t.status === 'uncleared' ? 'cleared' : 'uncleared');
  }

  const th = 'px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground';
  const td = 'px-2 py-2 align-middle';

  if (txns.length === 0) {
    return <div className="rounded-xl border bg-card px-2 py-6 text-center text-sm text-muted-foreground">Chưa có giao dịch</div>;
  }

  return (
    <>
      {/* Mobile: card list (<sm) */}
      <ul className="space-y-2 sm:hidden">
        {txns.map((t) => (
          <TransactionCard
            key={t.id} t={t}
            label={t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}
            category={t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}
            onToggle={() => toggle(t)} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)}
          />
        ))}
      </ul>

      {/* Desktop: table (≥sm) */}
      <div className="hidden overflow-hidden rounded-xl border bg-card sm:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b">
              <th className={th}></th>
              <th className={th}>Ngày</th>
              <th className={th}>Payee</th>
              <th className={th}>Category</th>
              <th className={th}>Memo</th>
              <th className={cn(th, 'text-right')}>Outflow</th>
              <th className={cn(th, 'text-right')}>Inflow</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                <td
                  className={cn(td, 'cursor-pointer text-center', t.status === 'uncleared' ? 'text-muted-foreground/50' : 'text-status-green')}
                  onClick={() => toggle(t)}
                  title="Đổi trạng thái"
                >
                  {STATUS_ICON[t.status]}
                </td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</td>
                <td className={td}>{t.transferId ? `⇄ ${accountName(t.accountId)}` : payeeName(t.payeeId)}</td>
                <td className={cn(td, t.categoryId ? 'text-accent-foreground' : 'text-muted-foreground')}>{t.categoryId ? categoryName(t.categoryId) : '(Transfer)'}</td>
                <td className={cn(td, 'text-muted-foreground')}>{t.memo}</td>
                <td className={cn(td, 'text-right tabular-nums')}>{t.amount < 0 ? formatVnd(-t.amount) : ''}</td>
                <td className={cn(td, 'text-right tabular-nums text-status-green')}>{t.amount > 0 ? formatVnd(t.amount) : ''}</td>
                <td className={cn(td, 'whitespace-nowrap text-right')}>
                  {!t.transferId && (
                    <button onClick={() => onEdit(t)} title="Sửa" className="px-1 opacity-70 transition-opacity hover:opacity-100">✏️</button>
                  )}
                  <button onClick={() => onDelete(t)} title="Xóa" className="px-1 opacity-70 transition-opacity hover:opacity-100">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TransactionCard({ t, label, category, onToggle, onEdit, onDelete }: {
  t: LedgerTxn; label: string; category: string;
  onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <li className="rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{label || '—'}</span>
        <span className={cn('shrink-0 tabular-nums font-semibold', t.amount > 0 ? 'text-status-green' : 'text-foreground')}>
          {t.amount > 0 ? '+' : '-'}{formatVnd(Math.abs(t.amount))}₫
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="tabular-nums">{t.date.slice(8, 10)}/{t.date.slice(5, 7)}</span>
          <span>·</span>
          <span className={t.categoryId ? 'text-accent-foreground' : ''}>{category}</span>
          <button
            onClick={onToggle}
            className={cn('rounded px-1', t.status === 'uncleared' ? 'text-muted-foreground/50' : 'text-status-green')}
            title="Đổi trạng thái"
          >
            {STATUS_ICON[t.status]}
          </button>
        </span>
        <span className="shrink-0 whitespace-nowrap">
          {!t.transferId && <button onClick={onEdit} title="Sửa" className="px-1 opacity-70 hover:opacity-100">✏️</button>}
          <button onClick={onDelete} title="Xóa" className="px-1 opacity-70 hover:opacity-100">🗑️</button>
        </span>
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd app && npm run build`
Expected: build thành công, không lỗi TS.

- [ ] **Step 3: Verify test không regression**

Run: `cd app && npm test`
Expected: 110 passed.

- [ ] **Step 4: Commit**

```bash
git add app/src/ledger/TransactionTable.tsx
git commit -m "feat(mobile): TransactionTable card variant <sm, table ≥sm"
```

---

### Task 2: Ledger — sidebar/form breakpoint align + numeric keyboard

**Files:**
- Modify: `app/src/ledger/LedgerScreen.tsx:37`
- Modify: `app/src/ledger/AccountSidebar.tsx:33`
- Modify: `app/src/ledger/TransactionForm.tsx:44-45`

- [ ] **Step 1: Đổi container Ledger từ `md:` sang `sm:` để sidebar stack đúng mốc 640px**

Trong `app/src/ledger/LedgerScreen.tsx`, dòng 37 — đổi:

```tsx
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card md:flex-row">
```

thành:

```tsx
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card sm:flex-row">
```

- [ ] **Step 2: Sidebar — align breakpoint `md:`→`sm:`**

Trong `app/src/ledger/AccountSidebar.tsx`, dòng 33 — đổi:

```tsx
    <div className="w-full shrink-0 border-b bg-muted/40 p-2.5 text-[13px] md:w-48 md:border-b-0 md:border-r">
```

thành:

```tsx
    <div className="w-full shrink-0 border-b bg-muted/40 p-2.5 text-[13px] sm:w-48 sm:border-b-0 sm:border-r">
```

- [ ] **Step 3: TransactionForm — bật bàn phím số cho Outflow/Inflow**

Trong `app/src/ledger/TransactionForm.tsx`, dòng 44-45 — đổi:

```tsx
      <Input className="h-8 w-24 text-right tabular-nums" placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <Input className="h-8 w-24 text-right tabular-nums" placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
```

thành:

```tsx
      <Input inputMode="numeric" className="h-8 w-24 text-right tabular-nums" placeholder="Outflow" value={outflow} onChange={(e) => setOutflow(e.target.value)} />
      <Input inputMode="numeric" className="h-8 w-24 text-right tabular-nums" placeholder="Inflow" value={inflow} onChange={(e) => setInflow(e.target.value)} />
```

- [ ] **Step 4: Verify build**

Run: `cd app && npm run build`
Expected: build thành công.

- [ ] **Step 5: Commit**

```bash
git add app/src/ledger/LedgerScreen.tsx app/src/ledger/AccountSidebar.tsx app/src/ledger/TransactionForm.tsx
git commit -m "feat(mobile): Ledger sidebar/form responsive (sm breakpoint) + numeric input"
```

---

### Task 3: Plan — CategoryTable compact (ẩn Activity <sm) + numeric keyboard

**Files:**
- Modify: `app/src/plan/CategoryTable.tsx`

- [ ] **Step 1: AssignedCell — bật bàn phím số**

Trong `app/src/plan/CategoryTable.tsx`, trong `AssignedCell`, đổi `<Input ...>` (dòng ~24-30) thành (thêm `inputMode="numeric"`):

```tsx
      <Input
        inputMode="numeric"
        autoFocus value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={async () => { setEditing(false); await setAssigned(row.categoryId, parseVnd(text)); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="h-7 w-24 text-right"
      />
```

- [ ] **Step 2: Ẩn cột Activity <sm + nén padding/tên category**

Trong `CategoryRow` (dòng ~70-86), đổi:

- ô tên category (dòng 70): `className="px-3 py-2 text-left"` → `className="px-2 py-2 text-left sm:px-3"`
- tên category (dòng 77): bọc trong span truncate. Đổi `{categoryName(row.categoryId)}` thành:
  ```tsx
  <span className="max-w-[120px] truncate sm:max-w-none">{categoryName(row.categoryId)}</span>
  ```
- ô Assigned (dòng 81): `className="px-3 py-2 text-right"` → `className="px-2 py-2 text-right sm:px-3"`
- ô Activity (dòng 82): thêm `hidden sm:table-cell`:
  ```tsx
      <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">{formatVnd(row.activity)}</td>
  ```
- ô Available (dòng 83): `'relative px-3 py-2 text-right'` → `'relative px-2 py-2 text-right sm:px-3'`

Trong header `<thead>` (dòng 109-114): cột Activity `<th>` thêm `hidden sm:table-cell`, nén padding 2 cột đầu:

```tsx
          <tr className="border-b text-xs uppercase text-muted-foreground">
            <th className="px-2 py-2 text-left font-medium sm:px-3">Category</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">Assigned</th>
            <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Activity</th>
            <th className="px-2 py-2 text-right font-medium sm:px-3">Available</th>
          </tr>
```

(Group header `colSpan={4}` giữ nguyên — colSpan lớn hơn số cột hiển thị vẫn hợp lệ.)

- [ ] **Step 3: Verify build**

Run: `cd app && npm run build`
Expected: build thành công.

- [ ] **Step 4: Commit**

```bash
git add app/src/plan/CategoryTable.tsx
git commit -m "feat(mobile): CategoryTable compact, hide Activity <sm, numeric input"
```

---

### Task 4: Plan/Shell — header, nav tabs, button rows responsive

**Files:**
- Modify: `app/src/App.tsx:46-53`
- Modify: `app/src/nav/AppTabs.tsx`
- Modify: `app/src/plan/PlanScreen.tsx:53`

- [ ] **Step 1: App header — wrap + ẩn tên budget <sm**

Trong `app/src/App.tsx`, đổi block header (dòng 46-53) thành:

```tsx
        <header className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-2 px-3 pt-3">
          <span className="text-lg font-bold text-primary">WNAP</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{budget.budget_name}</span>
            <MotionToggle />
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Đăng xuất</Button>
          </div>
        </header>
```

- [ ] **Step 2: AppTabs — TabsList full-width chia đôi trên mobile**

Thay nội dung `app/src/nav/AppTabs.tsx` (TabsList + triggers) thành:

```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  return (
    <div className="mx-auto mt-2 max-w-[980px] px-3">
      <Tabs value={tab} onValueChange={(v) => onChange(v as AppTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="plan" className="flex-1 sm:flex-none">Kế hoạch</TabsTrigger>
          <TabsTrigger value="ledger" className="flex-1 sm:flex-none">Sổ giao dịch</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: PlanScreen — hàng nút wrap**

Trong `app/src/plan/PlanScreen.tsx` dòng 53, đổi:

```tsx
      <div className="mb-2 flex gap-2">
```

thành:

```tsx
      <div className="mb-2 flex flex-wrap gap-2">
```

- [ ] **Step 4: Verify build**

Run: `cd app && npm run build`
Expected: build thành công.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/nav/AppTabs.tsx app/src/plan/PlanScreen.tsx
git commit -m "feat(mobile): header wrap, full-width tabs, wrap action buttons"
```

---

### Task 5: Modals — scroll an toàn ở màn nhỏ + numeric keyboard

**Files:**
- Modify: `app/src/components/ui/dialog.tsx:62`
- Modify: `app/src/plan/AssignPopover.tsx:67`
- Modify: `app/src/plan/MoveMoneyModal.tsx:43`
- Modify: `app/src/plan/TargetEditorModal.tsx:53`

- [ ] **Step 1: DialogContent — thêm max-height + scroll (áp dụng mọi modal)**

Trong `app/src/components/ui/dialog.tsx`, trong `DialogContent` (dòng 61-64), thêm `max-h-[85dvh] overflow-y-auto` vào đầu chuỗi className. Đổi:

```tsx
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
```

thành:

```tsx
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid max-h-[85dvh] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
```

- [ ] **Step 2: AssignPopover — numeric keyboard cho ô số tiền manual**

Trong `app/src/plan/AssignPopover.tsx` dòng 67, đổi:

```tsx
          <Input value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="Cộng thêm vào Assigned (vd 500.000)" />
```

thành:

```tsx
          <Input inputMode="numeric" value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="Cộng thêm vào Assigned (vd 500.000)" />
```

- [ ] **Step 3: MoveMoneyModal — numeric keyboard**

Trong `app/src/plan/MoveMoneyModal.tsx` dòng 43, đổi:

```tsx
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
```

thành:

```tsx
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
```

- [ ] **Step 4: TargetEditorModal — numeric keyboard cho ô "Số tiền"**

Trong `app/src/plan/TargetEditorModal.tsx` dòng 53, đổi:

```tsx
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
```

thành:

```tsx
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
```

(Ô "Ngày đến hạn trong tháng" dòng 77 giữ nguyên — không bắt buộc numeric.)

- [ ] **Step 5: Verify build + test**

Run: `cd app && npm run build && npm test`
Expected: build thành công, 110 passed.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/ui/dialog.tsx app/src/plan/AssignPopover.tsx app/src/plan/MoveMoneyModal.tsx app/src/plan/TargetEditorModal.tsx
git commit -m "feat(mobile): dialogs scroll on small screens + numeric inputs"
```

---

### Task 6: PWA — vite-plugin-pwa, icons, manifest, meta

**Files:**
- Modify: `app/package.json` (qua npm install)
- Create: `app/scripts/gen-icons.mjs`
- Create: `app/public/pwa-192.png`, `app/public/pwa-512.png`, `app/public/pwa-maskable-512.png` (generate)
- Modify: `app/vite.config.ts`
- Modify: `app/index.html`

- [ ] **Step 1: Cài dependency**

Run: `cd app && npm install -D vite-plugin-pwa sharp`
Expected: cài xong, `package.json` có `vite-plugin-pwa` + `sharp` trong devDependencies.

- [ ] **Step 2: Script generate icons từ favicon.svg**

Create `app/scripts/gen-icons.mjs`:

```js
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(root, '../public/favicon.svg'));
const out = (f) => path.join(root, '../public', f);
const BG = '#0f9d60'; // primary emerald (Calm Fintech)

async function plain(size, file) {
  await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' }).png().toFile(out(file));
}

// maskable: icon thu nhỏ ~70% trên nền emerald (an toàn vùng safe-zone)
async function maskable(size, file) {
  const inner = Math.round(size * 0.7);
  const icon = await sharp(svg, { density: 384 }).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: icon, gravity: 'center' }]).png().toFile(out(file));
}

await plain(192, 'pwa-192.png');
await plain(512, 'pwa-512.png');
await maskable(512, 'pwa-maskable-512.png');
console.log('icons generated');
```

- [ ] **Step 3: Chạy script, kiểm tra 3 file PNG tạo ra**

Run: `cd app && node scripts/gen-icons.mjs`
Expected: in "icons generated"; tồn tại `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`.

Nếu `sharp` không render được SV (lỗi density/font): fallback tạo icon đặc nền emerald với chữ "W" trắng bằng sharp `create` + SVG text buffer. Chỉ dùng fallback nếu Step này lỗi.

- [ ] **Step 4: Cấu hình VitePWA trong vite.config.ts**

Thay nội dung `app/vite.config.ts` thành:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WNAP — Ngân sách',
        short_name: 'WNAP',
        description: 'Ngân sách zero-based cho gia đình',
        lang: 'vi',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#0f9d60',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // KHÔNG cache Supabase (REST/realtime/auth) — luôn đi mạng để dữ liệu không cũ
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Thêm meta PWA vào index.html**

Trong `app/index.html`, đổi block `<head>` (giữ các dòng có sẵn, thêm theme-color + apple) thành:

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/pwa-192.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f9d60" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="WNAP" />
    <title>WNAP — Ngân sách</title>
  </head>
```

- [ ] **Step 6: Verify build (manifest + SW sinh ra)**

Run: `cd app && npm run build`
Expected: build thành công; thư mục `dist/` có `manifest.webmanifest`, `sw.js`, `workbox-*.js`, và 3 file `pwa-*.png`.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/package-lock.json app/scripts/gen-icons.mjs app/public/pwa-192.png app/public/pwa-512.png app/public/pwa-maskable-512.png app/vite.config.ts app/index.html
git commit -m "feat(pwa): installable PWA via vite-plugin-pwa (manifest, icons, SW shell-cache)"
```

---

### Task 7: Verify end-to-end (375px + PWA installable)

**Files:** không sửa code; chỉ verify.

- [ ] **Step 1: Full test + build**

Run: `cd app && npm test && npm run build`
Expected: 110 passed; build thành công.

- [ ] **Step 2: Chạy preview server**

Run (background): `cd app && npm run preview`
Expected: server lên ở `http://localhost:4173` (ghi lại port thực tế).

- [ ] **Step 3: Playwright — login + screenshot Plan ở 375px**

Dùng Playwright MCP: `browser_resize` 375x812 → `browser_navigate` tới preview URL → login (credentials Phase 0) → vào tab Kế hoạch → `browser_take_screenshot` (`mobile-plan.png`). Kiểm tra: bảng không tràn ngang, 3 cột (Category/Assigned/Available) hiển thị, RTA pill gọn.

- [ ] **Step 4: Playwright — screenshot Ledger card + 1 modal ở 375px**

Sang tab Sổ giao dịch → chọn 1 account → `browser_take_screenshot` (`mobile-ledger.png`): giao dịch hiện dạng card xếp dọc. Mở 1 modal (vd Phân bổ) → screenshot (`mobile-modal.png`): modal nằm trong màn, scroll được, không tràn mép.

- [ ] **Step 5: Verify PWA installable**

Dùng `browser_evaluate` trên preview URL kiểm tra:
```js
() => ({
  hasManifest: !!document.querySelector('link[rel="manifest"]'),
  sw: 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'controlled' : 'registered-or-pending') : 'unsupported',
})
```
Và fetch `/manifest.webmanifest` → JSON có `name`, `icons` (3 mục), `display: 'standalone'`, `theme_color: '#0f9d60'`.
Expected: `hasManifest: true`, manifest hợp lệ, SW đăng ký.

- [ ] **Step 6: Console sạch**

`browser_console_messages` → 0 error (cảnh báo workbox về dev/preview chấp nhận được).

- [ ] **Step 7: Desktop không regression**

`browser_resize` 1280x800 → reload → screenshot Plan + Ledger (`desktop-plan.png`, `desktop-ledger.png`): bảng 8 cột Ledger + 4 cột Plan trở lại như cũ.

- [ ] **Step 8: Tổng kết**

Nếu tất cả pass: báo cáo kết quả + đường dẫn screenshot. Không cần commit screenshot verify (giữ ngoài git hoặc xóa).

---

## Self-Review notes

- **Spec coverage:** §2 Ledger card → Task 1; Ledger sidebar/form → Task 2; §3 CategoryTable + modals + inputMode → Task 3, 5; PlanScreen/FilterCards → Task 4 (FilterCards đã `flex-wrap` sẵn, không cần sửa — verify ở Task 7); §4 nav tabs → Task 4; §5 PWA → Task 6; §6 verify → Task 7. ✅
- **Deviation từ spec:** (1) Sidebar mobile dùng **stacked full-width** (align breakpoint) thay vì "chips cuộn ngang" — đơn giản & ít rủi ro hơn, danh sách account ngắn. (2) AssignPopover 7 nút Auto đã **stack dọc full-width** sẵn (đủ tốt mobile) → bỏ ý "grid-cols-2". (3) Modal width đã safe sẵn trong shadcn `DialogContent` → chỉ thêm `max-h`+scroll. Sẽ nêu khi handoff.
- **Type consistency:** `TransactionCard` props khớp chỗ gọi; `LedgerTxn` từ `../lib/mappers`; không thêm type mới.
- **Không placeholder.** Mọi step có code/command cụ thể.
