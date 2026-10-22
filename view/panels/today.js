// view/panels/today.js - 「本日のタスク」パネル (日付ヘッダ、Done / ToDo)
import { getTodayDateString, shiftDateString } from '../../lib/date.js';
import { formatDayMarkdown } from '../../lib/markdown.js';
import { copyToClipboard } from '../util/clipboard.js';
import { bindPiPSplitButton } from '../parts/pipSplit.js';
import { bindPiPFocusButton } from '../parts/pipFocus.js';
import { renderTaskList } from '../parts/taskList.js';

// 折りたたみ時に表示するToDoの件数
const ELLIPSIS_VISIBLE_COUNT = 5;

export class TodayPanel {
   constructor() {
      this.currentDateText = document.getElementById('current-date-text');
      this.datePicker = document.getElementById('date-picker');
      this.btnDatePrev = document.getElementById('btn-date-prev');
      this.btnDateNext = document.getElementById('btn-date-next');

      this.formAddDone = document.getElementById('form-add-done');
      this.formAddTodo = document.getElementById('form-add-todo');
      this.inputDoneTitle = document.getElementById('input-done-title');
      this.inputTodoTitle = document.getElementById('input-todo-title');
      this.toggleToDoEllipsis = document.getElementById('toggle-todo-ellipsis');
      this._todoIsEllipsis = true;

      this.listTodo = document.getElementById('list-todo');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      this.CountTodo = document.getElementById('list-count-todo');
      this.CountDone = document.getElementById('list-count-done');
      this.btnPiPSplit = document.getElementById('btn-pip-split');
      this.btnPiPFocus = document.getElementById('btn-pip-focus');
      this.btnHeatmap = document.getElementById('btn-heatmap');
      this.btnDoneSearch = document.getElementById('btn-done-search');

      // サジェストを付ける入力欄
      this.suggestTargets = [
         { input: this.inputDoneTitle, list: document.getElementById('suggest-done-title') },
         { input: this.inputTodoTitle, list: document.getElementById('suggest-todo-title') },
      ];

      // 最後に描画した日付 (追加・コピー時に使う)
      this._currentDate = null;

      this.toggleToDoEllipsis.addEventListener("click", () => {
         this._todoIsEllipsis = !this._todoIsEllipsis;
         this.toggleToDoEllipsis.querySelector("#todo-ellipsis-on") .hidden = !this._todoIsEllipsis;
         this.toggleToDoEllipsis.querySelector("#todo-ellipsis-off").hidden =  this._todoIsEllipsis;
         this._applyEllipsis();
      });
   }

   render({ currentDate, todos, dones }) {
      // 日付反映
      this._currentDate = currentDate;
      this.currentDateText.textContent = currentDate;
      this.datePicker.value = currentDate;

      // 今日のDone描画
      renderTaskList(this.listDone, dones, true);
      this.CountDone.textContent = dones.length;

      // 今日のToDo描画
      renderTaskList(this.listTodo, todos, false, true);
      this.CountTodo.textContent = todos.length;
      this.toggleToDoEllipsis.hidden = todos.length <= ELLIPSIS_VISIBLE_COUNT;
      this._applyEllipsis();
   }

   _applyEllipsis() {
      const todoItems = this.listTodo.querySelectorAll(".task-item");
      todoItems.forEach((d, i) => {
         d.hidden = this._todoIsEllipsis && i >= ELLIPSIS_VISIBLE_COUNT;
      });
   }

   bindDatePicker(handler) {
      this.datePicker.addEventListener('change', (e) => {
         handler(e.target.value);
      });
      
      // 前日 / 翌日ボタン (日付未選択のときは今日を基準にする)
      const shiftDate = (days) => {
         handler(shiftDateString(this._currentDate || getTodayDateString(), days));
      };
      this.btnDatePrev.addEventListener('click', () => shiftDate(-1));
      this.btnDateNext.addEventListener('click', () => shiftDate(+1));
   }

   bindAddTodo(handler) {
      this.formAddDone.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputDoneTitle.value.trim();
         const date  = this._currentDate || null;
         if(title) {
            handler(title, date, true);
            this.inputDoneTitle.value = '';
         }
      });

      this.formAddTodo.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputTodoTitle.value.trim();
         const date  = this._currentDate || null;
         if(title) {
            handler(title, date, false);
            this.inputTodoTitle.value = '';
         }
      });
   }

   bindCopyButtons(getTodos, getDones) {
      this.btnCopyTodo.addEventListener('click', () => {
         const md = formatDayMarkdown({ date: this._currentDate, todos: getTodos() });
         copyToClipboard(md).then(() => alert("クリップボードにコピーしました"));
      });

      this.btnCopyDone.addEventListener('click', () => {
         const md = formatDayMarkdown({ date: this._currentDate, dones: getDones() });
         copyToClipboard(md).then(() => alert("クリップボードにコピーしました"));
      });
   }

   // Done 件数のヒートマップを開くボタン
   bindOpenHeatmap(handler) {
      this.btnHeatmap.addEventListener('click', () => handler());
   }

   // Done の検索画面を開くボタン
   bindOpenDoneSearch(handler) {
      this.btnDoneSearch.addEventListener('click', () => handler());
   }

   bindPiPSplitButton(getTodos) {
      // 折りたたみ中は、画面に見えている分だけを渡す
      bindPiPSplitButton(this.btnPiPSplit, () => {
         const todos = getTodos();
         return this._todoIsEllipsis ? todos.slice(0, ELLIPSIS_VISIBLE_COUNT) : todos;
      });
   }

   // 対象は Focus の開始画面で選ぶので、折りたたみによらず全件を渡す
   bindPiPFocusButton(getTodos, onComplete) {
      bindPiPFocusButton(this.btnPiPFocus, getTodos, onComplete);
   }
}
