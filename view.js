// view.js - UI Representation Layer

const _detailsKeyList = {
   "details-todo"  : "TODO",
   "details-done"  : "DONE",
   "details-nodate": "NODATE",
};

export class TodoView {
   constructor() {
      // ヘッダー・共通
      this.currentDateText = document.getElementById('current-date-text');
      this.datePicker = document.getElementById('date-picker');
      this.sections = document.querySelectorAll('.view-section');
      
      // 今日ビュー
      this.formAddDone = document.getElementById('form-add-done');
      this.formAddTodo = document.getElementById('form-add-todo');
      this.inputDoneTitle = document.getElementById('input-done-title');
      this.inputTodoTitle = document.getElementById('input-todo-title');
      this.toggleToDoEllipsis = document.getElementById('toggle-todo-ellipsis');
      this._todoIsEllipsis = true;
      
      // カスタムサジェスト要素
      this.suggestDone = document.getElementById('suggest-done-title');
      this.suggestTodo = document.getElementById('suggest-todo-title');
      this.suggestBacklog = document.getElementById('suggest-backlog-title');
      this.taskTemplatesData = []; // テンプレートリストデータ保持

      this.listTodo = document.getElementById('list-todo');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      this.CountTodo = document.getElementById('list-count-todo');
      this.CountDone = document.getElementById('list-count-done');
      this.btnPiP    = document.getElementById('btn-pip');
      this.inputDiary = document.getElementById('input-diary');
      
      // バックログビュー
      this.containerBacklogTasks = document.getElementById('container-backlog-tasks');
      this.formAddBacklog = document.getElementById('form-add-backlog');
      this.inputBacklogTitle = document.getElementById('input-backlog-title');
      this.inputBacklogDate = document.getElementById('input-backlog-date');
      
      this.doInputBacklogDateReset = true;
      this._storageKey = "todo_group_open_states";
      
      this.bindUIEvents();
      this.setupCustomSuggest();
   }
   
   bindUIEvents() {
      // <details> 開閉状況保存
      document.addEventListener("toggle", (e) => {
         const key = _detailsKeyList[e.target.id] || "";
         if(!key) return;
         
         const storageKey = this._storageKey;
         const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
         states[key] = e.target.open;
         localStorage.setItem(storageKey, JSON.stringify(states));
      }, { capture: true });
      
      this.inputDiary.addEventListener("input", () => {
         this._updateDiaryCounter();
      });
      
      this.toggleToDoEllipsis.addEventListener("click", () => {
         this._todoIsEllipsis = !this._todoIsEllipsis;
         if(this._todoIsEllipsis) {
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-on") .hidden = false;
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-off").hidden = true;
            const todoItems = this.listTodo.querySelectorAll(".task-item");
            todoItems.forEach((d, i) => {
               if(i >= 5) d.hidden = true;
            });
         } else {
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-on") .hidden = true;
            this.toggleToDoEllipsis.querySelector("#todo-ellipsis-off").hidden = false;
            const todoItems = this.listTodo.querySelectorAll(".task-item");
            todoItems.forEach((d, i) => {
               d.hidden = false;
            });
         }
      });
   }

