// model/backup.js - 全テーブルの JSON バックアップと復元 (スキーマの版ごとの変換を含む)
import { supabase, fetchAllRows } from '../lib/supabase.js';

// 今の DB スキーマの版。スキーマを変えたら 1 上げ、MIGRATIONS に変換を足す
export const SCHEMA_VERSION = 0;

// 対象テーブルと、全行取得の並び順 (組み合わせて一意になる列)
// 復元はこの順に書き込む。外部キーを持つテーブルは参照先より後ろに置くこと
const TABLES = {
   templates: ['name'],
   diaries:   ['entry_date'],
   todos:     ['created_at', 'id'],
};

// MIGRATIONS[n]: 版 n のバックアップの tables を受け取り、版 n+1 の tables を返す
// 例: 版 0 → 1 で todos.title を name に改名する場合
//    0: (tables) => ({ ...tables, todos: tables.todos.map(({ title, ...row }) => ({ ...row, name: title })) }),
const MIGRATIONS = {
};

// 1リクエストで書き込む行数
const INSERT_CHUNK_SIZE = 500;

// DB の行をそのまま (アプリ内の形に変換せず) 書き出す
export async function exportBackup() {
   const tables = {};
   for (const [table, orderBy] of Object.entries(TABLES)) {
      const { data, error } = await fetchAllRows(table, orderBy);
      if (error) return { data: null, error };
      tables[table] = data;
   }

   return {
      data: {
         app: 'todo-app',
         version: SCHEMA_VERSION,
         exported_at: new Date().toISOString(),
         tables,
      },
      error: null,
   };
}

// バックアップを今の版に変換して書き込む
// 混ざらないよう、書き込み先のテーブルが全て空のときだけ行う
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

   for (const table of Object.keys(TABLES)) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) return { error };
      if (count > 0) return { error: new Error(`${table} テーブルが空ではありません。空にしてから復元してください`) };
   }

   // 途中で失敗した場合、それまでに書き込んだ分は残る
   for (const table of Object.keys(TABLES)) {
      const rows = tables[table] || [];
      for (let from = 0; from < rows.length; from += INSERT_CHUNK_SIZE) {
         const { error } = await supabase.from(table).insert(rows.slice(from, from + INSERT_CHUNK_SIZE));
         if (error) return { error: new Error(`${table} の書き込みに失敗しました (${from}行目以降): ${error.message}`) };
      }
   }

   return { error: null };
}
