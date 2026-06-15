import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Load Supabase configuration from localStorage
let cfg = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
const stored = localStorage.getItem('supabaseConfig');
if (stored) {
   try { cfg = JSON.parse(stored); } catch(e) { console.error('Failed to parse Supabase config:', e); }
}
const { SUPABASE_URL, SUPABASE_ANON_KEY } = cfg;
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
   supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
   console.warn('Supabase configuration missing; client not initialized.');
}

const getTodayDateString = () => {
   const now = new Date();
   const yyyy = now.getFullYear();
   const mm = String(now.getMonth() + 1).padStart(2, '0');
   const dd = String(now.getDate()).padStart(2, '0');
   return `${yyyy}-${mm}-${dd}`;
};

export class TodoModel {
   constructor() {
      this.todos = [];
      this.currentDate = null; // will be set after loading
      this.onChangeCallback = null;
      // Load all todos from Supabase and set current date
      this._loadFromSupabase();
   }
   
   bindOnChange(callback) {
      this.onChangeCallback = callback;
   }
   
   async _loadFromSupabase() {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const { data, error } = await supabase.from('todos').select('*');
      if (error) {
         console.error('Failed to load todos from Supabase:', error);
         this.todos = [];
      } else {
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
      
      // 【修正】localStorage から保存された日付の復元を試みる
      const savedDate = localStorage.getItem('todo_current_date');
      if (savedDate) {
         this.currentDate = savedDate;
      } else {
         this.currentDate = getTodayDateString();
      }
      
      // Notify UI after loading
      this._commit();
   }
   
   _commit() {
      if(this.onChangeCallback) this.onChangeCallback();
   }
   
   // 日付コントロール
   setCurrentDate(newDateString) {
      this.currentDate = newDateString;
      
      // 【修正】日付が変更されたら localStorage に保存する
      if (newDateString) {
         localStorage.setItem('todo_current_date', newDateString);
      } else {
         localStorage.removeItem('todo_current_date');
      }
      
      this._commit();
   }
   
   // タスク操作
   async addTodo(title, dueDate = null) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const targetDate = dueDate;
      
      const sameDayTasks = this.todos.filter(t => t.due_date === targetDate);
      const maxOrder = sameDayTasks.reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      const todoForSupabase = {
         title: title,
         is_done: false,
         due_date: targetDate,
         done_at: null,
         created_at: new Date().toISOString(),
         sort_order: maxOrder + 1,
      };
      
      const { data, error } = await supabase
         .from('todos')
         .insert([todoForSupabase])
         .select();
      
      if (error) {
         console.error('Supabase add error:', error);
         return;
      }
      
      if (data && data.length > 0) {
         const insertedTodo = {
            id: data[0].id,
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
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, title: newTitle } : todo
      );
      const { error } = await supabase.from('todos').update({ title: newTitle }).eq('id', id);
      if (error) console.error('Supabase edit error:', error);
      this._commit();
   }
   
   async deleteTodo(id) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.todos = this.todos.filter(todo => todo.id !== id);
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) console.error('Supabase delete error:', error);
      this._commit();
   }
   
   async toggleTodo(id) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.todos = await Promise.all(this.todos.map(async todo => {
         if (todo.id === id) {
            const updatedDone = !todo.is_done;
            
            let newOrder = todo.sort_order;
            if (updatedDone) {
               const todayDones = this.todos.filter(t => t.due_date === this.currentDate && t.is_done);
               const maxDoneOrder = todayDones.reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
               newOrder = maxDoneOrder + 1;
            } else {
               const todayTodos = this.todos.filter(t => t.due_date === this.currentDate && !t.is_done);
               const maxTodoOrder = todayTodos.reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
               newOrder = maxTodoOrder + 1;
            }
            
            const updated = {
               ...todo,
               is_done: updatedDone,
               done_at: updatedDone ? new Date().toISOString() : null,
               due_date: this.currentDate,
               sort_order: newOrder
            };
            
            const { error } = await supabase.from('todos').update({
               is_done: updatedDone,
               done_at: updated.done_at,
               due_date: updated.due_date,
               sort_order: updated.sort_order
            }).eq('id', id);
            
            if (error) console.error('Supabase toggle error:', error);
            return updated;
         }
         return todo;
      }));
      this._commit();
   }
   
   async changeTodoDate(id, targetDate) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
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
      if (!supabase) { console.warn('Supabase not configured'); return; }
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
      const noDateTasks = this.todos.filter(t => !t.due_date && !t.is_done);
      const futureTasks = this.todos.filter(t => t.due_date && t.due_date > this.currentDate && !t.is_done);
      
      noDateTasks.sort((a, b) => a.sort_order - b.sort_order);
      
      futureTasks.sort((a, b) => {
         if (a.due_date !== b.due_date) {
            return a.due_date.localeCompare(b.due_date);
         }
         return a.sort_order - b.sort_order;
      });
      
      const groups = {};
      
      if (noDateTasks.length > 0) {
         groups["日付なし"] = noDateTasks;
      }
      
      futureTasks.forEach(task => {
         if (!groups[task.due_date]) groups[task.due_date] = [];
         groups[task.due_date].push(task);
      });
      
      return groups;
   }
}