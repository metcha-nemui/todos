// model.js - Data & Business Logic Layer
export class TodoModel {
   constructor() {
      this.todos = JSON.parse(localStorage.getItem('mvp_todos')) || [];
      this.currentDate = localStorage.getItem('mvp_current_date') || "2026-06-06";
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
   
   moveToToday(id) {
      const maxOrder = this.todos
         .filter(t => t.due_date === this.currentDate)
         .reduce((max, t) => t.sort_order > max ? t.sort_order : max, -1);
      
      this.todos = this.todos.map(todo => 
         todo.id === id ? { ...todo, due_date: this.currentDate, sort_order: maxOrder + 1 } : todo
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
   
   getNoDateTodos() {
      return this.todos.filter(t => !t.due_date);
   }
   
   getFutureTodosGrouped() {
      const futureTasks = this.todos.filter(t => t.due_date && t.due_date > this.currentDate);
      const groups = {};
      futureTasks.forEach(task => {
         if (!groups[task.due_date]) groups[task.due_date] = [];
         groups[task.due_date].push(task);
      });
      return groups;
   }
   
   getArchiveGrouped() {
      const pastDones = this.todos.filter(t => t.due_date && t.due_date < this.currentDate && t.is_done);
      const groups = {};
      pastDones.forEach(task => {
         if (!groups[task.due_date]) groups[task.due_date] = [];
         groups[task.due_date].push(task);
      });
      // 日付の降順ソート
      return Object.keys(groups).sort((a, b) => b.localeCompare(a)).reduce((obj, key) => {
         obj[key] = groups[key];
         return obj;
      }, {});
   }
}
