// view/panels/backlog.js - 「今後のタスク」パネル
import { renderTaskList } from '../parts/taskList.js';
import { parseHtml } from '../util/html.js';

export class BacklogPanel {
   constructor() {
      this.containerBacklogTasks = document.getElementById('container-backlog-tasks');
      this.formAddBacklog = document.getElementById('form-add-backlog');
      this.inputBacklogTitle = document.getElementById('input-backlog-title');
      this.inputBacklogDate = document.getElementById('input-backlog-date');

      // サジェストを付ける入力欄
      this.suggestTargets = [
         { input: this.inputBacklogTitle, list: document.getElementById('suggest-backlog-title') },
      ];

      this._doInputDateReset = true;
      this._tomorrowDate = null;
   }

   // groupedTasks: { グループ名(日付): タスク配列 }
   render({ tomorrowDate, groupedTasks }) {
      // 日をまたいで「明日」が変わったら、初期値も合わせ直す
      if(tomorrowDate !== this._tomorrowDate) {
         this._tomorrowDate = tomorrowDate;
         this._doInputDateReset = true;
      }
      if(this._doInputDateReset) {
         this.inputBacklogDate.value = tomorrowDate;
         this._doInputDateReset = false;
      }

      this.containerBacklogTasks.innerHTML = '';
      if (Object.keys(groupedTasks).length === 0) {
         this.containerBacklogTasks.innerHTML = '<p class="empty-text">今後のタスク予定はありません</p>';
         return;
      }

      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const isNoDate = date === "日付なし";

         const details = parseHtml(
            `<details ${isNoDate ? `id="details-nodate"` : ""} class="collapse" open>
               <summary class="collapse-title">${date}</summary>
               <ul class="task-list"></ul>
            </details>`
         );
         const ul = details.querySelector('.task-list');
         renderTaskList(ul, tasks, false, true);

         this.containerBacklogTasks.appendChild(details);
      }
   }

   // 次の描画で、追加フォームの日付を初期値 (翌日) に戻す
   resetInputDate() {
      this._doInputDateReset = true;
   }

   bindAddTodo(handler) {
      this.formAddBacklog.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputBacklogTitle.value.trim();
         const date  = this.inputBacklogDate.value || null;
         if(title) {
            handler(title, date, false);
            this.inputBacklogTitle.value = '';
         }
      });
   }
}
