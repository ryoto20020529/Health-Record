-- =============================================
-- ヘルスケア・トラッカー DB Schema V3
-- Apple Health 連携用トークン追加
-- Supabase SQL Editor で実行してください
-- =============================================

-- user_settings に health_sync_token カラムを追加
alter table user_settings
  add column if not exists health_sync_token text unique;

-- step_records テーブルが未作成の場合は作成
create table if not exists step_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  steps int not null default 0,
  calories_burned real default 0,
  source text default 'manual',
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table step_records enable row level security;

create policy "Users can manage own step records" on step_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
