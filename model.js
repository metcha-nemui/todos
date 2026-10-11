// model.js - Data Layer (状態の保持と各テーブル操作の窓口)
import { supabase } from './lib/supabase.js';
import { getTodayDateString, getTomorrowDateString } from './lib/date.js';
import * as todoTable from './model/todos.js';
import * as diaryTable from './model/diaries.js';
import * as templateTable from './model/templates.js';

export class TodoModel {
   constructor() {
      this.todos = [];
      this.currentDate = null; // will be set after loading
      this.tomorrowDate = getTomorrowDateString();
      this.onChangeCallback = null;

      this._loadTodosFromSupabase();

      const savedDate = localStorage.getItem('todo_current_date');
      if(savedDate) this.currentDate = savedDate;
      else          this.currentDate = getTodayDateString();

      this.diaries = [];
      this._loadDiariesFromSupabase();

      this.templates = [];
      this._loadTemplatesFromSupabase();
   }

   bindOnChange(callback) {
      this.onChangeCallback = callback;
   }

   async _loadTodosFromSupabase() {
      if (!supabase) { console.warn('Supabase not configured'); return; }

      const { data, error } = await todoTable.fetchTodos();
      if (error) {
         console.error('Failed to load todos from Supabase:', error);
         this.todos = [];
      } else {
         this.todos = data;
      }

      // Notify UI after loading
      this._commit();
   }

   async _loadDiariesFromSupabase() {
      if (!supabase) { console.warn('Supabase not configured'); return; }

      const { data, error } = await diaryTable.fetchDiaries();
      if (error) {
         console.error('Failed to load diaries from Supabase:', error);
         this.diaries = [];
      } else {
         this.diaries = data;
      }
      
      // 読み込み順に関わらず画面へ反映する
      this._commit();
   }

   async _loadTemplatesFromSupabase() {
      if (!supabase) { console.warn('Supabase not configured'); return; }

      const { data, error } = await templateTable.fetchTemplates();
      if (error) {
         console.error('Failed to load templates from Supabase:', error);
         this.templates = [];
      } else {
         this.templates = data;
      }
      
      // 読み込み順に関わらず画面へ反映する
      this._commit();
   }

   _commit() {
      if(this.onChangeCallback) this.onChangeCallback();
   }

   // 日付変更 (localStorageに保存)
   setCurrentDate(newDateString) {
      this.currentDate = newDateString;

      if (newDateString) localStorage.setItem   ('todo_current_date', newDateString);
      else               localStorage.removeItem('todo_current_date');

      this._commit();
   }

   // タスク操作
   async addTodo(title, dueDate = null, isDone = false) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const targetDate = dueDate;

      const { data, error } = await todoTable.insertTodo({
         title: title,
         is_done: isDone,
         due_date: targetDate,
         done_at: null,
         created_at: new Date().toISOString(),
         sort_order: todoTable.nextSortOrder(this.todos, t => t.due_date === targetDate),
      });

      if (error) {
         console.error('Supabase add error:', error);
         return;
      }

      if (data) this.todos.push(data);

      this._commit();
   }

   async editTodo(id, newTitle) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, title: newTitle } : todo
      );
      const { error } = await todoTable.updateTodo(id, { title: newTitle });
      if (error) console.error('Supabase edit error:', error);
      this._commit();
   }

   async deleteTodo(id) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.todos = this.todos.filter(todo => todo.id !== id);
      const { error } = await todoTable.deleteTodo(id);
      if (error) console.error('Supabase delete error:', error);
      this._commit();
   }

   // 完了状態を反転し、表示中の日付の該当リスト末尾へ移す
   async toggleTodo(id) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      const updatedDone = !todo.is_done;
      const changes = {
         is_done: updatedDone,
         done_at: updatedDone ? new Date().toISOString() : null,
         due_date: this.currentDate,
         sort_order: todoTable.nextSortOrder(this.todos, t => t.due_date === this.currentDate && !!t.is_done === updatedDone),
      };

      const { error } = await todoTable.updateTodo(id, changes);
      if (error) console.error('Supabase toggle error:', error);

      this.todos = this.todos.map(t =>
         t.id === id ? { ...t, ...changes } : t
      );
      this._commit();
   }

   async changeTodoDate(id, targetDate) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const changes = {
         due_date: targetDate,
         sort_order: todoTable.nextSortOrder(this.todos, t => t.due_date === targetDate),
      };

      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, ...changes } : todo
      );
      const { error } = await todoTable.updateTodo(id, changes);
      if (error) console.error('Supabase change date error:', error);
      this._commit();
   }

   async updateSortOrder(orderedIds) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const updates = orderedIds.map((id, index) => {
         const todo = this.todos.find(t => t.id === id);
         if (todo) {
            todo.sort_order = index;
            return todoTable.updateTodo(id, { sort_order: index });
         }
      }).filter(Boolean);
      const results = await Promise.all(updates);
      results.forEach(res => { if (res.error) console.error('Supabase sort update error:', res.error); });
      this._commit();
   }

   async updateDiary(date, content) {
      if (!supabase) { console.warn('Supabase not configured'); return; }

      // 変更ない場合は更新しない
      const currentDiary = this.diaries.filter(d => d.date === date)[0];
      if(currentDiary) {
         if(currentDiary.content === content) return;
      }

      // 空欄の場合、項目ごと削除
      if(content === "") {
         this.diaries = this.diaries.filter(d => d.date !== date);
         await diaryTable.deleteDiary(date);
         return;
      }

      // 更新
      const target = this.diaries.find(d => d.date === date);
      if(target) target.content = content;
      else       this.diaries.push({ date, content });

      await diaryTable.upsertDiary(date, content);
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
   getTodayDiary() {
      return this.diaries.filter(d => d.date === this.currentDate)[0];
   }
   getTaskTemplates() {
      return structuredClone(this.templates);
   }
}
