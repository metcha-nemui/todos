-- sql/drop_v0.sql - v0 のテーブルを全て削除する (v1 へ上げるとき用)
-- Supabase の SQL Editor に貼って実行する。元に戻せないので、先にアプリの「バックアップ」で JSON を保存しておくこと
-- テーブルに付いた RLS ポリシー・インデックスも一緒に消える

begin;

drop table if exists public.todos     cascade;
drop table if exists public.diaries   cascade;
drop table if exists public.templates cascade;

commit;
