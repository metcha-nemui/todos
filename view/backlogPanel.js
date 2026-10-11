// view/backlogPanel.js - 「今後のタスク」パネル
import { renderTaskList } from './taskList.js';

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
   }

   // groupedTasks: { グループ名(日付): タスク配列 }
   render({ tomorrowDate, groupedTasks }) {
      if(this._doInputDateReset) {
         this.inputBacklogDate.value = tomorrowDate;
         this._doInputDateReset = false;
      }

      this.containerBacklogTasks.innerHTML = '';
      if (Object.keys(groupedTasks).length === 0) {
         this.containerBacklogTasks.innerHTML = '<p style="color: var(--text-muted);">今後のタスク予定はありません</p>';
         return;
      }

      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const isNoDate = date === "日付なし";

         const details = parseHtml(
            `<details ${isNoDate ? `id="details-nodate"` : ""} class="collapse" open>
               <summary class="backlog-title">${date}</summary>
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

function parseHtml(htmlString) {
   const template = document.createElement('template');
   template.innerHTML = htmlString.trim();
   return template.content.firstElementChild;
}
