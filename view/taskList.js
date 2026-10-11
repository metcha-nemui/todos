// view/taskList.js - タスク行の描画と行内アクション
import { copyToClipboard } from './clipboard.js';

export function renderTaskList(element, tasks, isDone, showDateChanger = false) {
   element.innerHTML = '';
   tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.dataset.id = task.id;
      li.setAttribute('draggable', 'true');

      li.innerHTML = `
         <div class="task-view-mode" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <div class="task-item-content ${isDone ? 'done' : ''}">
               <input type="checkbox" ${isDone ? 'checked' : ''} class="toggle-check">
               <span class="task-title-text">${escapeHtml(task.title)}</span>
            </div>
            <div class="task-actions">
               <div class="actions-desktop">
                  <button class="copy-btn secondary"><i data-lucide="copy"></i></button>
                  ${showDateChanger ? `
                     <button class="secondary" style="position: relative;">
                        <input type="date" class="move-date-picker">
                        <i data-lucide="calendar-days"></i>
                     </button>
                  ` : ''}
                  <button class="edit-btn secondary"><i data-lucide="pencil"></i></button>
                  <button class="delete-btn danger"><i data-lucide="trash-2"></i></button>
               </div>
               <div class="actions-mobile">
                  <button class="menu-btn secondary"><i data-lucide="more-vertical"></i></button>
                  <div class="action-menu" hidden>
                     <button class="copy-btn secondary"><i data-lucide="copy"></i> コピー</button>
                     ${showDateChanger ? `
                        <button class="secondary" style="position: relative">
                           <input type="date" class="move-date-picker">
                           <i data-lucide="calendar-days"></i> 日付変更
                        </button>`
                     : ''}
                     <button class="edit-btn secondary"><i data-lucide="pencil"></i> 編集</button>
                     <button class="delete-btn danger"><i data-lucide="trash-2"></i> 削除</button>
                  </div>
               </div>
            </div>
         </div>

         <form class="task-edit-mode" style="display: none; width: 100%; gap: 10px;">
            <input type="text" class="edit-input" value="${escapeHtml(task.title)}" required style="flex: 1; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px;">
            <button type="submit" class="save-btn">保存</button>
            <button type="button" class="cancel-btn secondary">キャンセル</button>
         </form>
      `;
      element.appendChild(li);
   });
}

// lists: タスク行 (.task-item) を内包する要素群。イベント委譲で処理する
export function bindTaskActions(lists, handleToggle, handleDelete, handleEdit, handleMoveToday) {
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
            menu.style.top  = rect.top  + "px";
            menu.style.left = rect.left - menu.getBoundingClientRect().width/2 + "px";
            const closeMenu = () => {
               menu.hidden = true;
               document.removeEventListener('click', closeMenu);
            };
            setTimeout(() => document.addEventListener('click', closeMenu), 0);
            return;
         }

         const viewMode = li.querySelector('.task-view-mode');
         const editMode = li.querySelector('.task-edit-mode');
         const editInput = li.querySelector('.edit-input');

         const actionMap = {
            'toggle-check': () => handleToggle(id),
            'delete-btn'  : () => {
               const ret = confirm('このタスクを削除しますか？');
               if(ret) handleDelete(id);
               else    e.preventDefault();
            },
            'copy-btn'    : () => {
               const titleText = li.querySelector('.task-title-text').textContent;
               copyToClipboard(titleText);
            },
            'move-date-picker': (e) => {
               if(e.target.closest(".actions-mobile")) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.target.showPicker();
               }
            },
            'edit-btn'    : () => {
               viewMode.style.display = 'none';
               editMode.style.display = 'flex';
               editInput.focus();
               const val = editInput.value;
               editInput.value = '';
               editInput.value = val;
            },
            'cancel-btn'  : () => {
               editInput.value = li.querySelector('.task-title-text').textContent;
               editMode.style.display = 'none';
               viewMode.style.display = 'flex';
            }
         };

         for(const className of target.classList) {
            if(actionMap[className]) {
               actionMap[className](e);
               return;
            }
         }
      });

      listContainer.addEventListener('input', (e) => {
         const target = e.target;
         if (target.classList.contains('move-date-picker')) {
            const li = target.closest('.task-item');
            if (!li) return;
            const id = li.dataset.id;
            const chosenDate = target.value || null;
            handleMoveToday(id, chosenDate);
         }
      });

      listContainer.addEventListener('submit', (e) => {
         e.preventDefault();
         const targetForm = e.target.closest('.task-edit-mode');
         if (!targetForm) return;

         const li = targetForm.closest('.task-item');
         const id = li.dataset.id;
         const editInput = targetForm.querySelector('.edit-input');
         const newTitle = editInput.value.trim();

         if (newTitle) {
            handleEdit(id, newTitle);
         }
      });
   });
}

function escapeHtml(str) {
   return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
