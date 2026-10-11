// view.js - UI Representation Layer (各パネルを束ねる窓口)
import { TodayPanel } from './view/todayPanel.js';
import { DiaryPanel } from './view/diaryPanel.js';
import { BacklogPanel } from './view/backlogPanel.js';
import { TemplateModal } from './view/templateModal.js';
import { DiaryListModal } from './view/diaryListModal.js';
import { StatusBanner } from './view/statusBanner.js';
import { setupCustomSuggest } from './view/suggest.js';
import { bindDragAndDrop } from './view/dragSort.js';
import { bindTaskActions } from './view/taskList.js';
import { bindDetailsStateSave, restoreDetailsState } from './view/detailsState.js';

export class TodoView {
   constructor() {
      this.todayPanel   = new TodayPanel();
      this.diaryPanel   = new DiaryPanel();
      this.backlogPanel = new BacklogPanel();
      this.templateModal = new TemplateModal();
      this.diaryListModal = new DiaryListModal();
      this.statusBanner  = new StatusBanner();

      this.taskTemplatesData = [];

      bindDetailsStateSave();

      // カスタムサジェスト制御
      setupCustomSuggest(
         [...this.todayPanel.suggestTargets, ...this.backlogPanel.suggestTargets],
         () => this.taskTemplatesData,
         () => this.templateModal.open()
      );
   }

   // 以下の render* はパネル単位。変更があったパネルだけ呼ぶ
   renderToday(data) {
      this.todayPanel.render(data);
      this._afterRender();
   }
   
   renderDiary(data) {
      this.diaryPanel.render(data);
   }

   // 過去の日記の一覧 (モーダル) の描き直し
   renderDiaryList(data) {
      this.diaryListModal.render(data);
   }

   renderBacklog(data) {
      this.backlogPanel.render(data);
      this._afterRender();
   }
   
   // サジェスト用のテンプレート保持と、登録画面の一覧の描き直し
   setTemplates(templates) {
      this.taskTemplatesData = templates || [];
      this.templateModal.render(this.taskTemplatesData);
   }
   
   renderStatus(data) {
      this.statusBanner.render(data);
   }
   
   // 入力の途中かどうか。途中なら描き直しで入力が消えるので、読み直しを見送る判断に使う
   isEditing() {
      if (document.querySelector('.is-editing')) return true;

      const el = document.activeElement;
      const isTextField = el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'));
      return !!isTextField && el.value !== '';
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

   // 画面に戻ってきたとき (タブ・アプリの切替、ページの復元、接続の回復) に handler を呼ぶ
   bindResume(handler) {
      document.addEventListener('visibilitychange', () => {
         if (document.visibilityState === 'visible') handler();
      });
      window.addEventListener('pageshow', (e) => {
         if (e.persisted) handler();
      });
      window.addEventListener('online', () => handler());
   }

   bindRetryLoad(handler) {
      this.statusBanner.bindRetry(handler);
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

   // 過去の日記の一覧。日記を選ぶと onSelect にその日付が渡る
   bindDiaryList(onSelect) {
      this.diaryPanel.bindOpenList(() => this.diaryListModal.open());
      this.diaryListModal.bindSelect((date) => {
         this.backlogPanel.resetInputDate();
         onSelect(date);
      });
   }

   // handlers: { onAdd, onRename, onDelete }
   bindTemplateActions({ onAdd, onRename, onDelete }) {
      this.templateModal.bindAdd(onAdd);
      this.templateModal.bindRename(onRename);
      this.templateModal.bindDelete(onDelete);
   }

   showError(message) {
      alert(message);
   }
}
