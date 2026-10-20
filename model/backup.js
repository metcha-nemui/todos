// model/backup.js - 全データの JSON バックアップと復元 (スキーマの版ごとの変換を含む)
import { supabase, fetchAllRows } from '../lib/supabase.js';
import { TABLE } from './records.js';

// データの形の版。互換のない変更 (項目の改名・意味の変更) をしたら 1 上げ、MIGRATIONS に変換を足す
// 項目の追加だけなら上げず、読み込み側 (model/todos.js 等) で既定値を補う
// v0: todos / diaries / templates の3テーブル
// v1: todo_app テーブル1つ (kind, id, data)
export const SCHEMA_VERSION = 1;

// MIGRATIONS[n]: 版 n のバックアップの tables を受け取り、版 n+1 の tables を返す
const MIGRATIONS = {
   0: ({ todos = [], diaries = [], templates = [] }) => ({
      [TABLE]: [
         { kind: '_meta', id: 'schema', data: { version: 1 } },
         ...todos.map(({ id, ...data }) => ({ kind: 'todo', id, data })),
         ...diaries.map(({ entry_date, content }) => ({ kind: 'diary', id: entry_date, data: { content } })),
         ...templates.map(({ name }) => ({ kind: 'template', id: crypto.randomUUID(), data: { name } })),
      ],
   }),
};

// 1リクエストで書き込む行数
const INSERT_CHUNK_SIZE = 500;

// DB の行をそのまま書き出す
export async function exportBackup() {
   const { data, error } = await fetchAllRows(TABLE, ['kind', 'id']);
   if (error) return { data: null, error };

   return {
      data: {
         app: 'todo-app',
         version: SCHEMA_VERSION,
         exported_at: new Date().toISOString(),
         tables: { [TABLE]: data },
      },
      error: null,
   };
}

// バックアップを今の版に変換して書き込む
// 混ざらないよう、テーブルが空のときだけ行う
// 失敗時は error.message にユーザー向けの理由を入れて返す
export async function importBackup(backup) {
   if (backup?.app !== 'todo-app' || !Number.isInteger(backup.version) || typeof backup.tables !== 'object') {
      return { error: new Error('このアプリのバックアップファイルではありません') };
   }
   if (backup.version > SCHEMA_VERSION) {
      return { error: new Error(`新しい版 (v${backup.version}) のバックアップです。アプリを更新してください`) };
   }

   let tables = backup.tables;
   for (let version = backup.version; version < SCHEMA_VERSION; version++) {
      tables = MIGRATIONS[version](tables);
   }

   const { count, error } = await supabase.from(TABLE).select('*', { count: 'exact', head: true });
   if (error) return { error };
   if (count > 0) return { error: new Error(`${TABLE} テーブルが空ではありません。空にしてから復元してください`) };

   // 途中で失敗した場合、それまでに書き込んだ分は残る
   const rows = tables[TABLE] || [];
   for (let from = 0; from < rows.length; from += INSERT_CHUNK_SIZE) {
      const { error } = await supabase.from(TABLE).insert(rows.slice(from, from + INSERT_CHUNK_SIZE));
      if (error) return { error: new Error(`${TABLE} の書き込みに失敗しました (${from}行目以降): ${error.message}`) };
   }

   return { error: null };
}
