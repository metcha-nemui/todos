// model.js - Data & Business Logic Layer
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
      this.todos = JSON.parse(localStorage.getItem('mvp_todos')) || [];
      this.currentDate = localStorage.getItem('mvp_current_date') || DEFAULT_DATE;
      this.onChangeCallback = null;
   }
   
   bindOnChange(callback) {
      this.onChangeCallback = callback;
   }
   
   _commit() {
      localStorage.setItem('mvp_todos', JSON.stringify(this.todos));
      localStorage.setItem('mvp_current_date', this.currentDate);
      if (this.onChangeCallback) {
         this.onChangeCallback();
      }
   }
   
   // 日付コントロール
   setCurrentDate(newDateString) {
      this.currentDate = newDateString;
      this._commit();
   }
   
   advanceToNextDay() {
      const date = new Date(this.currentDate);
      date.setDate(date.getDate() + 1);
      
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const nextDateStr = `${yyyy}-${mm}-${dd}`;
      
      // 未完了タスクをすべて明日に自動繰り越し
      this.todos = this.todos.map(todo => {
         if (!todo.is_done && todo.due_date === this.currentDate) {
               return { ...todo, due_date: nextDateStr };
         }
         return todo;
      });
      
      this.currentDate = nextDateStr;
      this._commit();
   }
   
   // タスク操作
   addTodo(title, dueDate = null) {
      const targetDate = dueDate;
      
      // 追加先の最大sort_orderを取得
      const sameDayTasks = this.todos.filter(t => t.due_date === targetDate);
      const maxOrder = sameDayTasks.reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      const newTodo = {
         id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
         title: title,
         is_done: false,
         due_date: targetDate,
         done_at: null,
         created_at: new Date().toISOString(),
         sort_order: maxOrder + 1
      };
      
      this.todos.push(newTodo);
      this._commit();
   }
   
   editTodo(id, newTitle) {
      this.todos = this.todos.map(todo => 
         todo.id === id ? { ...todo, title: newTitle } : todo
      );
      this._commit();
   }
   
   deleteTodo(id) {
      this.todos = this.todos.filter(todo => todo.id !== id);
      this._commit();
   }
   
   toggleTodo(id) {
      this.todos = this.todos.map(todo => {
         if (todo.id === id) {
               const updatedDone = !todo.is_done;
               return {
                  ...todo,
                  is_done: updatedDone,
                  done_at: updatedDone ? new Date().toISOString() : null
               };
         }
         return todo;
      });
      this._commit();
   }
   
   changeTodoDate(id, targetDate) {
      const maxOrder = this.todos
         .filter(t => t.due_date === targetDate)
         .reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      this.todos = this.todos.map(todo => 
         todo.id === id ? { ...todo, due_date: targetDate, sort_order: maxOrder + 1 } : todo
      );
      this._commit();
   }
   
   updateSortOrder(orderedIds) {
      // 受け取ったID配列の順序通りにsort_orderを再インデックス
      orderedIds.forEach((id, index) => {
         const todo = this.todos.find(t => t.id === id);
         if (todo) {
               todo.sort_order = index;
         }
      });
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

    clearAllStorage() {
       localStorage.clear();
       this.todos = [];
       this.currentDate = DEFAULT_DATE;
       if (this.onChangeCallback) {
          this.onChangeCallback();
       }
    }

    removeStorageKey(key) {
       localStorage.removeItem(key);
       if (key === 'mvp_todos') {
          this.todos = [];
       } else if (key === 'mvp_current_date') {
          this.currentDate = DEFAULT_DATE;
       }
       if (this.onChangeCallback) {
          this.onChangeCallback();
       }
    }
 }
