-- =============================================
-- Supabase Storage バケット作成
-- Supabase SQL Editor で実行してください
-- =============================================

-- photos バケットを作成（公開アクセス可能）
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- アップロードポリシー: 認証ユーザーが自分のフォルダにアップロードできる
create policy "Users can upload photos" on storage.objects
  for insert
  with check (
    bucket_id = 'photos'
    and auth.role() = 'authenticated'
  );

-- 読み取りポリシー: 全員が読み取り可能（公開バケット）
create policy "Public read access for photos" on storage.objects
  for select
  using (bucket_id = 'photos');

-- 削除ポリシー: 自分がアップロードしたファイルを削除できる
create policy "Users can delete own photos" on storage.objects
  for delete
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
