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
