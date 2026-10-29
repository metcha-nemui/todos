// quick/view.js - クイック登録画面 (タスク名と日付を入れて追加するだけ)
import { showToast } from '../view/parts/toast.js';
import { watchTheme } from '../view/parts/theme.js';
import { getTodayDateString, getTomorrowDateString } from '../lib/date.js';

// インストールしたアプリとして開いたときのウィンドウの中身の幅 (px)。高さは中身に合わせる
const WINDOW_WIDTH = 440;
// 右下に置くときの画面の端からの間隔 (px)
const WINDOW_MARGIN = 12;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches;

export class QuickView {
   constructor() {
      this.tabs = document.querySelectorAll('[data-quick-kind]');
      this.form = document.getElementById('form-quick-add');
      this.inputTitle = document.getElementById('input-quick-title');
      this.inputDate = document.getElementById('input-quick-date');
      this.dateButtons = document.querySelectorAll('[data-quick-date]');
      this.btnAdd = document.getElementById('btn-quick-add');
      this.messageText = document.getElementById('quick-message-text');
      this.btnRetry = document.getElementById('btn-quick-retry');
      this.linkMain = document.getElementById('link-quick-main');

      // 日付は今日から始める。ボタンで今日 / 明日 / 日付なし に切り替える
      this.inputDate.value = getTodayDateString();
      this.dateButtons.forEach(btn => {
         btn.addEventListener('click', () => {
            this.inputDate.value = this._presetDate(btn.dataset.quickDate);
            this._renderDateButtons();
         });
      });
      this.inputDate.addEventListener('input', () => this._renderDateButtons());
      this._renderDateButtons();

      // 上部のタブで ToDo / Done のどちらに追加するかを切り替える
      this.isDone = false;
      this.tabs.forEach(tab => {
         tab.addEventListener('click', () => this._selectKind(tab.dataset.quickKind === 'done'));
      });

      // インストールしたアプリとして開いているときは、Escape でウィンドウを閉じる
      document.addEventListener('keydown', (e) => {
         if (e.key !== 'Escape') return;
         if (isStandalone()) window.close();
      });

      // 配色テーマは本編で切り替える。ここでは端末の設定と本編での切り替えに追従するだけ
      watchTheme();

      this._fitWindow();
   }

   // インストールしたアプリとして開いたら、ウィンドウを中身の大きさにして画面の右下へ置く
   // (Chrome は既定で大きなウィンドウで開くため)
   _fitWindow() {
      if (!isStandalone()) return;

      // 枠 (タイトルバーなど) の分を足して、ウィンドウ全体の大きさにする
      const width  = WINDOW_WIDTH + (window.outerWidth - window.innerWidth);
      const height = Math.ceil(document.body.getBoundingClientRect().height) + (window.outerHeight - window.innerHeight);

      window.resizeTo(width, height);
      // availWidth / availHeight はタスクバーを除いた広さなので、タスクバーには重ならない
      window.moveTo(
         screen.availLeft + screen.availWidth  - width  - WINDOW_MARGIN,
         screen.availTop  + screen.availHeight - height - WINDOW_MARGIN
      );
   }

   // Done は日付がないと本編のどこにも出ないので、明日 / 日付なし を隠し、日付を必須にする
   _selectKind(isDone) {
      this.isDone = isDone;
      this.tabs.forEach(tab => {
         tab.setAttribute('aria-selected', String((tab.dataset.quickKind === 'done') === isDone));
      });
      this.dateButtons.forEach(btn => {
         btn.hidden = isDone && btn.dataset.quickDate !== 'today';
      });
      this.inputDate.required = isDone;
      if (isDone && !this.inputDate.value) this.inputDate.value = getTodayDateString();
      this.inputTitle.placeholder = isDone ? '実行済タスクを入力...' : 'タスクを入力...';
      this._renderDateButtons();
      this.focus();
   }

   _presetDate(preset) {
      if (preset === 'today')    return getTodayDateString();
      if (preset === 'tomorrow') return getTomorrowDateString();
      return '';
   }

   // 今の日付に当たるボタンを強調する
   _renderDateButtons() {
      this.dateButtons.forEach(btn => {
         btn.classList.toggle('is-active', this._presetDate(btn.dataset.quickDate) === this.inputDate.value);
      });
   }

   // state: 'loading' | 'ready' | 'unconfigured' | 'needLogin' | 'failed'。追加できるのは 'ready' のときだけ
   renderStatus(state) {
      const ready = state === 'ready';
      this.inputTitle.disabled = !ready;
      this.btnAdd.disabled = !ready;
      this.btnRetry.hidden = state !== 'failed';
      this.linkMain.hidden = state !== 'unconfigured' && state !== 'needLogin';

      const messages = {
         loading:      '読み込み中…',
         ready:        '',
         unconfigured: '接続設定がありません。本編の「接続設定」から設定してください。',
         needLogin:    'ログインしていません。本編でログインしてください。',
         failed:       '読み込みに失敗しました。',
      };
      this._showMessage(messages[state], state !== 'ready' && state !== 'loading');

      if (ready) this.focus();
   }

   focus() {
      if (!this.inputTitle.disabled) this.inputTitle.focus();
   }

   showError(message) {
      this._showMessage(message, true);
   }

   _showMessage(message, isError = false) {
      this.messageText.textContent = message;
      this.messageText.classList.toggle('is-error', isError);
   }

   // handler(title, date, isDone) は追加に成功したら true を返す
   // 成功したらタスク名だけ空にする (日付は続けて登録するときのため残す)
   bindAdd(handler) {
      this.form.addEventListener('submit', async (e) => {
         e.preventDefault();
         const title  = this.inputTitle.value.trim();
         const date   = this.inputDate.value || null;
         const isDone = this.isDone;
         if (!title || this.btnAdd.disabled) return;

         this.btnAdd.disabled = true;
         const ok = await handler(title, date, isDone);
         this.btnAdd.disabled = false;
         if (!ok) return;

         this.inputTitle.value = '';
         this._showMessage('');
         showToast(isDone ? 'Doneに追加しました' : 'ToDoに追加しました');
         this.focus();
      });
   }

   bindRetry(handler) {
      this.btnRetry.addEventListener('click', handler);
   }

   // ウィンドウに戻ってきたとき (ショートカットで前面に出したときなど) に handler を呼ぶ
   bindResume(handler) {
      window.addEventListener('focus', () => handler());
      document.addEventListener('visibilitychange', () => {
         if (document.visibilityState === 'visible') handler();
      });
   }
}