   // カスタムサジェスト制御
   setupCustomSuggest() {
      const targets = [
         { input: this.inputDoneTitle, list: this.suggestDone },
         { input: this.inputTodoTitle, list: this.suggestTodo },
         { input: this.inputBacklogTitle, list: this.suggestBacklog }
      ];
      
      targets.forEach(({ input, list }) => {
         if (!input || !list) return;
         
         input.addEventListener('input', () => {
            const val = input.value.trim().toLowerCase();
            if (this.taskTemplatesData.length === 0) {
               list.hidePopover();
               return;
            }
            
            const matches = this.taskTemplatesData.filter(t => t.toLowerCase().includes(val));
            if (val && matches.length === 0) {
               list.hidePopover();
               return;
            }
            
            list.innerHTML = '';
            matches.forEach(item => {
               const div = document.createElement('div');
               div.className = 'suggest-item';
               div.textContent = item;
               div.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  input.value = item;
                  list.hidePopover();
               });
               list.appendChild(div);
            });
            list.showPopover();
            
            const rect = input.getBoundingClientRect();
            list.style.width = rect.width + "px";
         });
         
         input.addEventListener('focus', () => {
            input.dispatchEvent(new Event('input'));
         });
         
         input.addEventListener('blur', () => {
            setTimeout(() => { list.hidePopover(); }, 150);
         });
         
         input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
               list.hidePopover();
            }
         });
      });
   }
   
   render(data) {
      // 日付反映
      this.currentDateText.textContent = data.currentDate;
      this.datePicker.value = data.currentDate;
      if(this.doInputBacklogDateReset) {
         this.inputBacklogDate.value = data.tomorrowDate;
         this.doInputBacklogDateReset = false;
      }
      
      // 今日のDone描画
      this._renderTaskList(this.listDone, data.todayDones, true);
      this.CountDone.textContent = data.todayDones.length;
      
      // 今日のToDo描画
      this._renderTaskList(this.listTodo, data.todayTodos, false, true);
      this.CountTodo.textContent = data.todayTodos.length;
      
      if(this._todoIsEllipsis) {
         const todoItems = this.listTodo.querySelectorAll(".task-item");
         todoItems.forEach((d, i) => {
            if(i >= 5) d.hidden = true;
         });
      }
      
      // 今日のDiary描画
      this._renderDiary(data.todayDiary);
      
      // バックログ描画
      this._renderBacklogTasks(data.backlogTodos);
      
      // 開閉状況反映
      const details = document.querySelectorAll("details");
      for(const element of details) {
         const key = _detailsKeyList[element.id];
         if(!key) continue;
         
         const storageKey = this._storageKey;
         const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
         if(key in states) element.open = states[key];
      }
      const diaryDetails = this.inputDiary.closest("details");
      diaryDetails.open = this.inputDiary.value !== "";
      
      // サジェスト用のテンプレート保持
      this.taskTemplatesData = data.taskTemplates || [];
      
      // 動的生成された要素のLucideアイコンを有効化
      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }
   
   _renderTaskList(element, tasks, isDone, showDateChanger = false) {
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
                  <span class="task-title-text">${this._escapeHtml(task.title)}</span>
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
               <input type="text" class="edit-input" value="${this._escapeHtml(task.title)}" required style="flex: 1; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px;">
               <button type="submit" class="save-btn">保存</button>
               <button type="button" class="cancel-btn secondary">キャンセル</button>
            </form>
         `;
         element.appendChild(li);
      });
   }
    
   _renderBacklogTasks(groupedTasks) {
      this.containerBacklogTasks.innerHTML = '';
      if (Object.keys(groupedTasks).length === 0) {
         this.containerBacklogTasks.innerHTML = '<p style="color: var(--text-muted);">今後のタスク予定はありません</p>';
         return;
      }
      
      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const isNoDate = date === "日付なし";
         
         const details = this._parseHtml(
            `<details ${isNoDate ? `id="details-nodate"` : ""} class="collapse" open>
               <summary class="backlog-title">${date}</summary>
               <ul class="task-list"></ul>
            </details>`
         );
         const ul = details.querySelector('.task-list');
         this._renderTaskList(ul, tasks, false, true);
         
         this.containerBacklogTasks.appendChild(details);
      }
   }
   
   _renderDiary(data) {
      this.inputDiary.value = data?.content || "";
      this._updateDiaryCounter();
   }
    
   bindDatePicker(handler) {
      this.datePicker.addEventListener('change', (e) => {
         this.doInputBacklogDateReset = true;
         handler(e.target.value);
      });
   }
   
   bindAddTodo(handler) {
      this.formAddDone.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputDoneTitle.value.trim();
         const date  = this.datePicker.value || null;
         if(title) {
            handler(title, date, true);
            this.inputDoneTitle.value = '';
         }
      });
      
      this.formAddTodo.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputTodoTitle.value.trim();
         const date  = this.datePicker.value || null;
         if(title) {
            handler(title, date, false);
            this.inputTodoTitle.value = '';
         }
      });
      
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
   
   bindTaskActions(handleToggle, handleDelete, handleEdit, handleMoveToday, handleCopy) {
      const lists = [this.listTodo, this.listDone, this.containerBacklogTasks];
      
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
                  this._copyToClipboard(titleText);
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
   
   bindDragAndDrop(handleSortUpdate) {
      let draggedElement = null;
      let sourceList = null;

      const staticTargets = [this.listTodo, this.listDone];
      staticTargets.forEach(targetList => {
         if (!targetList) return;
         this._setupDragEventsForList(targetList, () => draggedElement, (el) => draggedElement = el, handleSortUpdate);
      });

      if (this.containerBacklogTasks) {
         this.containerBacklogTasks.addEventListener('dragstart', (e) => {
            draggedElement = e.target.closest('.task-item');
            if (draggedElement) {
               draggedElement.classList.add('dragging');
               sourceList = draggedElement.closest('.task-list');
            }
         });

         this.containerBacklogTasks.addEventListener('dragover', (e) => {
            e.preventDefault();
            const currentList = e.target.closest('.task-list');
            if (!currentList || currentList !== sourceList) return; 

            const afterElement = this._getDragAfterElement(currentList, e.clientY);
            if (afterElement == null) {
               currentList.appendChild(draggedElement);
            } else {
               currentList.insertBefore(draggedElement, afterElement);
            }
         });

         this.containerBacklogTasks.addEventListener('dragend', () => {
            if (draggedElement) {
               draggedElement.classList.remove('dragging');
               if (sourceList) {
                  const orderedIds = [...sourceList.querySelectorAll('.task-item')].map(li => li.dataset.id);
                  handleSortUpdate(orderedIds);
               }
               draggedElement = null;
               sourceList = null;
            }
         });
      }
   }

   _setupDragEventsForList(targetList, getDragged, setDragged, handleSortUpdate) {
      targetList.addEventListener('dragstart', (e) => {
         const el = e.target.closest('.task-item');
         if (el) {
            el.classList.add('dragging');
            setDragged(el);
         }
      });
      
      targetList.addEventListener('dragend', () => {
         const dragged = getDragged();
         if (dragged) {
            dragged.classList.remove('dragging');
            setDragged(null);
            
            const orderedIds = [...targetList.querySelectorAll('.task-item')].map(li => li.dataset.id);
            handleSortUpdate(orderedIds);
         }
      });
      
      targetList.addEventListener('dragover', (e) => {
         e.preventDefault();
         const dragged = getDragged();
         if (!dragged) return;
         
         const afterElement = this._getDragAfterElement(targetList, e.clientY);
         if (afterElement == null) {
            targetList.appendChild(dragged);
         } else {
            targetList.insertBefore(dragged, afterElement);
         }
      });
   }
   
   _getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
         const box = child.getBoundingClientRect();
         const offset = y - box.top - box.height / 2;
         if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
         } else {
            return closest;
         }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
   }
   
   bindCopyButtons(getTodos, getDones) {
      this.btnCopyTodo.addEventListener('click', () => {
         const date = this._formatDate(this.datePicker.value) + "\n";
         const md   = getTodos().map(t => `- [ ] ${t.title}`).join('\n');
         this._copyToClipboard(date+md).then(() => alert("クリップボードにコピーしました"));
      });
      
      this.btnCopyDone.addEventListener('click', () => {
         const date = this._formatDate(this.datePicker.value) + "\n";
         const md   = getDones().map(t => `- [x] ${t.title}`).join('\n');
         this._copyToClipboard(date+md).then(() => alert("クリップボードにコピーしました"));
      });
   }
   
   _formatDate(dateString) {
      const date = new Date(dateString);
      const formatter = new Intl.DateTimeFormat('ja-JP', {
         month: '2-digit',
         day:   '2-digit',
         weekday: 'short'
      });
      return formatter.format(date).replace(/\s+/g, '');
   }
   
   async _copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
         try {
            await navigator.clipboard.writeText(text);
            console.log('Clipboard API でコピー成功');
            return true;
         } catch (err) {
            console.error('Clipboard API でのエラー:', err);
         }
      }
      return this._fallbackCopyToClipboard(text);
   }
   
   _fallbackCopyToClipboard(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      let success = false;
      try {
         success = document.execCommand('copy');
      } catch (err) {
         console.error('フォールバック実行中にエラーが発生:', err);
      }
      
      document.body.removeChild(textArea);
      return success;
   }
   
   _updateDiaryCounter() {
      const counter = document.querySelector("#diary-counter");
      counter.textContent = this.inputDiary.value.length;
   }
   
   bindPiPButton(getTodos) {
      if (!('documentPictureInPicture' in window)) {
         this.btnPiP.hidden = true;
         return;
      }
      this.btnPiP.addEventListener("click", async() => {
         const pipWindow  = await window.documentPictureInPicture.requestWindow();
         const pipContent = document.querySelector("#pip-content").content.cloneNode(true);
         pipWindow.document.body.append(pipContent);
         const tasks = getTodos();
         const wrapper = pipWindow.document.querySelector("#wrapper");
         tasks.forEach(task => {
            const div = document.createElement("div");
            div.classList.add("task");
            div.textContent = task.title;
            div.insertAdjacentHTML("beforeend",
               `<span class="delete"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>`
            )
            wrapper.append(div);
         });
      });
   }
   
   bindUpdateDiary(handler) {
      this.inputDiary.addEventListener("blur", () => {
         handler(this.datePicker.value, this.inputDiary.value.trim());
      });
   }
   
   _escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
   }
   
   _parseHtml(htmlString) {
      const template = document.createElement('template');
      template.innerHTML = htmlString.trim();
      return template.content.firstElementChild;
   }
}