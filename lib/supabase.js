// lib/supabase.js - Supabase クライアントの初期化
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Load Supabase configuration from localStorage
let cfg = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
const stored = localStorage.getItem('supabaseConfig');
if (stored) {
   try { cfg = JSON.parse(stored); } catch(e) { console.error('Failed to parse Supabase config:', e); }
}
const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg;

// 設定が無い場合は null のまま
export let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
   supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
   console.warn('Supabase configuration missing; client not initialized.');
}

// ログイン (Supabase Auth のメールアドレスとパスワード)
// セッションは supabase-js が localStorage に保存し、期限が近づくと自動で更新する
// テーブルは RLS でログインした本人しか読み書きできない。未ログインの読み込みはエラーにならず空で返るので、読む前にこれで確かめる
export async function getSignedIn() {
   const { data, error } = await supabase.auth.getSession();
   return { signedIn: !!data.session, error };
}

export const signInWithPassword = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOutUser = () => supabase.auth.signOut();

// ログイン / ログアウトしたときに callback(ログイン中か) を呼ぶ (他のタブ・ウィンドウでの操作も届く)
// 画面の切り替えなどでも呼ばれることがあるので、受け取る側で前の状態と比べること
export function onAuthChange(callback) {
   supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
      // この中で supabase を呼ぶと待ち合わせで止まることがあるので、抜けてから呼ぶ
      setTimeout(() => callback(!!session), 0);
   });
}

// 1リクエストで要求する行数。サーバ側の上限 (既定 1000) がこれより小さくても動く
const PAGE_SIZE = 1000;

// テーブルの全行を取得する。1リクエストで返る行数には上限があるため、
// 総件数を見て、足りない分を残りのページとして取りにいく
// orderBy: 並び順にする列名の配列。ページの境目がずれないよう、組み合わせて一意になる列にすること
// match: 絞り込む条件 ({ 列名: 値 })。省略すると全行
export async function fetchAllRows(table, orderBy, match = {}) {
   const fetchPage = (from, size, withCount) => {
      let query = supabase.from(table).select('*', withCount ? { count: 'exact' } : undefined).match(match);
      orderBy.forEach(column => { query = query.order(column, { ascending: true }); });
      return query.range(from, from + size - 1);
   };

   const first = await fetchPage(0, PAGE_SIZE, true);
   if (first.error) return { data: null, error: first.error };

   // 実際に返ってきた行数を1ページの大きさとして扱う
   const size  = first.data.length;
   const total = first.count ?? size;
   if (size === 0 || size >= total) return { data: first.data, error: null };

   const starts = [];
   for (let from = size; from < total; from += size) starts.push(from);
   const rest = await Promise.all(starts.map(from => fetchPage(from, size, false)));

   const failed = rest.find(res => res.error);
   if (failed) return { data: null, error: failed.error };

   return { data: first.data.concat(...rest.map(res => res.data)), error: null };
}
