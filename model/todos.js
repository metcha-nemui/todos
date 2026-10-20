// model/todos.js - タスク (kind 'todo') の読み書きと並び順ルール
import * as records from './records.js';

const KIND = 'todo';

// レコード → アプリ内で扱うタスク。足りない項目は既定値で補う
const recordToTodo = ({ id, data }) => ({
   id: id,
   title: data.title ?? '',
   is_done: data.is_done ?? false,
   due_date: data.due_date ?? null,
   done_at: data.done_at ?? null,
   created_at: data.created_at ?? null,
   sort_order: data.sort_order ?? 0,
});

// タスク → レコードの data (id は主キー側に持つ)
const todoToData = ({ id, ...data }) => data;

// 条件に合うタスク群の末尾に置くための sort_order
export const nextSortOrder = (todos, predicate) =>
   todos.filter(predicate).reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1) + 1;

// 全タスクを作成順に返す
export async function fetchTodos() {
   const { data, error } = await records.fetchRecords(KIND);
   if (error) return { data: null, error };

   const todos = data.map(recordToTodo)
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id));
   return { data: todos, error: null };
}

// 追加されたタスクを data で返す
export async function insertTodo(todo) {
   const { data, error } = await insertTodos([todo]);
   return { data: data ? data[0] : null, error };
}

// 複数のタスクを1リクエストで追加し、追加されたタスクの配列を data で返す (id はここで振る)
export async function insertTodos(todos) {
   const created = todos.map(todo => ({ ...todo, id: crypto.randomUUID() }));
   const { error } = await records.insertRecords(KIND, created.map(todo => ({ id: todo.id, data: todoToData(todo) })));
   if (error) return { data: null, error };

   return { data: created, error: null };
}

// 変更後のタスク全体を受け取り、丸ごと書き込む
export const updateTodo = (todo) => records.updateRecord(KIND, todo.id, todoToData(todo));

export const deleteTodo = (id) => records.deleteRecord(KIND, id);
