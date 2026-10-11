// view/panels/statusBanner.js - 画面上部の通知 (オフライン / 読み込み失敗)

export class StatusBanner {
   constructor() {
      this.banner   = document.getElementById('status-banner');
      this.text     = document.getElementById('status-banner-text');
      this.actions  = document.getElementById('status-banner-actions');
      this.btnRetry = document.getElementById('btn-status-retry');

      this._loadFailed = false;

      window.addEventListener('online',  () => this._update());
      window.addEventListener('offline', () => this._update());
      this._update();
   }

   render({ loadFailed }) {
      this._loadFailed = loadFailed;
      this._update();
   }

   // オフラインの表示を優先する (その間は読み込みも失敗するため)
   _update() {
      const isOffline = !navigator.onLine;

      if (isOffline)             this.text.textContent = 'オフラインです。接続が戻ると読み込み直します';
      else if (this._loadFailed) this.text.textContent = 'データの読み込みに失敗しました';

      this.actions.hidden = isOffline;
      this.banner.hidden  = !isOffline && !this._loadFailed;
   }

   bindRetry(handler) {
      this.btnRetry.addEventListener('click', () => handler());
   }
}
