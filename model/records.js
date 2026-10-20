// model/records.js - このアプリのテーブル (todo_app) の読み書き
// 1行が1レコード。種別 (kind) と kind 内で一意の id を主キーとし、中身は data (jsonb) に持つ
// 項目の増減は data の中で行い、テーブルの列は変えない
import { supabase, fetchAllRows } from '../lib/supabase.js';

export const TABLE = 'todo_app';

const now = () => new Date().toISOString();

// kind のレコードを id 順に { id, data } の配列で返す
export async function fetchRecords(kind) {
   const { data, error } = await fetchAllRows(TABLE, ['id'], { kind });
   if (error) return { data: null, error };

   return { data: data.map(row => ({ id: row.id, data: row.data })), error: null };
}

// records: { id, data } の配列。1リクエストで追加する
export const insertRecords = (kind, records) => supabase
   .from(TABLE)
   .insert(records.map(({ id, data }) => ({ kind, id, data, updated_at: now() })));

// data を丸ごと置き換える。無ければ何もしない
export const updateRecord = (kind, id, data) => supabase
   .from(TABLE)
   .update({ data, updated_at: now() })
   .match({ kind, id });

// 無ければ追加し、あれば data を丸ごと置き換える
export const upsertRecord = (kind, id, data) => supabase
   .from(TABLE)
   .upsert({ kind, id, data, updated_at: now() });

export const deleteRecord = (kind, id) => supabase
   .from(TABLE)
   .delete()
   .match({ kind, id });
