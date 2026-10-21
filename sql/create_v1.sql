-- sql/create_v1.sql - v1 のテーブルを作る
-- Supabase の SQL Editor に貼って実行する。先に sql/drop_v0.sql で v0 のテーブルを消しておくこと
-- 1行が1レコード。中身は data (jsonb) に持ち、項目の増減ではテーブルを変えない
-- 別のプロダクトを同じ Supabase に置くときは、テーブル名を変えてこの SQL を流用する

begin;

create table public.todo_app (
   kind       text        not null,   -- 'todo' / 'diary' / 'template' / '_meta'
   id         text        not null,   -- kind の中で一意 (todo / template は uuid、diary は日付)
   data       jsonb       not null,
   updated_at timestamptz not null default now(),
   primary key (kind, id)
);

-- anon key で読み書きする (v0 と同じく、anon key を知っていれば誰でも読み書きできる)
alter table public.todo_app enable row level security;
create policy "anon can read and write" on public.todo_app
   for all to anon
   using (true)
   with check (true);

-- 2026-10-30 以降に作るテーブルには Data API の権限が自動で付かないので、明示的に付ける
grant select, insert, update, delete on public.todo_app to anon;

commit;
