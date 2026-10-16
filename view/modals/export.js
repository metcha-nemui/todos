// view/modals/export.js - 月ごとのタスクの Markdown 出力 (モーダル)
import { getTodayDateString, getMonthStartString } from '../../lib/date.js';
import { formatDaysMarkdown } from '../../lib/markdown.js';
import { copyToClipboard } from '../util/clipboard.js';
import { bindModalClose } from './close.js';

export class ExportModal {
   constructor() {
      this.modal       = document.getElementById('export-modal');
      this.btnClose    = document.getElementById('btn-export-close');
      this.btnPrev     = document.getElementById('btn-export-prev');
      this.btnNext     = document.getElementById('btn-export-next');
      this.monthText   = document.getElementById('export-month');
      this.count       = document.getElementById('export-count');
      this.preview     = document.getElementById('export-preview');
      this.emptyText   = document.getElementById('export-empty');
      this.btnCopy     = document.getElementById('btn-export-copy');
      this.btnDownload = document.getElementById('btn-export-download');

      // 月 ('YYYY-MM') → その月の { date, dones, todos } の配列を返す関数。bindGetTasks で受け取る
      this._getTasks = () => [];
      // 表示中の月の1日 ('YYYY-MM-01')
      this._monthStart = null;
      this._markdown = '';

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());

      this.btnPrev.addEventListener('click', () => this._shiftMonth(-1));
      this.btnNext.addEventListener('click', () => this._shiftMonth(+1));

      this.btnCopy.addEventListener('click', () => {
         copyToClipboard(this._markdown).then(() => alert("クリップボードにコピーしました"));
      });
      this.btnDownload.addEventListener('click', () => this._download());
   }

   // date ('YYYY-MM-DD'、空なら今日) の月を、最新のデータで表示して開く
   open(date) {
      this._monthStart = getMonthStartString(date || getTodayDateString());
      this._update();
      this.modal.hidden = false;
      this.btnClose.focus();
   }

   close() {
      this.modal.hidden = true;
   }

   bindGetTasks(getTasks) {
      this._getTasks = getTasks;
   }

   _shiftMonth(months) {
      this._monthStart = getMonthStartString(this._monthStart, months);
      this._update();
   }

   _update() {
      const month = this._monthStart.slice(0, 7);
      const days  = this._getTasks(month);
      const doneCount = days.reduce((sum, day) => sum + day.dones.length, 0);
      const todoCount = days.reduce((sum, day) => sum + day.todos.length, 0);

      this._markdown = formatDaysMarkdown(days);

      const [yyyy, mm] = month.split('-').map(Number);
      this.monthText.textContent = `${yyyy}年${mm}月`;
      this.count.textContent = `Done ${doneCount}件 / ToDo ${todoCount}件`;

      this.preview.value  = this._markdown;
      this.preview.hidden = days.length === 0;
      this.emptyText.hidden = days.length > 0;
      this.btnCopy.disabled     = days.length === 0;
      this.btnDownload.disabled = days.length === 0;
   }

   // 'tasks-YYYY-MM.md' として保存させる
   _download() {
      const url  = URL.createObjectURL(new Blob([this._markdown + '\n'], { type: 'text/markdown' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-${this._monthStart.slice(0, 7)}.md`;
      link.click();
      URL.revokeObjectURL(url);
   }
}
