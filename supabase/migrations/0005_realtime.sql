-- 0005_realtime.sql — Bật realtime cho các bảng của budget (Module D)
-- Idempotent: chỉ add bảng chưa có trong publication.
do $$
declare t text;
begin
  foreach t in array array[
    'category_groups','categories','targets','target_snoozes',
    'assignments','transactions','accounts','payees'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
