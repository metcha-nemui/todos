// view/modals/dormant.js - 最近やらなくなったもの (モーダル)
import { escapeHtml, parseHtml } from '../util/html.js';
import { bindModalClose } from './close.js';

// 'YYYY-MM-DD' → 'YYYY/MM/DD'
const formatDate = (date) => date.replaceAll('-', '/');

export class DormantModal {
   constructor() {
      this.modal       = document.getElementById('dormant-modal');
      this.btnClose    = document.getElementById('btn-dormant-close');
      this.description = document.getElementById('dormant-description');
      this.list        = document.getElementById('list-dormant');
      this.emptyText   = document.getElementById('dormant-empty');

      // { minCount, days, activities } を返す関数。bindGetActivities で受け取る
      this._getActivities = () => ({ minCount: 0, days: 0, activities: [] });

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());
   }

   // 開くたびに最新のデータで数え直す
   open() {
      this._render(this._getActivities());
      this.modal.hidden = false;
   }

   close() {
      this.modal.hidden = true;
   }

   bindGetActivities(getActivities) {
      this._getActivities = getActivities;
   }

   // 行を選ぶと閉じて、その名前を handler に渡す
   bindSelect(handler) {
      this.list.addEventListener('click', (e) => {
         const button = e.target.closest('button[data-name]');
         if (!button) return;

         this.close();
         handler(button.dataset.name);
      });
   }

   _render({ minCount, days, activities }) {
      this.description.textContent = `Done が${minCount}回以上あり、最後の Done から${days}日以上たったもの`;
      this.emptyText.hidden = activities.length > 0;
      this.list.innerHTML = '';

      activities.forEach(({ name, count, first, last, daysSince }) => {
         this.list.appendChild(parseHtml(
            `<li class="dormant-item">
               <button type="button" data-name="${escapeHtml(name)}">
                  <span class="dormant-name">${escapeHtml(name)}</span>
                  <span class="dormant-meta">${count}回・${formatDate(first)}〜${formatDate(last)}・${daysSince}日前が最後</span>
               </button>
            </li>`
         ));
      });
   }
}
