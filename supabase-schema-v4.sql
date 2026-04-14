-- =============================================
-- Schema V4: 筋トレトラッカー + フェーズモード
-- Supabase SQL Editor で実行してください
-- =============================================

-- 筋トレセット記録テーブル
create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  exercise_name text not null,
  muscle_group text not null,
  set_number int not null,
  reps int not null,
  weight_kg real not null default 0,
  created_at timestamptz default now()
);

alter table workout_sets enable row level security;

create policy "Users can manage own workout sets" on workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_settings にフェーズ列を追加
alter table user_settings
  add column if not exists phase text default 'maintain';
