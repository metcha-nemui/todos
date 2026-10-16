// view/modals/doneSearch.js - Done タスクの検索 (モーダル)
import { formatDateWithWeekday } from '../../lib/date.js';
import { formatDaysMarkdown, groupDonesByDate } from '../../lib/markdown.js';
import { copyToClipboard } from '../util/clipboard.js';
import { escapeHtml, parseHtml } from '../util/html.js';
import { bindModalClose } from './close.js';

// text のうち keyword に一致する部分 (大文字小文字は区別しない) を <mark> で囲んだ HTML を返す
function highlight(text, keyword) {
   const lower = text.toLowerCase();
   const key   = keyword.toLowerCase();
   // 小文字化で文字数が変わる場合は位置がずれるので囲まない
   if (lower.length !== text.length) return escapeHtml(text);

   let html = '';
   let from = 0;
   for (let i = lower.indexOf(key); i >= 0; i = lower.indexOf(key, from)) {
      html += escapeHtml(text.slice(from, i)) + `<mark>${escapeHtml(text.slice(i, i + key.length))}</mark>`;
      from = i + key.length;
   }
   return html + escapeHtml(text.slice(from));
}

export class DoneSearchModal {
   constructor() {
      this.modal     = document.getElementById('done-search-modal');
      this.btnClose  = document.getElementById('btn-done-search-close');
      this.input     = document.getElementById('input-done-search');
      this.count     = document.getElementById('done-search-count');
      this.btnCopy   = document.getElementById('btn-done-search-copy');
      this.list      = document.getElementById('list-done-search');
      this.emptyText = document.getElementById('done-search-empty');

      // 検索語 → ヒットした Done (新しい順) を返す関数。bindSearch で受け取る
      this._search  = () => [];
      this._results = [];

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());

      this.input.addEventListener('input', () => this._update());
      this.modal.querySelector('form').addEventListener('submit', (e) => e.preventDefault());

      this.btnCopy.addEventListener('click', () => {
         const md = formatDaysMarkdown(groupDonesByDate(this._results));
         copyToClipboard(md).then(() => alert("クリップボードにコピーしました"));
      });
   }

   // 前回の検索語を残したまま、最新のデータで検索し直して開く
   open() {
      this.modal.hidden = false;
      this._update();
      this.input.focus();
      this.input.select();
   }

   close() {
      this.modal.hidden = true;
   }

   bindSearch(search) {
      this._search = search;
   }

   // タスクを選ぶと、その日付を handler に渡して閉じる
   bindSelect(handler) {
      this.list.addEventListener('click', (e) => {
         const button = e.target.closest('button[data-date]');
         if (!button) return;

         handler(button.dataset.date);
         this.close();
      });
   }

   _update() {
      const keyword = this.input.value.trim();
      this._results = keyword ? this._search(keyword) : [];

      this.count.textContent = keyword ? `${this._results.length}件` : '';
      this.btnCopy.disabled  = this._results.length === 0;
      this.emptyText.hidden  = !keyword || this._results.length > 0;
      this.list.innerHTML = '';

      let month = undefined;
      this._results.forEach(task => {
         // 月が変わるごとに見出しを挟む
         const taskMonth = task.due_date ? task.due_date.slice(0, 7) : null;
         if (taskMonth !== month) {
            month = taskMonth;
            const label = month ? `${month.slice(0, 4)}年${Number(month.slice(5))}月` : '日付なし';
            this.list.appendChild(parseHtml(`<li class="modal-list-heading">${label}</li>`));
         }

         const date = task.due_date || '';
         this.list.appendChild(parseHtml(
            `<li class="done-search-item">
               <button type="button" data-date="${escapeHtml(date)}" ${date ? '' : 'disabled'}>
                  <span class="done-search-date">${formatDateWithWeekday(date)}</span>
                  <span class="done-search-title">${highlight(task.title, keyword)}</span>
               </button>
            </li>`
         ));
      });
   }
}
