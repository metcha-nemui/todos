// view/modals/diaryList.js - 過去の日記の一覧 (モーダル)
import { formatDateWithWeekday } from '../../lib/date.js';
import { escapeHtml, parseHtml } from '../util/html.js';
import { bindModalClose } from './close.js';

export class DiaryListModal {
   constructor() {
      this.modal     = document.getElementById('diary-list-modal');
      this.btnClose  = document.getElementById('btn-diary-list-close');
      this.list      = document.getElementById('list-diary');
      this.emptyText = document.getElementById('diary-list-empty');

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());
   }

   open() {
      this.modal.hidden = false;
      this.btnClose.focus();

      // 表示中の日付の日記が見える位置から始める
      this.list.querySelector('.is-current')?.scrollIntoView({ block: 'center' });
   }

   close() {
      this.modal.hidden = true;
   }

   // diaries: { date, content } の配列 (新しい順に並んでいること)
   render({ currentDate, diaries }) {
      this.emptyText.hidden = diaries.length > 0;
      this.list.innerHTML = '';

      let month = null;
      diaries.forEach(({ date, content }) => {
         // 月が変わるごとに見出しを挟む
         if (date.slice(0, 7) !== month) {
            month = date.slice(0, 7);
            const [yyyy, mm] = month.split('-');
            this.list.appendChild(parseHtml(
               `<li class="diary-list-month">${yyyy}年${Number(mm)}月</li>`
            ));
         }

         this.list.appendChild(parseHtml(
            `<li class="diary-list-item ${date === currentDate ? 'is-current' : ''}">
               <button type="button" data-date="${escapeHtml(date)}">
                  <span class="diary-list-date">${formatDateWithWeekday(date)}</span>
                  <span class="diary-list-text">${escapeHtml(content || '')}</span>
               </button>
            </li>`
         ));
      });
   }

   // 日記を選ぶと、その日付を handler に渡して閉じる
   bindSelect(handler) {
      this.list.addEventListener('click', (e) => {
         const button = e.target.closest('button[data-date]');
         if (!button) return;

         handler(button.dataset.date);
         this.close();
      });
   }
}
