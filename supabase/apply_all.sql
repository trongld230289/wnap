-- ============================================================
-- WNAP - File gộp 3 migration để dán 1 lần vào Supabase SQL Editor
-- (chỉ dùng để copy-paste thủ công; nguồn thật là 3 file trong migrations/)
-- ============================================================

-- ============ 0001_schema.sql ============
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

-- ============ 0002_rls.sql ============
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
create policy budgets_select on budgets for select using (is_budget_member(id));
create policy members_select on budget_members for select using (is_budget_member(budget_id));
create policy invites_select on budget_invites for select using (is_budget_member(budget_id));
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
create policy actionlog_select on action_log for select using (is_budget_member(budget_id));

-- ============ 0003_rpcs.sql ============
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
