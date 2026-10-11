// view.js - UI Representation Layer
import { copyToClipboard } from './view/clipboard.js';
import { setupCustomSuggest } from './view/suggest.js';
import { bindDragAndDrop } from './view/dragSort.js';
import { bindPiPButton } from './view/pip.js';
import { renderTaskList, bindTaskActions } from './view/taskList.js';

const _detailsKeyList = {
   "details-todo"  : "TODO",
   "details-done"  : "DONE",
   "details-nodate": "NODATE",
};

export class TodoView {
   constructor() {
      // ヘッダー・共通
      this.currentDateText = document.getElementById('current-date-text');
      this.datePicker = document.getElementById('date-picker');
      this.sections = document.querySelectorAll('.view-section');

      // 今日ビュー
      this.formAddDone = document.getElementById('form-add-done');
      this.formAddTodo = document.getElementById('form-add-todo');
      this.inputDoneTitle = document.getElementById('input-done-title');
      this.inputTodoTitle = document.getElementById('input-todo-title');
      this.toggleToDoEllipsis = document.getElementById('toggle-todo-ellipsis');
      this._todoIsEllipsis = true;

      // カスタムサジェスト要素
      this.suggestDone = document.getElementById('suggest-done-title');
      this.suggestTodo = document.getElementById('suggest-todo-title');
      this.suggestBacklog = document.getElementById('suggest-backlog-title');
      this.taskTemplatesData = []; // テンプレートリストデータ保持

      this.listTodo = document.getElementById('list-todo');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      this.CountTodo = document.getElementById('list-count-todo');
      this.CountDone = document.getElementById('list-count-done');
      this.btnPiP    = document.getElementById('btn-pip');
      this.inputDiary = document.getElementById('input-diary');

      // バックログビュー
      this.containerBacklogTasks = document.getElementById('container-backlog-tasks');
      this.formAddBacklog = document.getElementById('form-add-backlog');
      this.inputBacklogTitle = document.getElementById('input-backlog-title');
      this.inputBacklogDate = document.getElementById('input-backlog-date');

      this.doInputBacklogDateReset = true;
      this._storageKey = "todo_group_open_states";

      this.bindUIEvents();

      // カスタムサジェスト制御
      setupCustomSuggest([
         { input: this.inputDoneTitle, list: this.suggestDone },
         { input: this.inputTodoTitle, list: this.suggestTodo },
         { input: this.inputBacklogTitle, list: this.suggestBacklog }
      ], () => this.taskTemplatesData);
   }

   bindUIEvents() {
      // <details> 開閉状況保存
      document.addEventListener("toggle", (e) => {
         const key = _detailsKeyList[e.target.id] || "";
         if(!key) return;

         const storageKey = this._storageKey;
         const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
         states[key] = e.target.open;
         localStorage.setItem(storageKey, JSON.stringify(states));
      }, { capture: true });

      this.inputDiary.addEventListener("input", () => {
         this._updateDiaryCounter();
      });

      this.toggleToDoEllipsis.addEventListener("click", () => {
         this._todoIsEllipsis = !this._todoIsEllipsis;
         if(this._todoIsEllipsis) {
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-on") .hidden = false;
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-off").hidden = true;
            const todoItems = this.listTodo.querySelectorAll(".task-item");
            todoItems.forEach((d, i) => {
               if(i >= 5) d.hidden = true;
            });
         } else {
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-on") .hidden = true;
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-off").hidden = false;
            const todoItems = this.listTodo.querySelectorAll(".task-item");
            todoItems.forEach((d, i) => {
               d.hidden = false;
            });
         }
      });
   }

   render(data) {
      // 日付反映
      this.currentDateText.textContent = data.currentDate;
      this.datePicker.value = data.currentDate;
      if(this.doInputBacklogDateReset) {
         this.inputBacklogDate.value = data.tomorrowDate;
         this.doInputBacklogDateReset = false;
      }

      // 今日のDone描画
      renderTaskList(this.listDone, data.todayDones, true);
      this.CountDone.textContent = data.todayDones.length;

      // 今日のToDo描画
      renderTaskList(this.listTodo, data.todayTodos, false, true);
      this.CountTodo.textContent = data.todayTodos.length;

      if(this._todoIsEllipsis) {
         const todoItems = this.listTodo.querySelectorAll(".task-item");
         todoItems.forEach((d, i) => {
            if(i >= 5) d.hidden = true;
         });
      }

      // 今日のDiary描画
      this._renderDiary(data.todayDiary);

      // バックログ描画
      this._renderBacklogTasks(data.backlogTodos);

      // 開閉状況反映
      const details = document.querySelectorAll("details");
      for(const element of details) {
         const key = _detailsKeyList[element.id];
         if(!key) continue;

         const storageKey = this._storageKey;
         const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
         if(key in states) element.open = states[key];
      }
      const diaryDetails = this.inputDiary.closest("details");
      diaryDetails.open = this.inputDiary.value !== "";

      // サジェスト用のテンプレート保持
      this.taskTemplatesData = data.taskTemplates || [];

      // 動的生成された要素のLucideアイコンを有効化
      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }

