// app.js - Presenter / Application Entry Point
import { TodoModel } from './model.js';
import { TodoView  } from './view.js';

// Modelの変更種別 → 描き直す対象
const RENDER_TARGETS = {
   todos:     ['today', 'backlog', 'heatmap'],
   diaries:   ['diary', 'diaryList'],
   templates: ['templates'],
   date:      ['today', 'diary', 'backlog', 'diaryList', 'heatmap'],
   status:    ['status'],
};

// 画面復帰時の読み直しを、この間隔 (ミリ秒) より短くは繰り返さない
const RELOAD_MIN_INTERVAL = 5000;

class TodoPresenter {
   constructor(model, view) {
      this.model = model;
      this.view  = view;
      
      // 1. Modelデータ変更時の自動描画をバインド
      this.model.bindOnChange((kind) => this.updateView(kind));
      
      // 保存失敗時の通知
      this.model.bindOnError((message) => this.view.showError(message));
      
      // 画面に戻ってきたときの読み直しと、失敗時の手動読み直し
      this.view.bindResume(() => this.reloadIfIdle());
      this.view.bindRetryLoad(() => this.model.reload());
      
      // 2. Viewのユーザー操作イベントをPresenterのハンドラ（Modelへの命令）にバインド
      
      // 日付コントロール
      this.view.bindDatePicker((newDate) => this.model.setCurrentDate(newDate));
      
      // タスク追加
      this.view.bindAddTodo((title, date, isDone) => this.model.addTodo(title, date, isDone));
      
      // タスクに対する各種アクション（チェック、物理削除、編集、日付変更）
      this.view.bindTaskActions({
         onToggle:     (id) => this.model.toggleTodo(id),
         onDelete:     (id) => this.model.deleteTodo(id),
         onEdit:       (id, newTitle) => this.model.editTodo(id, newTitle),
         onChangeDate: (id, date) => this.model.changeTodoDate(id, date),
      });
      
      // タスクの分割 (元タスクを分割後のタスク群に置き換える)
      this.view.bindSplitTodo((id, titles) => this.model.splitTodo(id, titles));

      // ドラッグ＆ドロップによる並び替え順序の同期
      this.view.bindDragAndDrop((orderedIds) => this.model.updateSortOrder(orderedIds));
      
      // Markdownクリップボードコピー（独立ボタン）
      this.view.bindCopyButtons(
         () => this.model.getTodayTodos(),
         () => this.model.getTodayDones()
      );
      
      // PiP起動ボタン
      this.view.bindPiPButton(() => this.model.getTodayTodos());
      
      // Diary編集
      // Modelは入力中の本文を消さないよう変更を通知しないので、一覧だけここで描き直す
      this.view.bindUpdateDiary(async (date, content) => {
         await this.model.updateDiary(date, content);
         this.renderDiaryList();
      });

      // 過去の日記の一覧 (選んだ日付へ移動)
      this.view.bindDiaryList((date) => this.model.setCurrentDate(date));

      // Done 件数のヒートマップ (選んだ日付へ移動)
      this.view.bindHeatmap((date) => this.model.setCurrentDate(date));

      // Done の検索 (選んだタスクの日付へ移動)
      this.view.bindDoneSearch(
         (query) => this.model.searchDones(query),
         (date) => this.model.setCurrentDate(date)
      );

      // 月ごとのタスクの Markdown 出力
      this.view.bindExport(
         (month) => this.model.getTasksByDateInMonth(month),
         () => this.model.currentDate
      );

      // サジェスト候補の登録画面
      this.view.bindTemplateActions({
         onAdd:    (name) => this.model.addTemplate(name),
         onRename: (oldName, newName) => this.model.renameTemplate(oldName, newName),
         onDelete: (name) => this.model.deleteTemplate(name),
      });
   }
   
   // 読み直した直後と入力の途中は見送る (描き直しで入力が消えるため)
   reloadIfIdle() {
      if (Date.now() - this.model.lastLoadStartedAt < RELOAD_MIN_INTERVAL) return;
      if (this.view.isEditing()) return;
      this.model.reload();
   }

   renderDiaryList() {
      this.view.renderDiaryList({
         currentDate: this.model.currentDate,
         diaries:     this.model.getDiariesSorted(),
      });
   }

   // 変更の種別に応じて、該当する対象だけ描き直す
   updateView(kind) {
      const model = this.model;
      const renderers = {
         today: () => this.view.renderToday({
            currentDate: model.currentDate,
            todos:       model.getTodayTodos(),
            dones:       model.getTodayDones(),
         }),
         diary: () => this.view.renderDiary({
            currentDate: model.currentDate,
            diary:       model.getTodayDiary(),
         }),
         diaryList: () => this.renderDiaryList(),
         backlog: () => this.view.renderBacklog({
            tomorrowDate: model.tomorrowDate,
            groupedTasks: model.getBacklogTodosGrouped(),
         }),
         heatmap: () => this.view.renderHeatmap({
            currentDate: model.currentDate,
            counts:      model.getDoneCountsByDate(),
         }),
         templates: () => this.view.setTemplates(model.getTaskTemplates()),
         status: () => this.view.renderStatus({ loadFailed: model.loadFailed }),
      };
      
      RENDER_TARGETS[kind].forEach(target => renderers[target]());
   }
}

// ページ読み込み完了時にPresenterを初期化してアプリケーションを起動
document.addEventListener('DOMContentLoaded', () => {
   const model = new TodoModel();
   const view  = new TodoView();
   new TodoPresenter(model, view);
   
   // オフライン時の表示用 (sw.js)。登録の失敗はアプリの動作に影響しない
   if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker registration failed:', e));
   }
});