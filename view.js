// view.js - UI Representation Layer (各パネルを束ねる窓口)
import { TodayPanel } from './view/panels/today.js';
import { DiaryPanel } from './view/panels/diary.js';
import { BacklogPanel } from './view/panels/backlog.js';
import { TemplateModal } from './view/modals/template.js';
import { DiaryListModal } from './view/modals/diaryList.js';
import { HeatmapModal } from './view/modals/heatmap.js';
import { DoneSearchModal } from './view/modals/doneSearch.js';
import { ExportModal } from './view/modals/export.js';
import { BackupModal } from './view/modals/backup.js';
import { SplitModal } from './view/modals/split.js';
import { StatusBanner } from './view/panels/statusBanner.js';
import { setupCustomSuggest } from './view/parts/suggest.js';
import { bindDragAndDrop } from './view/parts/dragSort.js';
import { bindTaskActions } from './view/parts/taskList.js';
import { bindDetailsStateSave, restoreDetailsState } from './view/parts/detailsState.js';
import { bindThemeSwitch } from './view/parts/theme.js';

export class TodoView {
   constructor() {
      this.todayPanel   = new TodayPanel();
      this.diaryPanel   = new DiaryPanel();
      this.backlogPanel = new BacklogPanel();
      this.templateModal = new TemplateModal();
      this.diaryListModal = new DiaryListModal();
      this.heatmapModal = new HeatmapModal();
      this.doneSearchModal = new DoneSearchModal();
      this.exportModal = new ExportModal();
      this.btnExport = document.getElementById('btn-export');
      this.backupModal = new BackupModal();
      this.btnBackup = document.getElementById('btn-backup');
      this.splitModal = new SplitModal();
      this.statusBanner  = new StatusBanner();

      this.taskTemplatesData = [];

      bindDetailsStateSave();
      bindThemeSwitch(document.getElementById('theme-switch'));

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

   // Done 件数のヒートマップ (モーダル) の描き直し
   renderHeatmap(data) {
      this.heatmapModal.render(data);
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
      bindTaskActions(lists, {
         ...handlers,
         onSplit: (id, title) => this.splitModal.open({ id, title }),
      });
   }

   // タスクの分割画面。OK で handler に (元タスクの id, 分割後のタスク名の配列) が渡る
   bindSplitTodo(handler) {
      this.splitModal.bindSubmit(handler);
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

   // Done 件数のヒートマップ。マスを選ぶと onSelect にその日付が渡る
   bindHeatmap(onSelect) {
      this.todayPanel.bindOpenHeatmap(() => this.heatmapModal.open());
      this.heatmapModal.bindSelect((date) => {
         this.backlogPanel.resetInputDate();
         onSelect(date);
      });
   }

   // Done の検索。search は検索語からヒットした Done (新しい順) を返す。タスクを選ぶと onSelect にその日付が渡る
   bindDoneSearch(search, onSelect) {
      this.todayPanel.bindOpenDoneSearch(() => this.doneSearchModal.open());
      this.doneSearchModal.bindSearch(search);
      this.doneSearchModal.bindSelect((date) => {
         this.backlogPanel.resetInputDate();
         onSelect(date);
      });
   }

   // 月ごとのタスクの Markdown 出力。getTasks は月 ('YYYY-MM') からその月の { date, dones, todos } の配列を返す
   // getCurrentDate は開いたときに表示する月の基準 (表示中の日付)
   bindExport(getTasks, getCurrentDate) {
      this.exportModal.bindGetTasks(getTasks);
      this.btnExport.addEventListener('click', () => this.exportModal.open(getCurrentDate()));
   }

   // 全データの JSON バックアップと復元
   // onDownload は書き出す内容 (失敗時は null) を返す。onRestore は読み込んだファイルの内容を受け取る
   bindBackup(onDownload, onRestore) {
      this.backupModal.bindDownload(onDownload);
      this.backupModal.bindRestore(onRestore);
      this.btnBackup.addEventListener('click', () => this.backupModal.open());
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
