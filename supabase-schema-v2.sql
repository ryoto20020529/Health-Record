-- =============================================
-- ヘルスケア・トラッカー DB Schema V2
-- 追加テーブル: グループ活動フィード、歩数記録
-- Supabase SQL Editor で実行してください
-- =============================================

-- group_activity_feed テーブル（グループ内活動通知）
create table if not exists group_activity_feed (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups not null,
  user_id uuid references auth.users not null,
  user_name text not null,
  type text not null, -- 'exercise_complete', 'meal_logged', 'goal_achieved'
  message text not null,
  created_at timestamptz default now()
);

alter table group_activity_feed enable row level security;

-- グループメンバーのみフィードを閲覧可能
create policy "Members can read group feed" on group_activity_feed
  for select using (
    group_id in (select group_id from group_members where user_id = auth.uid())
  );

-- ユーザーは自分のフィードを投稿可能
create policy "Users can create feed entries" on group_activity_feed
  for insert with check (auth.uid() = user_id);

-- step_records テーブル（歩数記録）
create table if not exists step_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  steps int not null,
  calories_burned real,
  source text default 'manual', -- 'device' or 'manual'
  created_at timestamptz default now(),
  unique(user_id, date)
);

alter table step_records enable row level security;

create policy "Users can manage own step records" on step_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
