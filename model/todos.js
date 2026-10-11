// model/todos.js - todos テーブルの読み書きと並び順ルール
import { supabase } from '../lib/supabase.js';

// DBの行 → アプリ内で扱うタスク
const rowToTodo = (row) => ({
   id: row.id,
   title: row.title,
   is_done: row.is_done,
   due_date: row.due_date,
   done_at: row.done_at,
   created_at: row.created_at,
   sort_order: row.sort_order,
});

// 条件に合うタスク群の末尾に置くための sort_order
export const nextSortOrder = (todos, predicate) =>
   todos.filter(predicate).reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1) + 1;

// 1リクエスト1000件までのため2回に分けて取得
export async function fetchTodos() {
   const [res1, res2] = await Promise.all([
      supabase.from('todos').select('*').range(   0,  999).order('created_at', { ascending: true }),
      supabase.from('todos').select('*').range(1000, 1999).order('created_at', { ascending: true })
   ]);

   const error = res1.error || res2.error;
   if (error) return { data: null, error };

   const allData = [...(res1.data || []), ...(res2.data || [])];
   return { data: allData.map(rowToTodo), error: null };
}

// 追加されたタスクを data で返す
export async function insertTodo(todo) {
   const { data, error } = await supabase
      .from('todos')
      .insert([todo])
      .select();

   if (error) return { data: null, error };

   const inserted = (data && data.length > 0) ? rowToTodo(data[0]) : null;
   return { data: inserted, error: null };
}

export const updateTodo = (id, fields) => supabase.from('todos').update(fields).eq('id', id);

export const deleteTodo = (id) => supabase.from('todos').delete().eq('id', id);
