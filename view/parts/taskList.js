// view/parts/taskList.js - タスク行の描画と行内アクション
import { openDatePicker } from './datePicker.js';
import { copyToClipboard } from '../util/clipboard.js';
import { escapeHtml } from '../util/html.js';

// getBadge(task) はタスク名の後ろに出す札の文字 (出さないときは空文字) を返す
export function renderTaskList(element, tasks, isDone, showDateChanger = false, getBadge = () => '') {
   element.innerHTML = '';
   tasks.forEach(task => {
      const badge = getBadge(task);
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.id;
      li.dataset.dueDate = task.due_date || '';
      li.setAttribute('draggable', 'true');

      li.innerHTML = `
         <div class="task-view-mode">
            <div class="task-item-content ${isDone ? 'done' : ''}">
               <input type="checkbox" ${isDone ? 'checked' : ''} class="toggle-check">
               <span class="task-title-text">${escapeHtml(task.title)}</span>
               ${badge ? `<span class="task-badge">${escapeHtml(badge)}</span>` : ''}
            </div>
            <div class="task-actions">
               <div class="actions-desktop">
                  <button class="copy-btn secondary"><i data-lucide="copy"></i></button>
                  ${showDateChanger ? `
                     <button class="secondary move-date-btn" title="日付変更"><i data-lucide="calendar-days"></i></button>
                  ` : ''}
                  ${isDone ? '' : `<button class="split-btn secondary" title="分割"><i data-lucide="split"></i></button>`}
                  <button class="edit-btn secondary"><i data-lucide="pencil"></i></button>
                  <button class="delete-btn danger"><i data-lucide="trash-2"></i></button>
               </div>
               <div class="actions-mobile">
                  <button class="menu-btn secondary"><i data-lucide="more-vertical"></i></button>
                  <div class="action-menu" hidden>
                     <button class="copy-btn secondary"><i data-lucide="copy"></i> コピー</button>
                     ${showDateChanger ? `
                        <button class="secondary move-date-btn"><i data-lucide="calendar-days"></i> 日付変更</button>`
                     : ''}
                     ${isDone ? '' : `<button class="split-btn secondary"><i data-lucide="split"></i> 分割</button>`}
                     <button class="edit-btn secondary"><i data-lucide="pencil"></i> 編集</button>
                     <button class="delete-btn danger"><i data-lucide="trash-2"></i> 削除</button>
                  </div>
               </div>
            </div>
         </div>
      `;
      element.appendChild(li);
   });
}

// lists: タスク行 (.task-item) を内包する要素群。イベント委譲で処理する
// onEdit(id, title) / onSplit(id, title) は編集・分割の画面を開くために呼ぶ (title は今のタスク名)
export function bindTaskActions(lists, { onToggle, onDelete, onEdit, onChangeDate, onSplit }) {
   lists.forEach(listContainer => {
      if(!listContainer) return;

      listContainer.addEventListener('click', (e) => {
         const target = e.target;
         const li = target.closest('.task-item');
         if (!li) return;
         const id = li.dataset.id;

         const menuBtn = target.closest('.menu-btn');
         if (menuBtn) {
            const menu = menuBtn.nextElementSibling;
            const rect = menuBtn.getBoundingClientRect();
            menu.hidden = false;
            // ボタンの下に右端を揃えて開く。下に収まらなければ上に開き、左右は画面内に収める
            const { width, height } = menu.getBoundingClientRect();
            const gap = 4;
            const top = rect.bottom + gap + height <= window.innerHeight ? rect.bottom + gap : rect.top - gap - height;
            const left = Math.min(Math.max(rect.right - width, gap), window.innerWidth - width - gap);
            menu.style.top  = Math.max(top, gap) + "px";
            menu.style.left = left + "px";
            const closeMenu = () => {
               menu.hidden = true;
               document.removeEventListener('click', closeMenu);
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
            return;
         }
         const actionMap = {
            'toggle-check': () => onToggle(id),
            'delete-btn'  : () => {
               const ret = confirm('このタスクを削除しますか？');
               if(ret) onDelete(id);
               else    e.preventDefault();
            },
            'copy-btn'    : () => {
               const titleText = li.querySelector('.task-title-text').textContent;
               copyToClipboard(titleText);
            },
            'move-date-btn': () => {
               openDatePicker(target, {
                  value: li.dataset.dueDate || null,
                  allowEmpty: true,
                  onSelect: (date) => onChangeDate(id, date),
               });
            },
            'split-btn'   : () => {
               onSplit(id, li.querySelector('.task-title-text').textContent);
            },
            'edit-btn'    : () => {
               onEdit(id, li.querySelector('.task-title-text').textContent);
            },
         };

         for(const className of target.classList) {
            if(actionMap[className]) {
               actionMap[className](e);
               return;
            }
         }
      });
   });
}
