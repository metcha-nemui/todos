// model/diaries.js - diaries テーブルの読み書き
import { supabase } from '../lib/supabase.js';

export async function fetchDiaries() {
   const { data, error } = await supabase.from('diaries').select('*');
   if (error) return { data: null, error };

   return {
      data: data.map(row => ({
         date: row.entry_date,
         content: row.content,
      })),
      error: null
   };
}

export const upsertDiary = (date, content) => supabase
   .from('diaries')
   .upsert({
      entry_date: date,
      content: content,
   });

export const deleteDiary = (date) => supabase
   .from('diaries')
   .delete()
   .eq("entry_date", date);
