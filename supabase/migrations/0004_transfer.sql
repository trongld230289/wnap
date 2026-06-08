-- Liên kết 2 dòng của 1 transfer giữa account (Module B C2)
alter table transactions add column if not exists transfer_id uuid;
create index if not exists idx_transactions_transfer on transactions (transfer_id);
