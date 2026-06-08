# WNAP Phase 3A-1: Design Foundation + Shell + Auth/Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền design (Tailwind v4 + shadcn/ui + tokens Calm Fintech), thay primitive `Modal`/`AppTabs` bằng shadcn, restyle App shell + AuthPage + SetupPage — không đổi logic.

**Architecture:** Cài Tailwind v4 qua `@tailwindcss/vite`; cấu hình alias `@/`; viết `index.css` với design tokens (CSS variables + `@theme`); thêm component shadcn core. Restyle bằng cách đổi markup/className, giữ nguyên props/hành vi. Logic (`useSession`, `supabase`, engine) không đụng → 94 test giữ xanh.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui (Radix + cva + tailwind-merge + lucide-react).

**Spec:** `docs/superpowers/specs/2026-06-08-wnap-phase-3a-design-system-restyle-design.md` (§2 tokens, §3 nền, §5 plan 1).

**Prerequisite:** Phase 2 merged. App ở `app/`, hiện inline-style. `app/src/plan/Modal.tsx`, `app/src/nav/AppTabs.tsx`, `app/src/pages/AuthPage.tsx`, `app/src/pages/SetupPage.tsx`, `app/src/App.tsx` đã có. Mọi lệnh trong `app/`.

> **Lưu ý người thực thi:** Task 1–2 là cài/cấu hình tooling (có chạy CLI). Nếu một lệnh CLI hỏi tương tác hoặc lỗi version, DỪNG và báo (status BLOCKED) — đừng đoán. Config trong plan viết tay để hạn chế phụ thuộc CLI tương tác.

---

## File Structure

```
app/
  vite.config.ts            ← thêm tailwind plugin + alias @ (Task 1, MODIFY)
  tsconfig.json             ← thêm paths @/* (Task 1, MODIFY)
  tsconfig.app.json         ← thêm baseUrl + paths (Task 1, MODIFY)
  components.json           ← cấu hình shadcn (Task 2, NEW)
  src/
    index.css               ← @import tailwind + tokens Calm Fintech (Task 1, REPLACE)
    lib/utils.ts            ← cn() helper (Task 1, NEW)
    components/ui/*         ← component shadcn (Task 2, NEW qua CLI)
    plan/Modal.tsx          ← bọc shadcn Dialog, giữ API (Task 3, REPLACE)
    nav/AppTabs.tsx         ← shadcn Tabs, giữ API (Task 4, REPLACE)
    pages/AuthPage.tsx      ← restyle (Task 5, REPLACE)
    pages/SetupPage.tsx     ← restyle (Task 5, REPLACE)
    App.tsx                 ← restyle shell header (Task 6, MODIFY)
```

Test: `npm test` (94 phải giữ pass) · `npx tsc --noEmit` · `npm run build`.

---

### Task 1: Cài Tailwind v4 + tokens + alias

**Files:**
- Install deps; Modify `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`; Replace `src/index.css`; Create `src/lib/utils.ts`.

- [ ] **Step 1: Cài deps**

