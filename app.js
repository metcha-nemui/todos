// app.js - Presenter / Application Entry Point
import { TodoModel } from './model.js';
import { TodoView  } from './view.js';

class TodoPresenter {
   constructor(model, view) {
      this.model = model;
      this.view  = view;
      
      // 1. Modelデータ変更時の自動描画をバインド
      this.model.bindOnChange(() => this.updateView());
      
      // 2. Viewのユーザー操作イベントをPresenterのハンドラ（Modelへの命令）にバインド
      
      // 日付コントロール
      this.view.bindDatePicker((newDate) => this.model.setCurrentDate(newDate));
      
      // タスク追加
      this.view.bindAddTodo((title, date) => this.model.addTodo(title, date));
      
      // タスクに対する各種アクション（チェック、物理削除、編集、今日へ移動）
      this.view.bindTaskActions(
         (id) => this.model.toggleTodo(id),
         (id) => this.model.deleteTodo(id),
         (id, newTitle) => this.model.editTodo(id, newTitle),
         (id, date) => this.model.changeTodoDate(id, date)
      );
      
      // ドラッグ＆ドロップによる並び替え順序の同期
      this.view.bindDragAndDrop((orderedIds) => this.model.updateSortOrder(orderedIds));
      
      // Markdownクリップボードコピー（独立ボタン）
      this.view.bindCopyButtons(
         () => this.model.getTodayTodos(),
         () => this.model.getTodayDones()
      );
      
      // PiP起動ボタン
      this.view.bindPiPButton(() => this.model.getTodayTodos());
      
      // 3. アプリ起動時の初期レンダリング
      this.view.setInitialDate(this.model.currentDate);
      this.updateView();
   }
   
   updateView() {
      this.view.render({
         currentDate:  this.model.currentDate,
         todayTodos:   this.model.getTodayTodos(),
         todayDones:   this.model.getTodayDones(),
         backlogTodos: this.model.getBacklogTodosGrouped(),
         todos:        this.model.todos
      });
   }
}

// ページ読み込み完了時にPresenterを初期化してアプリケーションを起動
document.addEventListener('DOMContentLoaded', () => {
   const model = new TodoModel();
   const view  = new TodoView();
   new TodoPresenter(model, view);
});