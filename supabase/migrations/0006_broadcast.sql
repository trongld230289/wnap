-- 0006_broadcast.sql — Realtime Broadcast cho đồng bộ budget (Module D, thay postgres_changes)
-- Lý do: postgres_changes + RLS không gửi event (auth.uid() không pass trong RLS check WAL).
-- Broadcast dùng authorization qua private channel (kiểm RLS realtime.messages lúc subscribe).

-- 1) Authorization: budget member được NHẬN broadcast trên topic 'budget:<budget_id>'.
drop policy if exists "budget members receive broadcast" on realtime.messages;
create policy "budget members receive broadcast"
on realtime.messages
for select
to authenticated
using (
  realtime.topic() like 'budget:%'
  and public.is_budget_member( split_part(realtime.topic(), ':', 2)::uuid )
);

-- 2) Hàm trigger: phát broadcast 'db_change' tới topic 'budget:<budget_id>' mỗi khi có thay đổi.
create or replace function public.broadcast_budget_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
begin
  if tg_op = 'DELETE' then bid := old.budget_id; else bid := new.budget_id; end if;
  perform realtime.broadcast_changes(
    'budget:' || bid::text, -- topic
    'db_change',            -- event name (client lắng nghe)
    tg_op,                  -- operation
    tg_table_name,          -- table
    tg_table_schema,        -- schema
    new,
    old
  );
  return null;
end;
$$;

-- 3) Gắn trigger AFTER INSERT/UPDATE/DELETE cho 8 bảng của budget.
do $$
declare t text;
begin
  foreach t in array array[
    'category_groups','categories','targets','target_snoozes',
    'assignments','transactions','accounts','payees'
  ] loop
    execute format('drop trigger if exists broadcast_budget_change on public.%I', t);
    execute format(
      'create trigger broadcast_budget_change after insert or update or delete on public.%I for each row execute function public.broadcast_budget_change()',
      t
    );
  end loop;
end $$;
