// model/templates.js - templates テーブルの読み書き (主キーは name)
import { supabase, fetchAllRows } from '../lib/supabase.js';

// 表示順 (日本語順)。サジェストと登録画面で共通
export const sortTemplateNames = (names) => [...names].sort((a,b) => a.localeCompare(b, 'ja'));

// テンプレート名の配列を返す (日本語順)
export async function fetchTemplates() {
   const { data, error } = await fetchAllRows('templates', ['name']);
   if (error) return { data: null, error };

   return { data: sortTemplateNames(data.map(row => row.name)), error: null };
}

export const insertTemplate = (name) => supabase.from('templates').insert([{ name }]);

export const renameTemplate = (oldName, newName) => supabase.from('templates').update({ name: newName }).eq('name', oldName);

export const deleteTemplate = (name) => supabase.from('templates').delete().eq('name', name);
