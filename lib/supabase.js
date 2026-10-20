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
