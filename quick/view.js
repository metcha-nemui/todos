// quick/view.js - クイック登録画面 (タスク名と日付を入れて追加するだけ)
import { setupCustomSuggest } from '../view/parts/suggest.js';
import { getTodayDateString, getTomorrowDateString, formatDateWithWeekday } from '../lib/date.js';

// 追加したタスクの一覧に残す件数
const ADDED_LIMIT = 5;

export class QuickView {
   constructor() {
      this.form = document.getElementById('form-quick-add');
      this.inputTitle = document.getElementById('input-quick-title');
      this.suggestList = document.getElementById('suggest-quick-title');
      this.inputDate = document.getElementById('input-quick-date');
      this.dateButtons = document.querySelectorAll('[data-quick-date]');
      this.btnAdd = document.getElementById('btn-quick-add');
      this.messageText = document.getElementById('quick-message-text');
      this.btnRetry = document.getElementById('btn-quick-retry');
      this.linkMain = document.getElementById('link-quick-main');
      this.listAdded = document.getElementById('list-quick-added');

      this.templates = [];
      setupCustomSuggest(
         [{ input: this.inputTitle, list: this.suggestList }],
         () => this.templates
      );

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

      // インストールしたアプリとして開いているときは、Escape でウィンドウを閉じる
      // サジェストが開いていればそちらを閉じるだけにする (先に見るため capture で受ける)
      document.addEventListener('keydown', (e) => {
         if (e.key !== 'Escape') return;
         if (this.suggestList.matches(':popover-open')) return;
         if (window.matchMedia('(display-mode: standalone)').matches) window.close();
      }, true);
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

   setTemplates(templates) {
      this.templates = templates || [];
   }

   // state: 'loading' | 'ready' | 'unconfigured' | 'failed'。追加できるのは 'ready' のときだけ
   renderStatus(state) {
      const ready = state === 'ready';
      this.inputTitle.disabled = !ready;
      this.btnAdd.disabled = !ready;
      this.btnRetry.hidden = state !== 'failed';
      this.linkMain.hidden = state !== 'unconfigured';

      const messages = {
         loading:      '読み込み中…',
         ready:        '',
         unconfigured: '接続設定がありません。本編の「接続設定」から設定してください。',
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

   // handler(title, date) は追加に成功したら true を返す
   // 成功したらタスク名だけ空にする (日付は続けて登録するときのため残す)
   bindAdd(handler) {
      this.form.addEventListener('submit', async (e) => {
         e.preventDefault();
         const title = this.inputTitle.value.trim();
         const date  = this.inputDate.value || null;
         if (!title || this.btnAdd.disabled) return;

         this.btnAdd.disabled = true;
         const ok = await handler(title, date);
         this.btnAdd.disabled = false;
         if (!ok) return;

         this.inputTitle.value = '';
         this._showMessage('追加しました');
         this._prependAdded(title, date);
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

   _prependAdded(title, date) {
      const li = document.createElement('li');
      const dateSpan = document.createElement('span');
      dateSpan.className = 'quick-added-date';
      dateSpan.textContent = date ? formatDateWithWeekday(date) : '日付なし';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      li.append(dateSpan, titleSpan);

      this.listAdded.prepend(li);
      while (this.listAdded.children.length > ADDED_LIMIT) this.listAdded.lastElementChild.remove();
   }
}
