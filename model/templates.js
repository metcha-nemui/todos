// model/templates.js - サジェスト候補 (kind 'template') の読み書き
// id は名前の変更に影響されないよう uuid とし、アプリ内では名前で扱う (名前の重複はアプリ側で防ぐ)
import { supabase } from '../lib/supabase.js';
import * as records from './records.js';

const KIND = 'template';

// 表示順 (日本語順)。サジェストと登録画面で共通
export const sortTemplateNames = (names) => [...names].sort((a,b) => a.localeCompare(b, 'ja'));

// テンプレート名の配列を返す (日本語順)
export async function fetchTemplates() {
   const { data, error } = await records.fetchRecords(KIND);
   if (error) return { data: null, error };

   return { data: sortTemplateNames(data.map(({ data }) => data.name ?? '')), error: null };
}

export const insertTemplate = (name) => records.insertRecords(KIND, [{ id: crypto.randomUUID(), data: { name } }]);

// 名前で対象を探して書き換える
export const renameTemplate = (oldName, newName) => supabase
   .from(records.TABLE)
   .update({ data: { name: newName }, updated_at: new Date().toISOString() })
   .eq('kind', KIND)
   .eq('data->>name', oldName);

export const deleteTemplate = (name) => supabase
   .from(records.TABLE)
   .delete()
   .eq('kind', KIND)
   .eq('data->>name', name);
