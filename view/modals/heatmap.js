// view/modals/heatmap.js - 日ごとの Done 件数のヒートマップ (モーダル)
import { getTodayDateString, getMonthStartString, getWeekdayIndex, shiftDateString, formatDateWithWeekday } from '../../lib/date.js';
import { escapeHtml, parseHtml } from '../util/html.js';
import { bindModalClose } from './close.js';

// 表示する月数 (今月を含む)
const MONTH_COUNT = 12;

// 件数 → 濃さ (0〜4) を返す関数を作る
// 1件以上の日の四分位で区切る (突出して多い日があっても全体が薄くならない)
function createLevelOf(counts) {
   const sorted = counts.filter(c => c > 0).sort((a, b) => a - b);
   const thresholds = [0.25, 0.5, 0.75].map(p => sorted[Math.floor((sorted.length - 1) * p)]);

   return (count) => count > 0 ? 1 + thresholds.filter(t => count > t).length : 0;
}

export class HeatmapModal {
   constructor() {
      this.modal    = document.getElementById('heatmap-modal');
      this.btnClose = document.getElementById('btn-heatmap-close');
      this.months   = document.getElementById('heatmap-months');
      this.total    = document.getElementById('heatmap-total');

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());
   }

   open() {
      this.modal.hidden = false;
      this.btnClose.focus();

      // 折り返して縦に並んだときは、最新の月が見える位置から始める
      this.months.scrollTop = this.months.scrollHeight;
   }

   close() {
      this.modal.hidden = true;
   }

   // counts: { 'YYYY-MM-DD': Done の件数 }
   render({ currentDate, counts }) {
      const today = getTodayDateString();

      // 月ごとに、1日から月末 (今月は今日) までの日付を並べる
      const months = [];
      for (let offset = 1 - MONTH_COUNT; offset <= 0; offset++) {
         const first = getMonthStartString(today, offset);
         const next  = getMonthStartString(today, offset + 1);
         const dates = [];
         for (let date = first; date < next && date <= today; date = shiftDateString(date, 1)) {
            dates.push(date);
         }
         months.push({ first, dates });
      }

      const shownCounts = months.flatMap(m => m.dates.map(date => counts[date] || 0));
      const levelOf = createLevelOf(shownCounts);
      this.total.textContent = `直近${MONTH_COUNT}か月で ${shownCounts.reduce((sum, c) => sum + c, 0)} 件`;

      this.months.innerHTML = '';
      months.forEach(({ first, dates }, index) => {
         // 年は先頭の月と1月にだけ付ける
         const [yyyy, mm] = first.split('-').map(Number);
         const label = (index === 0 || mm === 1) ? `${yyyy}年${mm}月` : `${mm}月`;

         // 1日の曜日まで空きマスで埋める (列が週、行が曜日)
         const pads = '<span class="heatmap-pad"></span>'.repeat(getWeekdayIndex(first));
         const cells = dates.map(date => {
            const count = counts[date] || 0;
            const text  = `${formatDateWithWeekday(date)} ${count}件`;
            return `<button type="button" class="heatmap-cell ${date === currentDate ? 'is-current' : ''}"
               data-date="${escapeHtml(date)}" data-level="${levelOf(count)}"
               title="${escapeHtml(text)}" aria-label="${escapeHtml(text)}"></button>`;
         }).join('');

         this.months.appendChild(parseHtml(
            `<div class="heatmap-month">
               <div class="heatmap-month-label">${label}</div>
               <div class="heatmap-grid">${pads}${cells}</div>
            </div>`
         ));
      });
   }

   // マスを選ぶと、その日付を handler に渡して閉じる
   bindSelect(handler) {
      this.months.addEventListener('click', (e) => {
         const button = e.target.closest('button[data-date]');
         if (!button) return;

         handler(button.dataset.date);
         this.close();
      });
   }
}
