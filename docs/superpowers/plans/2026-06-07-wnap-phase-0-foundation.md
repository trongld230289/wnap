# WNAP Phase 0: Foundation (Scaffold + Supabase + Auth + Budget/Invite) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hai user đăng nhập được vào WNAP, tạo/join chung 1 budget qua invite code, schema + RLS đầy đủ trên Supabase.

**Architecture:** Vite + React + TS app trong `app/`, Supabase hosted (PostgreSQL + Auth), schema theo spec §3 với `budget_id` denormalize trên mọi bảng (đơn giản hóa RLS + realtime filter sau này). Mutation nhiều bước qua RPC SECURITY DEFINER. UI Phase 0 chỉ cần chạy được — KHÔNG style đẹp (Phase 2–3 sẽ dùng design skill).

**Tech Stack:** Vite, React 18, TypeScript, Vitest, @supabase/supabase-js v2, Supabase hosted (free tier).

**Spec:** `docs/superpowers/specs/2026-06-07-wnap-design.md`

**Lưu ý tiền tệ:** mọi amount là BIGINT VND (số nguyên).

---

## File Structure

```
Finance-Tracker/
  app/                          ← Vite app (Task 1)
    .env.local                  ← Supabase keys (KHÔNG commit)
    src/
      lib/supabase.ts           ← Supabase client (Task 2)
      hooks/useSession.ts       ← auth session hook (Task 5)
      pages/AuthPage.tsx        ← sign in/up (Task 5)
      pages/SetupPage.tsx       ← create/join budget (Task 6)
      pages/BudgetHome.tsx      ← budget + members + invite (Task 6)
      App.tsx                   ← gate: auth → setup → home (Task 5, 6)
  supabase/
    migrations/
      0001_schema.sql           ← tables (Task 3)
      0002_rls.sql              ← RLS policies (Task 4)
      0003_rpcs.sql             ← create_budget / generate_invite / join_budget (Task 4)
```

---

### Task 1: Scaffold Vite app + Vitest

**Files:**
- Create: `app/` (Vite template), `app/src/engine/__tests__/sanity.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Scaffold**

```powershell
npm create vite@latest app -- --template react-ts
cd app
npm install
npm install -D vitest
```

- [ ] **Step 2: Thêm test script vào `app/package.json`** (trong `"scripts"`):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Sanity test** — tạo `app/src/engine/__tests__/sanity.test.ts`:

```ts
import { expect, test } from 'vitest';

