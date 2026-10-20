// model.js - Data Layer (状態の保持と各テーブル操作の窓口)
import { supabase } from './lib/supabase.js';
import { getTodayDateString, getTomorrowDateString } from './lib/date.js';
import * as todoTable from './model/todos.js';
import * as diaryTable from './model/diaries.js';
import * as templateTable from './model/templates.js';
import * as backup from './model/backup.js';

export class TodoModel {
   constructor() {
      this.todos = [];
      this.diaries = [];
      this.templates = [];
      this.currentDate = null; // will be set after loading
      this.tomorrowDate = getTomorrowDateString();
      this.onChangeCallback = null;
      this.onErrorCallback = null;

      // 読み込みの状態。loadFailed は直近の読み込みで1つでも失敗したら true
      this.loadFailed = false;
      this.lastLoadStartedAt = 0;
      // 種別ごとの変更回数。読み直し中に手元が変わったことを検知するために使う
      this._revisions = { todos: 0, diaries: 0, templates: 0 };

      const savedDate = localStorage.getItem('todo_current_date');
      if(savedDate) this.currentDate = savedDate;
      else          this.currentDate = getTodayDateString();

      this.reload();
   }

   // callback には変更の種別 ('todos' | 'diaries' | 'templates' | 'date' | 'status') が渡る
   bindOnChange(callback) {
      this.onChangeCallback = callback;
   }
   
   // 書き込み失敗時に、ユーザー向けメッセージを受け取るコールバック
   bindOnError(callback) {
      this.onErrorCallback = callback;
   }

   // 全データをDBから読み直す。起動時と、画面に戻ってきたときに呼ぶ
   async reload() {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      this.lastLoadStartedAt = Date.now();
      this.tomorrowDate = getTomorrowDateString();

      const results = await Promise.all([
         this._load('todos',     todoTable.fetchTodos),
         this._load('diaries',   diaryTable.fetchDiaries),
         this._load('templates', templateTable.fetchTemplates),
      ]);

      const failed = results.includes(false);
      if (failed !== this.loadFailed) {
         this.loadFailed = failed;
         this._commit('status');
      }
   }

   // kind は this のプロパティ名を兼ねる。成功したら true を返す
   // 失敗しても手元のデータは消さない
   async _load(kind, fetchRows) {
      // 取得中に手元が書き換わったら、古い内容で上書きしないよう取り直す
      for (let attempt = 0; attempt < 3; attempt++) {
         const revision = this._revisions[kind];
         const { data, error } = await fetchRows();
         if (error) {
            console.error(`Failed to load ${kind} from Supabase:`, error);
            this._commit(kind);
            return false;
         }
         if (this._revisions[kind] !== revision) continue;

         this[kind] = data;
         this._commit(kind);
         return true;
      }
      return true;
   }

   // 手元のデータを変えたことを記録する
   _touch(kind) {
      if (kind in this._revisions) this._revisions[kind]++;
   }

   _commit(kind) {
      this._touch(kind);
      if(this.onChangeCallback) this.onChangeCallback(kind);
   }
   
   _reportError(label, error) {
      console.error(`${label}に失敗:`, error);
      if(this.onErrorCallback) this.onErrorCallback(`${label}に失敗しました`);
   }
   
   // タスクの書き込み失敗時。データは変えていないので、描き直して画面を操作前に戻す
   _fail(label, error) {
      this._commit('todos');
      this._reportError(label, error);
   }

   // 日付変更 (localStorageに保存)
   setCurrentDate(newDateString) {
      this.currentDate = newDateString;

      if (newDateString) localStorage.setItem   ('todo_current_date', newDateString);
      else               localStorage.removeItem('todo_current_date');

      this._commit('date');
   }

   // タスク操作
   // いずれもDBへの書き込みが成功してから手元のデータに反映する
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
      if (error) return this._fail('タスクの追加', error);
      
      if (data) this.todos.push(data);
      
