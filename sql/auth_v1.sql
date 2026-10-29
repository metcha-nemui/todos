-- sql/auth_v1.sql - todo_app をログインした本人だけが読み書きできるようにする
-- Supabase の SQL Editor に貼って実行する。create_v1.sql で作った既存のテーブルに対して1回だけ流す
-- 先に Supabase のダッシュボードで次を済ませておくこと
--   1. Authentication の設定で「Allow new users to sign up」をオフにする (自分以外がユーザーを作れないように)
--   2. Authentication → Users → Add user で自分のユーザーを作る (Auto Confirm)
-- 下の <YOUR_UID> を、Users に表示される自分の User UID に置き換えてから実行する
-- ログインした状態の通信は anon ではなく authenticated として扱われるので、これを流すまではログインすると何も読めない
-- (データは消えていない。ログインしないまま開くと読めないのはアプリ側で止めているため)

begin;

-- anon key だけでは何もできないようにする
drop policy "anon can read and write" on public.todo_app;
revoke all on public.todo_app from anon;

-- ログインしたユーザーのうち、自分だけを許可する (万一サインアップされても他人は触れない)
create policy "owner only" on public.todo_app
   for all to authenticated
   using (auth.uid() = '<YOUR_UID>'::uuid)
   with check (auth.uid() = '<YOUR_UID>'::uuid);

grant select, insert, update, delete on public.todo_app to authenticated;

commit;
