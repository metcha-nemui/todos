// view.js - UI Representation Layer (各パネルを束ねる窓口)
import { TodayPanel } from './view/todayPanel.js';
import { DiaryPanel } from './view/diaryPanel.js';
import { BacklogPanel } from './view/backlogPanel.js';
import { setupCustomSuggest } from './view/suggest.js';
import { bindDragAndDrop } from './view/dragSort.js';
import { bindTaskActions } from './view/taskList.js';
import { bindDetailsStateSave, restoreDetailsState } from './view/detailsState.js';

export class TodoView {
   constructor() {
      this.todayPanel   = new TodayPanel();
      this.diaryPanel   = new DiaryPanel();
      this.backlogPanel = new BacklogPanel();

      this.taskTemplatesData = []; // テンプレートリストデータ保持

      bindDetailsStateSave();

      // カスタムサジェスト制御
      setupCustomSuggest(
         [...this.todayPanel.suggestTargets, ...this.backlogPanel.suggestTargets],
         () => this.taskTemplatesData
      );
   }

   render(data) {
      this.todayPanel.render({
         currentDate: data.currentDate,
         todos:       data.todayTodos,
         dones:       data.todayDones,
      });
      this.diaryPanel.render({
         currentDate: data.currentDate,
         diary:       data.todayDiary,
      });
      this.backlogPanel.render({
         tomorrowDate: data.tomorrowDate,
         groupedTasks: data.backlogTodos,
      });
      this._afterRender();

      // サジェスト用のテンプレート保持
      this.taskTemplatesData = data.taskTemplates || [];
   }

   // 描画後の共通処理
   _afterRender() {
      // 開閉状況反映
      restoreDetailsState();

      // 動的生成された要素のLucideアイコンを有効化
      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }

   bindDatePicker(handler) {
      this.todayPanel.bindDatePicker((date) => {
         this.backlogPanel.resetInputDate();
         handler(date);
      });
   }

   bindAddTodo(handler) {
      this.todayPanel.bindAddTodo(handler);
      this.backlogPanel.bindAddTodo(handler);
   }

   // handlers: { onToggle, onDelete, onEdit, onChangeDate }
   bindTaskActions(handlers) {
      const lists = [this.todayPanel.listTodo, this.todayPanel.listDone, this.backlogPanel.containerBacklogTasks];
      bindTaskActions(lists, handlers);
   }

   bindDragAndDrop(handleSortUpdate) {
      bindDragAndDrop(
         [this.todayPanel.listTodo, this.todayPanel.listDone],
         this.backlogPanel.containerBacklogTasks,
         handleSortUpdate
      );
   }

   bindCopyButtons(getTodos, getDones) {
      this.todayPanel.bindCopyButtons(getTodos, getDones);
   }

   bindPiPButton(getTodos) {
      this.todayPanel.bindPiPButton(getTodos);
   }

   bindUpdateDiary(handler) {
      this.diaryPanel.bindUpdateDiary(handler);
   }

   showError(message) {
      alert(message);
   }
}
