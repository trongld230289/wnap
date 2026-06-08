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