   _renderBacklogTasks(groupedTasks) {
      this.containerBacklogTasks.innerHTML = '';
      if (Object.keys(groupedTasks).length === 0) {
         this.containerBacklogTasks.innerHTML = '<p style="color: var(--text-muted);">今後のタスク予定はありません</p>';
         return;
      }

      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const isNoDate = date === "日付なし";

         const details = this._parseHtml(
            `<details ${isNoDate ? `id="details-nodate"` : ""} class="collapse" open>
               <summary class="backlog-title">${date}</summary>
               <ul class="task-list"></ul>
            </details>`
         );
         const ul = details.querySelector('.task-list');
         renderTaskList(ul, tasks, false, true);

         this.containerBacklogTasks.appendChild(details);
      }
   }

   _renderDiary(data) {
      this.inputDiary.value = data?.content || "";
      this._updateDiaryCounter();
   }

   bindDatePicker(handler) {
      this.datePicker.addEventListener('change', (e) => {
         this.doInputBacklogDateReset = true;
         handler(e.target.value);
      });
   }

   bindAddTodo(handler) {
      this.formAddDone.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputDoneTitle.value.trim();
         const date  = this.datePicker.value || null;
         if(title) {
            handler(title, date, true);
            this.inputDoneTitle.value = '';
         }
      });

      this.formAddTodo.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputTodoTitle.value.trim();
         const date  = this.datePicker.value || null;
         if(title) {
            handler(title, date, false);
            this.inputTodoTitle.value = '';
         }
      });

      this.formAddBacklog.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputBacklogTitle.value.trim();
         const date  = this.inputBacklogDate.value || null;
         if(title) {
            handler(title, date, false);
            this.inputBacklogTitle.value = '';
         }
      });
   }

   // handlers: { onToggle, onDelete, onEdit, onChangeDate }
   bindTaskActions(handlers) {
      const lists = [this.listTodo, this.listDone, this.containerBacklogTasks];
      bindTaskActions(lists, handlers);
   }

   bindDragAndDrop(handleSortUpdate) {
      bindDragAndDrop([this.listTodo, this.listDone], this.containerBacklogTasks, handleSortUpdate);
   }

   bindCopyButtons(getTodos, getDones) {
      this.btnCopyTodo.addEventListener('click', () => {
         const date = this._formatDate(this.datePicker.value) + "\n";
         const md   = getTodos().map(t => `- [ ] ${t.title}`).join('\n');
         copyToClipboard(date+md).then(() => alert("クリップボードにコピーしました"));
      });

      this.btnCopyDone.addEventListener('click', () => {
         const date = this._formatDate(this.datePicker.value) + "\n";
         const md   = getDones().map(t => `- [x] ${t.title}`).join('\n');
         copyToClipboard(date+md).then(() => alert("クリップボードにコピーしました"));
      });
   }

   _formatDate(dateString) {
      const date = new Date(dateString);
      const formatter = new Intl.DateTimeFormat('ja-JP', {
         month: '2-digit',
         day:   '2-digit',
         weekday: 'short'
      });
      return formatter.format(date).replace(/\s+/g, '');
   }

   _updateDiaryCounter() {
      const counter = document.querySelector("#diary-counter");
      counter.textContent = this.inputDiary.value.length;
   }

   bindPiPButton(getTodos) {
      bindPiPButton(this.btnPiP, getTodos);
   }

   bindUpdateDiary(handler) {
      this.inputDiary.addEventListener("blur", () => {
         handler(this.datePicker.value, this.inputDiary.value.trim());
      });
   }

   showError(message) {
      alert(message);
   }
   
   _parseHtml(htmlString) {
      const template = document.createElement('template');
      template.innerHTML = htmlString.trim();
      return template.content.firstElementChild;
   }
}
