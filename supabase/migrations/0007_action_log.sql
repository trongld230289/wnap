-- 0007_action_log.sql — Ghi action_log khi phân bổ tiền (assign/move/auto). Module D §5d.
create or replace function public.log_assignment_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(new.assigned, 0) = 0 then return null; end if;
  if tg_op = 'UPDATE' and new.assigned is not distinct from old.assigned then return null; end if;
  insert into action_log (budget_id, user_id, action, entity_ref, old_value, new_value)
  values (
    new.budget_id,
    auth.uid(),
    'assign',
    jsonb_build_object('category_id', new.category_id, 'month', new.month),
    case when tg_op = 'UPDATE' then old.assigned else null end,
    new.assigned
  );
  return null;
end; $$;

drop trigger if exists log_assignment_change on assignments;
create trigger log_assignment_change
after insert or update on assignments
for each row execute function public.log_assignment_change();
