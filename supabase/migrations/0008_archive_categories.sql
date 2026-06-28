-- Soft-delete (archive) for groups and categories.
-- Transactions reference categories without cascade, so hard delete is unsafe.
-- The Plan filters out archived rows; archived rows still satisfy historical FKs.

alter table category_groups add column archived boolean not null default false;
alter table categories add column archived boolean not null default false;

create index if not exists category_groups_active_idx on category_groups (budget_id) where archived = false;
create index if not exists categories_active_idx on categories (budget_id) where archived = false;
