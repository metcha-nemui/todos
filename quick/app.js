// quick/app.js - クイック登録画面の Presenter / エントリポイント
// 本編と同じ TodoModel を使い、タスクの追加だけを行う
import { TodoModel } from '../model.js';
import { supabase } from '../lib/supabase.js';
import { QuickView } from './view.js';

// ウィンドウ復帰時の読み直しを、この間隔 (ミリ秒) より短くは繰り返さない
const RELOAD_MIN_INTERVAL = 5000;

class QuickPresenter {
   constructor(model, view) {
      this.model = model;
      this.view  = view;

      this.model.bindOnError((message) => this.view.showError(message));

      this.view.bindAdd((title, date, isDone) => this.model.addTodo(title, date, isDone));
      this.view.bindRetry(() => this.load(this.model.reload()));

      // 他の端末や本編での追加を並び順に反映するため、戻ってきたら読み直す
      // 追加できる状態なら、入力を止めないよう裏で読み直す
      this.view.bindResume(() => {
         this.view.focus();
         if (Date.now() - this.model.lastLoadStartedAt < RELOAD_MIN_INTERVAL) return;
         if (this.ready) this.model.reload();
         else            this.load(this.model.reload());
      });

      this.ready = false;
      this.load(this.model.initialLoad);
   }

   // 並び順 (末尾に足す位置) を決めるのに既存のタスクが要るので、読み込めるまでは追加させない
   async load(loading) {
      if (!supabase) return this.view.renderStatus('unconfigured');

      this.view.renderStatus('loading');
      await loading;
      this.ready = !this.model.loadFailed;
      this.view.renderStatus(this.ready ? 'ready' : 'failed');
   }
}

document.addEventListener('DOMContentLoaded', () => {
   new QuickPresenter(new TodoModel(), new QuickView());

   // オフライン時の表示用 (本編と同じ sw.js)。登録の失敗は動作に影響しない
   if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('../sw.js').catch(e => console.warn('Service worker registration failed:', e));
   }
});
