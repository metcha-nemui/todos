// view/panels/today.js - 「本日のタスク」パネル (日付ヘッダ、Done / ToDo (Must / Want))
import { getTodayDateString, shiftDateString, formatDateWithWeekday } from '../../lib/date.js';
import { formatDayMarkdown } from '../../lib/markdown.js';
import { copyToClipboard } from '../util/clipboard.js';
import { bindPiPSplitButton } from '../parts/pipSplit.js';
import { bindPiPFocusButton } from '../parts/pipFocus.js';
import { renderTaskList } from '../parts/taskList.js';
import { bindLinkedDragAndDrop } from '../parts/dragSort.js';
import { openDatePicker } from '../parts/datePicker.js';

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

      this.listMust = document.getElementById('list-must');
      this.listWant = document.getElementById('list-want');
      this.listOverdue = document.getElementById('list-overdue');
      this.detailsWant = document.getElementById('details-want');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      this.CountTodo = document.getElementById('list-count-todo');
      this.CountDone = document.getElementById('list-count-done');
      this.CountMust = document.getElementById('list-count-must');
      this.CountWant = document.getElementById('list-count-want');
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
      // 1日に置ける Must の上限 (Want から Must へ移せるかの判定に使う)
      this._mustLimit = Infinity;
   }

   // todos は Must が先に並ぶ。overdues は期限を過ぎた Must
   render({ currentDate, todos, dones, overdues, mustLimit }) {
      // 日付反映
      this._currentDate = currentDate;
      this.currentDateText.textContent = currentDate;

      // 今日のDone描画
      renderTaskList(this.listDone, dones, true);
      this.CountDone.textContent = dones.length;

      // 今日のToDo描画 (Must / Want)
      const musts = todos.filter(t => t.must);
      const wants = todos.filter(t => !t.must);
      this._mustLimit = mustLimit;
      this.CountTodo.textContent = todos.length;

      renderTaskList(this.listOverdue, overdues, false, true, t => `期限切れ ${formatDateWithWeekday(t.due_date)}`);
      this.listOverdue.hidden = overdues.length === 0;
      renderTaskList(this.listMust, musts, false, true);
      this.CountMust.textContent = `${musts.length}/${mustLimit}`;

      renderTaskList(this.listWant, wants, false, true);
      this.CountWant.textContent = wants.length;
   }

   bindDatePicker(handler) {
      this.datePicker.addEventListener('click', () => {
         openDatePicker(this.datePicker, {
            value: this._currentDate,
            onSelect: (date) => handler(date),
         });
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

   // Must / Want の間のドラッグ移動。Must が上限に達しているときは Must へ移せない
   // handleMove(id, toMust, orderedIds) は別のリストへ移したときに呼ぶ
   bindDragAndDrop(handleSortUpdate, handleMove) {
      const canDrop = (list) => list !== this.listMust
         || this.listMust.querySelectorAll('.task-item:not(.dragging)').length < this._mustLimit;
      bindLinkedDragAndDrop(
         [this.listMust, this.listWant],
         canDrop,
         handleSortUpdate,
         (id, list, orderedIds) => handleMove(id, list === this.listMust, orderedIds)
      );
   }

   bindPiPSplitButton(getTodos) {
      // 画面に見えている分だけを渡す (Want を閉じていれば Must だけ)
      bindPiPSplitButton(this.btnPiPSplit, () => {
         const todos = getTodos();
         return this.detailsWant.open ? todos : todos.filter(t => t.must);
      });
   }

   // 対象は Focus の開始画面で選ぶので、折りたたみによらず全件を渡す
   bindPiPFocusButton(getTodos, onComplete) {
      this._syncFocus = bindPiPFocusButton(this.btnPiPFocus, getTodos, onComplete);
   }

   // 開いている Focus へ、メイン画面での変更を反映する
   renderFocus(allTodos) {
      this._syncFocus?.(allTodos);
   }
}