```bash
npm install tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

Expected: cài xong, không lỗi peer nghiêm trọng. (`@types/node` đã có sẵn cho alias path.)

- [ ] **Step 2: Thay `app/vite.config.ts`:**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Thêm `paths` vào `app/tsconfig.json`** (shadcn CLI đọc file này). Thay nội dung thành:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- [ ] **Step 4: Thêm `baseUrl` + `paths` vào `app/tsconfig.app.json`** — trong `compilerOptions`, thêm 2 dòng (giữ nguyên các option khác):

```json
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
```

(Đặt ngay sau dòng `"jsx": "react-jsx",`.)

- [ ] **Step 5: Tạo `app/src/lib/utils.ts`:**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Thay TOÀN BỘ `app/src/index.css`** bằng (Tailwind v4 + tokens Calm Fintech, theo chuẩn CSS-variables của shadcn):

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.75rem;
  --background: #ffffff;
  --foreground: #1a2230;
  --card: #ffffff;
  --card-foreground: #1a2230;
  --popover: #ffffff;
  --popover-foreground: #1a2230;
  --primary: #0f9d60;
  --primary-foreground: #ffffff;
  --secondary: #f7f8fa;
  --secondary-foreground: #1a2230;
  --muted: #f7f8fa;
  --muted-foreground: #6b7280;
  --accent: #ecfdf3;
  --accent-foreground: #0a7a4a;
  --destructive: #d23b3b;
  --border: #e6e8eb;
  --input: #e6e8eb;
  --ring: #0f9d60;
  /* status tokens (giữ nghĩa engine) */
  --status-red: #d23b3b;
  --status-amber: #d9a400;
  --status-green: #0f9d60;
  --status-gray: #9aa0a6;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-status-red: var(--status-red);
  --color-status-amber: var(--status-amber);
  --color-status-green: var(--status-green);
  --color-status-gray: var(--status-gray);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

* { border-color: var(--border); }
body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 7: Thêm font Inter** — cài `@fontsource/inter` và import trong `main.tsx`:

```bash
npm install @fontsource/inter
```

Sửa `app/src/main.tsx` — thêm dòng import font NGAY TRƯỚC `import './index.css'`:

```tsx
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
```

- [ ] **Step 8: Verify nền hoạt động** — tạo tạm class kiểm tra: chạy `npm run build`. Expected: build PASS (Tailwind plugin nhận, alias OK). Chạy `npx tsc --noEmit` → exit 0. Chạy `npm test` → 94 pass (CSS không ảnh hưởng test).

- [ ] **Step 9: Commit**

```bash
git add app/vite.config.ts app/tsconfig.json app/tsconfig.app.json app/src/index.css app/src/lib/utils.ts app/src/main.tsx app/package.json app/package-lock.json
git commit -m "feat(ui): set up Tailwind v4 + design tokens (Calm Fintech) + path alias"
```

---

### Task 2: Thêm component shadcn/ui core

**Files:**
- Create: `app/components.json`, `app/src/components/ui/*` (qua CLI).

- [ ] **Step 1: Tạo `app/components.json`** (cấu hình shadcn, viết tay để khỏi chạy `init` tương tác):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Thêm component qua CLI** (components.json đã có nên `add` chạy không cần init):

```bash
npx shadcn@latest add button dialog input label select tabs card badge tooltip sonner --yes
```

Expected: sinh các file trong `app/src/components/ui/` (button.tsx, dialog.tsx, input.tsx, label.tsx, select.tsx, tabs.tsx, card.tsx, badge.tsx, tooltip.tsx, sonner.tsx). Nếu CLI hỏi tương tác hoặc lỗi → DỪNG, báo BLOCKED (đừng đoán; có thể cần thêm `--overwrite` hoặc chỉ định registry).

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → exit 0. `npm run build` → PASS. `npm test` → 94 pass.

- [ ] **Step 4: Commit**

```bash
git add app/components.json app/src/components app/package.json app/package-lock.json
git commit -m "feat(ui): add shadcn/ui core components"
```

---

### Task 3: Modal.tsx → shadcn Dialog (giữ API)

**Files:**
- Modify (thay TOÀN BỘ): `app/src/plan/Modal.tsx`

Giữ NGUYÊN signature `{ title, onClose, children }` để 5 nơi gọi (AssignPopover, MoveMoneyModal, TargetEditorModal, ReconcileModal, TransferForm) không đổi.

- [ ] **Step 1: Thay `app/src/plan/Modal.tsx`:**

```tsx
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → exit 0. `npm test` → 94 pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/plan/Modal.tsx
git commit -m "feat(ui): back Modal with shadcn Dialog (same API)"
```

---

### Task 4: AppTabs.tsx → shadcn Tabs (giữ API)

**Files:**
- Modify (thay TOÀN BỘ): `app/src/nav/AppTabs.tsx`

Giữ NGUYÊN export `AppTab` + signature `{ tab, onChange }`.

- [ ] **Step 1: Thay `app/src/nav/AppTabs.tsx`:**

```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  return (
    <div className="mx-auto mt-2 max-w-[980px] px-3">
      <Tabs value={tab} onValueChange={(v) => onChange(v as AppTab)}>
        <TabsList>
          <TabsTrigger value="plan">Kế hoạch</TabsTrigger>
          <TabsTrigger value="ledger">Sổ giao dịch</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → exit 0. `npm test` → 94 pass.

- [ ] **Step 3: Commit**

```bash
git add app/src/nav/AppTabs.tsx
git commit -m "feat(ui): use shadcn Tabs for app navigation (same API)"
```

---

### Task 5: Restyle AuthPage + SetupPage

**Files:**
- Modify (thay TOÀN BỘ): `app/src/pages/AuthPage.tsx`, `app/src/pages/SetupPage.tsx`

Giữ NGUYÊN logic (supabase auth, props `onDone`); chỉ đổi trình bày sang shadcn + tokens.

- [ ] **Step 1: Thay `app/src/pages/AuthPage.tsx`:**

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">WNAP</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Mật khẩu (≥6 ký tự)" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Thay `app/src/pages/SetupPage.tsx`:**

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupPage({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [budgetName, setBudgetName] = useState('Ngân sách gia đình');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function createBudget() {
    setError('');
    const { error } = await supabase.rpc('create_budget', { p_name: budgetName, p_display_name: displayName });
    if (error) setError(error.message); else onDone();
  }
  async function joinBudget() {
    setError('');
    const { error } = await supabase.rpc('join_budget', { p_code: code, p_display_name: displayName });
    if (error) setError(error.message); else onDone();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Thiết lập WNAP</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Tên hiển thị của bạn</Label>
            <Input value={displayName} required onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">Tạo budget mới</Label>
            <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} />
            <Button disabled={!displayName} onClick={createBudget} className="w-full">Tạo budget</Button>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">Hoặc join bằng invite code</Label>
            <Input placeholder="Mã 6 ký tự" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="secondary" disabled={!displayName || !code} onClick={joinBudget} className="w-full">Join budget</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → exit 0. `npm test` → 94 pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/AuthPage.tsx app/src/pages/SetupPage.tsx
git commit -m "feat(ui): restyle Auth and Setup pages with shadcn + tokens"
```

---

### Task 6: Restyle App shell (header)

**Files:**
- Modify: `app/src/App.tsx` (chỉ phần JSX shell + loading; KHÔNG đụng logic session/budget)

- [ ] **Step 1: Sửa `app/src/App.tsx`** — thay 2 chỗ.

(a) Thêm import Button ở đầu (sau các import hiện có):

```tsx
import { Button } from '@/components/ui/button';
```

(b) Thay nhánh loading `if (loading || checking) return <p>Đang tải…</p>;` thành:

```tsx
  if (loading || checking) return <p className="p-10 text-muted-foreground">Đang tải…</p>;
```

(c) Thay khối `return ( <BudgetProvider ...> ... </BudgetProvider> );` cuối thành:

```tsx
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <header className="mx-auto flex max-w-[980px] items-center justify-between px-3 pt-3">
        <span className="text-lg font-bold text-primary">WNAP</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{budget.budget_name}</span>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Đăng xuất</Button>
        </div>
      </header>
      <AppTabs tab={tab} onChange={setTab} />
      {tab === 'plan' ? <PlanScreen /> : <LedgerScreen />}
    </BudgetProvider>
  );
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → exit 0. `npm test` → 94 pass. `npm run build` → PASS.

- [ ] **Step 3: Commit**

```bash
git add app/src/App.tsx
git commit -m "feat(ui): restyle app shell header with tokens"
```

---

### Task 7: End-to-end verify (Playwright screenshot)

**Files:** không tạo file; verify hình ảnh + hành vi.

- [ ] **Step 1:** `npm run dev`, mở app. Đăng xuất nếu đang đăng nhập để xem **AuthPage** mới.

- [ ] **Step 2:** Screenshot AuthPage (desktop 1280 + mobile 390) → giao diện Calm Fintech (card trắng, nút emerald, Inter). Đăng nhập tài khoản Phase 0.

- [ ] **Step 3:** Sau đăng nhập → header WNAP + tabs shadcn (Kế hoạch/Sổ giao dịch). Bấm chuyển tab → vẫn hoạt động (Plan/Ledger hiện ra — dù nội dung 2 màn chưa restyle, đó là Plan 3A-2/3A-3).

- [ ] **Step 4:** Mở 1 modal bất kỳ (vd ＋ Assign ở Plan) → Dialog shadcn hiện đúng, đóng được (Esc/click ngoài/✕). Hành vi không vỡ.

- [ ] **Step 5:** Không lỗi console đỏ (trừ 400 auth nếu có). Dừng dev server.

---

## 3A-1 hoàn thành khi

- [ ] `npm test` 94 pass, `npx tsc --noEmit` exit 0, `npm run build` PASS.
- [ ] Tailwind v4 + tokens hoạt động; alias `@/` resolve.
- [ ] shadcn core components có; `Modal`→Dialog, `AppTabs`→Tabs (API giữ nguyên, nơi gọi không đổi).
- [ ] AuthPage/SetupPage/App shell mang vibe Calm Fintech; mọi luồng cũ vẫn chạy.
- [ ] (Plan 3A-2) restyle Plan screen; (Plan 3A-3) restyle Ledger.
```
