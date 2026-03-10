-- =============================================
-- ヘルスケア・ビジュアル・トラッカー DB Schema
-- Supabase SQL Editor で実行してください
-- =============================================

-- user_settings テーブル
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  height real,
  weight real,
  age int,
  gender text,
  activity_level text,
  bmr real,
  tdee real,
  target_calories real,
  target_protein real,
  target_fat real,
  target_carbs real,
  updated_at timestamptz default now()
);

-- weight_records テーブル
create table if not exists weight_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  weight real not null,
  photo_url text,
  created_at timestamptz default now()
);

-- meal_records テーブル
create table if not exists meal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  meal_type text,
  name text,
  calories real,
  protein real,
  fat real,
  carbs real,
  photo_url text,
  created_at timestamptz default now()
);

-- exercise_records テーブル
create table if not exists exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  name text,
  duration int,
  calories_burned real,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) を有効化
alter table user_settings enable row level security;
alter table weight_records enable row level security;
alter table meal_records enable row level security;
alter table exercise_records enable row level security;

-- 各テーブルに自分のデータのみアクセスできるポリシーを作成
create policy "Users can manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own weight records" on weight_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own meal records" on meal_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage own exercise records" on exercise_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