test('vitest hoạt động', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Verify**

Run (trong `app/`): `npm test` → Expected: `1 passed`
Run: `npm run dev` → Expected: mở http://localhost:5173 thấy trang Vite mặc định. Ctrl+C tắt.

- [ ] **Step 5: Verify `.gitignore`** — `app/.gitignore` (Vite tạo sẵn) phải chứa `node_modules` và `*.local` (cover `.env.local`). Nếu thiếu `*.local` thì thêm.

- [ ] **Step 6: Commit**

```powershell
git add app
git commit -m "feat: scaffold Vite + React + TS app with Vitest"
```

---

### Task 2: Supabase project + client

**Files:**
- Create: `app/.env.local` (không commit), `app/src/lib/supabase.ts`

- [ ] **Step 1 (MANUAL — cần user):** Tạo Supabase project
  1. Vào https://supabase.com → New project, tên `wnap`, region **Southeast Asia (Singapore)**, đặt DB password (lưu lại).
  2. Settings → API: copy **Project URL** và **anon public key**.
  3. Authentication → Providers → Email: **tắt "Confirm email"** (app gia đình, khỏi xác nhận mail).

- [ ] **Step 2: Cài supabase-js** (trong `app/`):

```powershell
npm install @supabase/supabase-js
```

- [ ] **Step 3: Tạo `app/.env.local`** (thay giá trị thật):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 4: Tạo `app/src/lib/supabase.ts`:**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
```

- [ ] **Step 5: Verify không leak key**

Run: `git status --short` → Expected: KHÔNG thấy `.env.local` trong danh sách.

- [ ] **Step 6: Commit**

```powershell
git add app
git commit -m "feat: add supabase client"
```

---

### Task 3: Database schema

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

**Ghi chú thiết kế:** `budget_id` được denormalize lên categories/targets/target_snoozes/transactions/assignments dù suy ra được qua FK — để RLS chỉ cần 1 hàm `is_budget_member(budget_id)` và realtime filter `budget_id=eq.X` (Phase 4). App chịu trách nhiệm điền đúng khi insert.

- [ ] **Step 1: Tạo `supabase/migrations/0001_schema.sql`:**

```sql
-- WNAP schema (spec §3)
create table budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table budget_members (
  budget_id uuid not null references budgets(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (budget_id, user_id)
);

create table budget_invites (
  code text primary key,
  budget_id uuid not null references budgets(id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  used_by uuid
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','savings')),
  reconciled_at timestamptz,
  sort_order int not null default 0,
  closed boolean not null default false
);

create table category_groups (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_system boolean not null default false
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  group_id uuid not null references category_groups(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  kind text not null default 'other' check (kind in ('bill','need','saving','other')),
  icon text,
  is_system boolean not null default false
);

create table targets (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null unique references categories(id) on delete cascade,
  strategy text not null check (strategy in ('set_aside','refill','have_balance')),
  amount bigint not null check (amount > 0),
  cadence text not null check (cadence in ('weekly','monthly','yearly','custom')),
  due_day smallint check (due_day between 1 and 31),
  due_weekday smallint check (due_weekday between 0 and 6),
  due_date date,
  created_at timestamptz not null default now(),
  -- have_balance/yearly/custom bắt buộc có deadline (spec §4b)
  constraint deadline_required check (
    (strategy = 'have_balance' or cadence in ('yearly','custom')) = (due_date is not null)
  )
);

create table target_snoozes (
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month char(7) not null,
  primary key (category_id, month)
);

create table payees (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  date date not null,
  payee_id uuid references payees(id),
  category_id uuid references categories(id),
  memo text,
  amount bigint not null,
  status text not null default 'uncleared' check (status in ('uncleared','cleared','reconciled')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table assignments (
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month char(7) not null,
  assigned bigint not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (category_id, month)
);

create table action_log (
  id bigint generated always as identity primary key,
  budget_id uuid not null references budgets(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity_ref jsonb,
  old_value bigint,
  new_value bigint,
  created_at timestamptz not null default now()
);

create index idx_transactions_budget_date on transactions (budget_id, date);
create index idx_assignments_budget_month on assignments (budget_id, month);
create index idx_action_log_budget on action_log (budget_id, created_at desc);
```

- [ ] **Step 2: Apply migration** — chọn 1 trong 2:
  - **Cách A (đơn giản):** Supabase Dashboard → SQL Editor → paste toàn bộ file → Run.
  - **Cách B (CLI):** `npx supabase init` (ở repo root, nếu hỏi ghi đè folder supabase thì No — giữ migrations), `npx supabase link --project-ref <ref>`, `npx supabase db push`.

- [ ] **Step 3: Verify**

Dashboard → Table Editor → Expected: thấy đủ 12 bảng (budgets … action_log).

- [ ] **Step 4: Commit**

```powershell
git add supabase
git commit -m "feat: add WNAP database schema migration"
```

---

### Task 4: RLS + RPC functions

**Files:**
- Create: `supabase/migrations/0002_rls.sql`, `supabase/migrations/0003_rpcs.sql`

- [ ] **Step 1: Tạo `supabase/migrations/0002_rls.sql`:**

```sql
-- Helper: SECURITY DEFINER để tránh đệ quy RLS trên budget_members
create or replace function is_budget_member(b uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from budget_members where budget_id = b and user_id = auth.uid()
  );
$$;

alter table budgets enable row level security;
alter table budget_members enable row level security;
alter table budget_invites enable row level security;
alter table accounts enable row level security;
alter table category_groups enable row level security;
alter table categories enable row level security;
alter table targets enable row level security;
alter table target_snoozes enable row level security;
alter table payees enable row level security;
alter table transactions enable row level security;
alter table assignments enable row level security;
alter table action_log enable row level security;

-- budgets: chỉ đọc; tạo qua RPC create_budget (security definer)
create policy budgets_select on budgets for select using (is_budget_member(id));

-- budget_members: đọc thành viên cùng budget; insert qua RPC
create policy members_select on budget_members for select using (is_budget_member(budget_id));

-- budget_invites: member đọc invite của budget mình; tạo/join qua RPC
create policy invites_select on budget_invites for select using (is_budget_member(budget_id));

-- Các bảng dữ liệu: member toàn quyền (cả 2 vợ chồng đều admin, spec Module D §3)
create policy accounts_all on accounts for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy groups_all on category_groups for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy categories_all on categories for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy targets_all on targets for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy snoozes_all on target_snoozes for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy payees_all on payees for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy transactions_all on transactions for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));
create policy assignments_all on assignments for all
  using (is_budget_member(budget_id)) with check (is_budget_member(budget_id));

-- action_log: member chỉ đọc (ghi bằng trigger/RPC ở Phase 3-4)
create policy actionlog_select on action_log for select using (is_budget_member(budget_id));
```

- [ ] **Step 2: Tạo `supabase/migrations/0003_rpcs.sql`:**

```sql
-- Tạo budget + membership + system category "Inflow: Ready to Assign" (spec §3)
create or replace function create_budget(p_name text, p_display_name text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  v_budget uuid;
  v_group uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into budgets (name, created_by) values (p_name, auth.uid())
    returning id into v_budget;
  insert into budget_members (budget_id, user_id, display_name)
    values (v_budget, auth.uid(), p_display_name);
  insert into category_groups (budget_id, name, is_system, sort_order)
    values (v_budget, 'System', true, 999) returning id into v_group;
  insert into categories (budget_id, group_id, name, is_system, kind)
    values (v_budget, v_group, 'Inflow: Ready to Assign', true, 'other');
  return v_budget;
end $$;

create or replace function generate_invite(p_budget uuid)
returns text language plpgsql security definer
set search_path = public as $$
declare v_code text;
begin
  if not is_budget_member(p_budget) then raise exception 'not a member'; end if;
  v_code := upper(substr(md5(random()::text), 1, 6));
  insert into budget_invites (code, budget_id, created_by)
    values (v_code, p_budget, auth.uid());
  return v_code;
end $$;

create or replace function join_budget(p_code text, p_display_name text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare v_budget uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select budget_id into v_budget from budget_invites
    where code = upper(trim(p_code)) and used_by is null;
  if v_budget is null then raise exception 'invalid or used invite code'; end if;
  update budget_invites set used_by = auth.uid() where code = upper(trim(p_code));
  insert into budget_members (budget_id, user_id, display_name)
    values (v_budget, auth.uid(), p_display_name)
    on conflict do nothing;
  return v_budget;
end $$;

grant execute on function create_budget(text, text) to authenticated;
grant execute on function generate_invite(uuid) to authenticated;
grant execute on function join_budget(text, text) to authenticated;
```

- [ ] **Step 3: Apply** cả 2 file (SQL Editor hoặc `npx supabase db push`).

- [ ] **Step 4: Verify RLS** — SQL Editor chạy:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```

Expected: 12 bảng đều `rowsecurity = true`.

- [ ] **Step 5: Commit**

```powershell
git add supabase
git commit -m "feat: add RLS policies and budget/invite RPC functions"
```

---

### Task 5: Auth UI (sign in / sign up)

**Files:**
- Create: `app/src/hooks/useSession.ts`, `app/src/pages/AuthPage.tsx`
- Modify: `app/src/App.tsx` (thay toàn bộ nội dung), `app/src/main.tsx` (xóa import `index.css` nếu gây lỗi — giữ mặc định Vite là được)

- [ ] **Step 1: Tạo `app/src/hooks/useSession.ts`:**

```ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}
```

- [ ] **Step 2: Tạo `app/src/pages/AuthPage.tsx`:**

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

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
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>WNAP</h1>
      <form onSubmit={submit}>
        <input
          type="email" placeholder="Email" value={email} required
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <input
          type="password" placeholder="Mật khẩu (≥6 ký tự)" value={password} required minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <button type="submit" disabled={busy}>
          {mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Thay `app/src/App.tsx`:**

```tsx
import { useSession } from './hooks/useSession';
import { AuthPage } from './pages/AuthPage';

export default function App() {
  const { session, loading } = useSession();
  if (loading) return <p>Đang tải…</p>;
  if (!session) return <AuthPage />;
  return <p>Đã đăng nhập: {session.user.email}</p>; // Task 6 thay bằng SetupPage/BudgetHome
}
```

- [ ] **Step 4: Verify thủ công**

Run: `npm run dev` → đăng ký tài khoản mới → Expected: thấy "Đã đăng nhập: <email>". Refresh trang → vẫn đăng nhập (session persist).

- [ ] **Step 5: Commit**

```powershell
git add app
git commit -m "feat: add email auth (sign in/up) with session gate"
```

---

### Task 6: Create/Join budget + BudgetHome

**Files:**
- Create: `app/src/pages/SetupPage.tsx`, `app/src/pages/BudgetHome.tsx`
- Modify: `app/src/App.tsx`

- [ ] **Step 1: Tạo `app/src/pages/SetupPage.tsx`:**

```tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function SetupPage({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [budgetName, setBudgetName] = useState('Ngân sách gia đình');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function createBudget() {
    setError('');
    const { error } = await supabase.rpc('create_budget', {
      p_name: budgetName, p_display_name: displayName,
    });
    if (error) setError(error.message); else onDone();
  }

  async function joinBudget() {
    setError('');
    const { error } = await supabase.rpc('join_budget', {
      p_code: code, p_display_name: displayName,
    });
    if (error) setError(error.message); else onDone();
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>Thiết lập WNAP</h2>
      <input placeholder="Tên hiển thị của bạn" value={displayName} required
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 16 }} />
      <h3>Tạo budget mới</h3>
      <input value={budgetName} onChange={(e) => setBudgetName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      <button disabled={!displayName} onClick={createBudget}>Tạo budget</button>
      <h3>Hoặc join bằng invite code</h3>
      <input placeholder="Mã 6 ký tự" value={code} onChange={(e) => setCode(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      <button disabled={!displayName || !code} onClick={joinBudget}>Join budget</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Tạo `app/src/pages/BudgetHome.tsx`:**

```tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Membership { budget_id: string; budget_name: string; }

export function BudgetHome({ budget }: { budget: Membership }) {
  const [members, setMembers] = useState<string[]>([]);
  const [invite, setInvite] = useState('');

  useEffect(() => {
    supabase.from('budget_members').select('display_name')
      .eq('budget_id', budget.budget_id)
      .then(({ data }) => setMembers((data ?? []).map((m) => m.display_name)));
  }, [budget.budget_id]);

  async function makeInvite() {
    const { data, error } = await supabase.rpc('generate_invite', { p_budget: budget.budget_id });
    setInvite(error ? error.message : (data as string));
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>{budget.budget_name}</h2>
      <p>Thành viên: {members.join(', ')}</p>
      <button onClick={makeInvite}>Tạo invite code</button>
      {invite && <p>Code: <strong>{invite}</strong> (gửi cho vợ/chồng bạn)</p>}
      <button onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
    </div>
  );
}
```

- [ ] **Step 3: Thay `app/src/App.tsx`:**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useSession } from './hooks/useSession';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { SetupPage } from './pages/SetupPage';
import { BudgetHome } from './pages/BudgetHome';

interface Membership { budget_id: string; budget_name: string; }

export default function App() {
  const { session, loading } = useSession();
  const [budget, setBudget] = useState<Membership | null>(null);
  const [checking, setChecking] = useState(true);

  const loadBudget = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase
      .from('budget_members')
      .select('budget_id, budgets(name)')
      .limit(1)
      .maybeSingle();
    setBudget(
      data ? { budget_id: data.budget_id, budget_name: (data.budgets as { name: string }).name } : null,
    );
    setChecking(false);
  }, []);

  useEffect(() => {
    if (session) loadBudget();
    else { setBudget(null); setChecking(false); }
  }, [session, loadBudget]);

  if (loading || checking) return <p>Đang tải…</p>;
  if (!session) return <AuthPage />;
  if (!budget) return <SetupPage onDone={loadBudget} />;
  return <BudgetHome budget={budget} />;
}
```

- [ ] **Step 4: Verify thủ công (deliverable Phase 0)**

1. `npm run dev`, đăng ký user 1 → tạo budget "Ngân sách gia đình" với tên hiển thị → thấy BudgetHome.
2. Bấm "Tạo invite code" → có code 6 ký tự.
3. Mở **cửa sổ ẩn danh**, đăng ký user 2 → nhập code + tên → Expected: vào đúng budget, danh sách thành viên hiện cả 2 người ở cả 2 cửa sổ (refresh).
4. SQL Editor: `select * from categories;` → Expected: có 1 dòng "Inflow: Ready to Assign" `is_system = true`.

- [ ] **Step 5: Commit**

```powershell
git add app
git commit -m "feat: add budget create/join flow and budget home"
```

---

## Phase 0 hoàn thành khi

- [ ] 2 user thật đăng nhập được, cùng thấy 1 budget qua invite code
- [ ] 12 bảng + RLS active, user ngoài budget không đọc được dữ liệu
- [ ] System category "Inflow: Ready to Assign" tự tạo kèm budget
- [ ] `.env.local` không nằm trong git history