      this._commit('todos');
   }
   
   async editTodo(id, newTitle) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      const { error } = await todoTable.updateTodo({ ...todo, title: newTitle });
      if (error) return this._fail('タスクの編集', error);
      
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, title: newTitle } : todo
      );
      this._commit('todos');
   }
   
   async deleteTodo(id) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const { error } = await todoTable.deleteTodo(id);
      if (error) return this._fail('タスクの削除', error);
      
      this.todos = this.todos.filter(todo => todo.id !== id);
      this._commit('todos');
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
      
      const { error } = await todoTable.updateTodo({ ...todo, ...changes });
      if (error) return this._fail('タスクの更新', error);
      
      this.todos = this.todos.map(t =>
         t.id === id ? { ...t, ...changes } : t
      );
      this._commit('todos');
   }
   
   async changeTodoDate(id, targetDate) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      const changes = {
         due_date: targetDate,
         sort_order: todoTable.nextSortOrder(this.todos, t => t.due_date === targetDate),
      };
      
      const { error } = await todoTable.updateTodo({ ...todo, ...changes });
      if (error) return this._fail('日付の変更', error);
      
      this.todos = this.todos.map(todo =>
         todo.id === id ? { ...todo, ...changes } : todo
      );
      this._commit('todos');
   }
   
   // タスクを titles の各タスクに分割し、元タスクのあった位置に並べる
   // 追加 → 元タスクの削除 → 並び順の振り直し の順に書き込む (途中で失敗しても元タスクは失われない)
   async splitTodo(id, titles) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const todo = this.todos.find(t => t.id === id);
      if (!todo || titles.length === 0) return;

      // 元タスクと同じリストに並ぶタスク群
      const group = this.todos
         .filter(t => t.due_date === todo.due_date && !!t.is_done === !!todo.is_done)
         .sort((a, b) => a.sort_order - b.sort_order);
      const position = group.findIndex(t => t.id === id);

      const createdAt = new Date().toISOString();
      const { data, error } = await todoTable.insertTodos(titles.map((title, i) => ({
         title: title,
         is_done: todo.is_done,
         due_date: todo.due_date,
         done_at: todo.done_at,
         created_at: createdAt,
         sort_order: position + i,
      })));
      if (error) return this._fail('タスクの分割', error);

      this.todos.push(...data);

      const deleted = await todoTable.deleteTodo(id);
      if (deleted.error) return this._fail('タスクの分割', deleted.error);

      this.todos = this.todos.filter(t => t.id !== id);

      // 元タスクより後ろは、分割で増えた分だけ後ろへずらす
      const targets = group
         .filter(t => t.id !== id)
         .map((t, i) => ({ todo: t, id: t.id, from: t.sort_order, index: i < position ? i : i + titles.length }))
         .filter(({ from, index }) => from !== index);

      const results = await Promise.all(
         targets.map(({ todo, index }) => todoTable.updateTodo({ ...todo, sort_order: index }))
      );

      // 一部だけ失敗した場合も、成功した分はDBと揃える
      const newOrders = new Map();
      results.forEach((res, i) => {
         if (!res.error) newOrders.set(targets[i].id, targets[i].index);
      });
      this.todos = this.todos.map(t =>
         newOrders.has(t.id) ? { ...t, sort_order: newOrders.get(t.id) } : t
      );

      const failed = results.find(res => res.error);
      if (failed) return this._fail('並び替えの保存', failed.error);

      this._commit('todos');
   }

   async updateSortOrder(orderedIds) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const targets = orderedIds
         .map((id, index) => ({ id, index, todo: this.todos.find(t => t.id === id) }))
         .filter(({ todo }) => todo);
      
      const results = await Promise.all(
         targets.map(({ todo, index }) => todoTable.updateTodo({ ...todo, sort_order: index }))
      );
      
      // 一部だけ失敗した場合も、成功した分はDBと揃える
      const newOrders = new Map();
      results.forEach((res, i) => {
         if (!res.error) newOrders.set(targets[i].id, targets[i].index);
      });
      this.todos = this.todos.map(todo =>
         newOrders.has(todo.id) ? { ...todo, sort_order: newOrders.get(todo.id) } : todo
      );
      
      const failed = results.find(res => res.error);
      if (failed) return this._fail('並び替えの保存', failed.error);
      
      this._commit('todos');
   }
   
   // 失敗しても再描画はしない (入力中の本文を消さないため)
   async updateDiary(date, content) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      
      // 変更ない場合は更新しない
      const currentDiary = this.diaries.filter(d => d.date === date)[0];
      if(currentDiary) {
         if(currentDiary.content === content) return;
      }
      
      // 空欄の場合、項目ごと削除
      if(content === "") {
         const { error } = await diaryTable.deleteDiary(date);
         if (error) return this._reportError('日記の削除', error);
         
         this.diaries = this.diaries.filter(d => d.date !== date);
         this._touch('diaries');
         return;
      }
      
      // 更新
      const { error } = await diaryTable.upsertDiary(date, content);
      if (error) return this._reportError('日記の保存', error);
      
      const target = this.diaries.find(d => d.date === date);
      if(target) target.content = content;
      else       this.diaries.push({ date, content });
      this._touch('diaries');
   }
   
   // サジェスト候補 (テンプレート) 操作
   // 失敗や重複のときは再描画しない (編集中の入力を消さないため)
   async addTemplate(name) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const newName = name.trim();
      if (!newName) return;
      if (this.templates.includes(newName)) return this._reportDuplicateTemplate();

      const { error } = await templateTable.insertTemplate(newName);
      if (error) return this._reportError('候補の追加', error);

      this.templates = templateTable.sortTemplateNames([...this.templates, newName]);
      this._commit('templates');
   }

   async renameTemplate(oldName, name) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const newName = name.trim();
      if (!newName) return;

      // 変更ない場合は更新せず、編集状態だけ戻す
      if (newName === oldName) return this._commit('templates');
      if (this.templates.includes(newName)) return this._reportDuplicateTemplate();

      const { error } = await templateTable.renameTemplate(oldName, newName);
      if (error) return this._reportError('候補の修正', error);

      this.templates = templateTable.sortTemplateNames(
         this.templates.map(t => t === oldName ? newName : t)
      );
      this._commit('templates');
   }

   async deleteTemplate(name) {
      if (!supabase) { console.warn('Supabase not configured'); return; }
      const { error } = await templateTable.deleteTemplate(name);
      if (error) return this._reportError('候補の削除', error);

      this.templates = this.templates.filter(t => t !== name);
      this._commit('templates');
   }

   _reportDuplicateTemplate() {
      if(this.onErrorCallback) this.onErrorCallback('同じ名前の候補が既にあります');
   }

   // 全データのバックアップ
   // 書き出す内容を返す。失敗時は null
   async exportBackup() {
      if (!supabase) { console.warn('Supabase not configured'); return null; }
      const { data, error } = await backup.exportBackup();
      if (error) { this._reportError('バックアップの取得', error); return null; }
      return data;
   }

   // バックアップから復元し、読み直す。成功したら true を返す
   // 途中で失敗しても書き込めた分を表示するため読み直す
   async importBackup(data) {
      if (!supabase) { console.warn('Supabase not configured'); return false; }
      const { error } = await backup.importBackup(data);
      await this.reload();

      if (error) {
         console.error('復元に失敗:', error);
         if(this.onErrorCallback) this.onErrorCallback(`復元に失敗しました: ${error.message}`);
         return false;
      }
      return true;
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
   // 日付ごとの Done の件数を { 'YYYY-MM-DD': 件数 } で返す
   getDoneCountsByDate() {
      const counts = {};
      this.todos.forEach(t => {
         if (t.is_done && t.due_date) counts[t.due_date] = (counts[t.due_date] || 0) + 1;
      });
      return counts;
   }
   // タスク名に query を含む (大文字小文字は区別しない) Done を新しい順に返す
   // 日付の新しい順、同じ日の中では並び順の後ろ (後から完了した) ほど先
   searchDones(query) {
      const keyword = query.trim().toLowerCase();
      if (!keyword) return [];

      return this.todos
         .filter(t => t.is_done && t.title.toLowerCase().includes(keyword))
         .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '') || b.sort_order - a.sort_order)
         .map(t => ({ ...t }));
   }
   // month ('YYYY-MM') の日付が付いたタスクを、日付の古い順に { date, dones, todos } の配列で返す
   getTasksByDateInMonth(month) {
      const byDate = {};
      this.todos
         .filter(t => t.due_date && t.due_date.slice(0, 7) === month)
         .sort((a, b) => a.sort_order - b.sort_order)
         .forEach(t => {
            byDate[t.due_date] ??= { date: t.due_date, dones: [], todos: [] };
            byDate[t.due_date][t.is_done ? 'dones' : 'todos'].push({ ...t });
         });
      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
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
   // 全日記を新しい順に返す
   getDiariesSorted() {
      return this.diaries
         .map(d => ({ ...d }))
         .sort((a, b) => b.date.localeCompare(a.date));
   }
   getTaskTemplates() {
      return structuredClone(this.templates);
   }
}
