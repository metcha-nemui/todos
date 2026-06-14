import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Hardcoded Supabase configuration (replace with your own project details)
const SUPABASE_URL      = window.MY_APP_CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.MY_APP_CONFIG.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const getTodayDateString = () => {
   const now = new Date();
   const yyyy = now.getFullYear();
   const mm = String(now.getMonth() + 1).padStart(2, '0');
   const dd = String(now.getDate()).padStart(2, '0');
   return `${yyyy}-${mm}-${dd}`;
};

const DEFAULT_DATE = getTodayDateString();

export class TodoModel {
   constructor() {
      this.todos = [];
      this.currentDate = null; // will be set after loading
      this.onChangeCallback = null;
      // Load all todos from Supabase and set current date to today if not stored
      this._loadFromSupabase();
   }
   
   bindOnChange(callback) {
      this.onChangeCallback = callback;
   }
   
   async _loadFromSupabase() {
      const { data, error } = await supabase.from('todos').select('*');
      if (error) {
         console.error('Failed to load todos from Supabase:', error);
         this.todos = [];
      } else {
         // Supabase returns rows matching the table definition
         this.todos = data.map(row => ({
            id: row.id,
            title: row.title,
            is_done: row.is_done,
            due_date: row.due_date,
            done_at: row.done_at,
            created_at: row.created_at,
            sort_order: row.sort_order,
         }));
      }
      this.currentDate = getTodayDateString();
      // Notify UI after loading
      this._commit();
   }
   
   _commit() {
      if(this.onChangeCallback) this.onChangeCallback();
   }
   
   // 日付コントロール
   setCurrentDate(newDateString) {
      this.currentDate = newDateString;
      this._commit();
   }
   
   // タスク操作
   async addTodo(title, dueDate = null) {
      const targetDate = dueDate;
      
      // 同一日付内の最大の sort_order を取得
      const sameDayTasks = this.todos.filter(t => t.due_date === targetDate);
      const maxOrder = sameDayTasks.reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      // 1. まず Supabase に投げる用のオブジェクトを作成 (id は含めない)
      const todoForSupabase = {
         title: title,
         is_done: false,
         due_date: targetDate,
         done_at: null,
         created_at: new Date().toISOString(),
         sort_order: maxOrder + 1,
      };
      
      // 2. upsert ではなく insert を使い、新しく生成されたレコードを返してもらう
      const { data, error } = await supabase
         .from('todos')
         .insert([todoForSupabase])
         .select(); // 👈 これをつけることで、自動生成された UUID(id) を含むレコードが返ってきます
      
      if (error) {
         console.error('Supabase add error:', error);
         return; // エラーならローカル配列に追加しない
      }
      
      if (data && data.length > 0) {
         // 3. Supabase が生成した本物の ID を含んだオブジェクトをローカル配列に同期
         const insertedTodo = {
            id: data[0].id, // Supabaseが発行したUUID
            title: data[0].title,
            is_done: data[0].is_done,
            due_date: data[0].due_date,
            done_at: data[0].done_at,
            created_at: data[0].created_at,
            sort_order: data[0].sort_order,
         };
         
         this.todos.push(insertedTodo);
      }
      
      this._commit();
   }
   
   async editTodo(id, newTitle) {
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, title: newTitle } : todo
      );
      const { error } = await supabase.from('todos').update({ title: newTitle }).eq('id', id);
      if (error) console.error('Supabase edit error:', error);
      this._commit();
   }
   
   async deleteTodo(id) {
      this.todos = this.todos.filter(todo => todo.id !== id);
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) console.error('Supabase delete error:', error);
      this._commit();
   }
   
   async toggleTodo(id) {
      this.todos = await Promise.all(this.todos.map(async todo => {
         if (todo.id === id) {
            const updatedDone = !todo.is_done;
            const updated = {
               ...todo,
               is_done: updatedDone,
               done_at: updatedDone ? new Date().toISOString() : null,
            };
            const { error } = await supabase.from('todos').update({ is_done: updatedDone, done_at: updated.done_at }).eq('id', id);
            if (error) console.error('Supabase toggle error:', error);
            return updated;
         }
         return todo;
      }));
      this._commit();
   }
   
   async changeTodoDate(id, targetDate) {
      const maxOrder = this.todos
         .filter(t => t.due_date === targetDate)
         .reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, due_date: targetDate, sort_order: maxOrder + 1 } : todo
      );
      const { error } = await supabase.from('todos').update({ due_date: targetDate, sort_order: maxOrder + 1 }).eq('id', id);
      if (error) console.error('Supabase change date error:', error);
      this._commit();
   }
   
   async updateSortOrder(orderedIds) {
      const updates = orderedIds.map((id, index) => {
         const todo = this.todos.find(t => t.id === id);
         if (todo) {
            todo.sort_order = index;
            return supabase.from('todos').update({ sort_order: index }).eq('id', id);
         }
      }).filter(Boolean);
      const results = await Promise.all(updates);
      results.forEach(res => { if (res.error) console.error('Supabase sort update error:', res.error); });
      this._commit();
   }
   
   // ゲッター群
   getTodayTodos() {
      return this.todos
         .filter(t => t.due_date === this.currentDate && !t.is_done)
         .sort((a, b) => a.sort_order - b.sort_order);
   }
   
   getTodayDones() {
      return this.todos
         .filter(t => t.due_date === this.currentDate && t.is_done)
         .sort((a, b) => a.sort_order - b.sort_order);
   }
   getBacklogTodosGrouped() {
      const noDateTasks = this.todos.filter(t => !t.due_date);
      const futureTasks = this.todos.filter(t => t.due_date && t.due_date > this.currentDate);
      
      const groups = {};
      
      if (noDateTasks.length > 0) {
         groups["日付なし"] = noDateTasks;
      }
      
      futureTasks.forEach(task => {
         if (!groups[task.due_date]) groups[task.due_date] = [];
         groups[task.due_date].push(task);
      });
      
      // 「日付なし」を先頭にし、それ以外の日付を昇順でソート
      const sortedKeys = Object.keys(groups).sort((a, b) => {
         if (a === "日付なし") return -1;
         if (b === "日付なし") return 1;
         return a.localeCompare(b);
      });
      
      return sortedKeys.reduce((obj, key) => {
         obj[key] = groups[key];
         return obj;
      }, {});
   }
   
   getAllStorageItems() {
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
         const key = localStorage.key(i);
         const value = localStorage.getItem(key);
         items.push({ key, value });
      }
      return items.sort((a, b) => a.key.localeCompare(b.key));
   }
   
   async clearAllStorage() {
      // Delete all todos from Supabase
      const { error } = await supabase.from('todos').delete().neq('id', '');
      if (error) console.error('Supabase clear all error:', error);
      this.todos = [];
      this.currentDate = DEFAULT_DATE;
      this._commit();
   }
   
   async removeStorageKey(key) {
      // No longer using localStorage keys; handle specific keys if needed.
      if (key === 'mvp_todos') {
         // Delete all todos from Supabase
         const { error } = await supabase.from('todos').delete().neq('id', '');
         if (error) console.error('Supabase clear todos error:', error);
         this.todos = [];
      } else if (key === 'mvp_current_date') {
         this.currentDate = DEFAULT_DATE;
      }
      this._commit();
   }
}
