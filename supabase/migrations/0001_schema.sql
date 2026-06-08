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
