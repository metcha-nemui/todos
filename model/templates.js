// model/templates.js - templates テーブルの読み込み
import { supabase } from '../lib/supabase.js';

// テンプレート名の配列を返す (日本語順)
export async function fetchTemplates() {
   const { data, error } = await supabase.from('templates').select('*');
   if (error) return { data: null, error };

   const names = data.map(row => row.name);
   names.sort((a,b) => a.localeCompare(b, 'ja'));
   return { data: names, error: null };
}
