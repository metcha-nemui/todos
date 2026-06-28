// view.js - UI Representation Layer
export class TodoView {
   constructor() {
      // ヘッダー・共通
      this.currentDateText = document.getElementById('current-date-text');
      this.datePicker = document.getElementById('date-picker');
      this.sections = document.querySelectorAll('.view-section');
      
      // 今日ビュー
      this.formAddTodo = document.getElementById('form-add-todo');
      this.inputTodoTitle = document.getElementById('input-todo-title');
      this.listTodo = document.getElementById('list-todo');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      this.CountTodo = document.getElementById('list-count-todo');
      this.CountDone = document.getElementById('list-count-done');
      this.btnPiP    = document.getElementById('btn-pip');
      
      // バックログビュー
      this.containerBacklogTasks = document.getElementById('container-backlog-tasks');
      this.formAddBacklog = document.getElementById('form-add-backlog');
      this.inputBacklogTitle = document.getElementById('input-backlog-title');
      this.inputBacklogDate = document.getElementById('input-backlog-date');
      
      this.doInputBacklogDateReset = true;
   }
   
   render(data) {
      // 日付反映
      this.currentDateText.textContent = data.currentDate;
      this.datePicker.value = data.currentDate;
      if(this.doInputBacklogDateReset && data.currentDate)
      {  this.inputBacklogDate.value = data.currentDate;
         this.doInputBacklogDateReset = false;
      }
      
      // 今日のToDo描画
      this._renderTaskList(this.listTodo, data.todayTodos, false, true);
      this.CountTodo.textContent = data.todayTodos.length;
      // 今日のDone描画
      this._renderTaskList(this.listDone, data.todayDones, true);
      this.CountDone.textContent = data.todayDones.length;
      // バックログ描画
      this._renderBacklogTasks(data.backlogTodos);
      
      // 動的生成された要素のLucideアイコンを有効化
      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }
   
   setInitialDate(date) {
      this.inputBacklogDate.value = date;
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
      
      const storageKey = "todo_group_open_states";
      const savedStates = JSON.parse(localStorage.getItem(storageKey) || '{}');
      
      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const isNoDate = date === "日付なし";
         const isOpen = isNoDate
            ? (savedStates[date] !== undefined ? savedStates[date] : true)
            : true;
         
         const details = this._parseHtml(
            `<details class="backlog-group" ${isOpen ? 'open' : ''}>
               <summary class="backlog-title">${date}</summary>
               <ul class="task-list"></ul>
            </details>`
         );
         const ul = details.querySelector('.task-list');
         this._renderTaskList(ul, tasks, false, true);
         
         if (isNoDate) {
            details.addEventListener('toggle', () => {
               const states = JSON.parse(localStorage.getItem(storageKey) || '{}');
               states[date] = details.open;
               localStorage.setItem(storageKey, JSON.stringify(states));
            });
         }
         
         this.containerBacklogTasks.appendChild(details);
      }
   }
    
   bindDatePicker(handler) {
      this.datePicker.addEventListener('change', (e) => {
         this.doInputBacklogDateReset = true;
         handler(e.target.value);
      });
   }
   
   bindAddTodo(handler) {
      // 1. 従来の「今日」のフォーム（自動的に選択中の今日の日付で登録）
      this.formAddTodo.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputTodoTitle.value.trim();
         const date  = this.datePicker.value || null;
         if(title) {
            handler(title, date);
            this.inputTodoTitle.value = '';
         }
      });
      
      // 2. 新設した「今後のタスク」のフォーム（datepickerの値を使用）
      this.formAddBacklog.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputBacklogTitle.value.trim();
         const date  = this.inputBacklogDate.value || null; // 選択された日付、未選択ならnull
         if(title) {
            handler(title, date);
            this.inputBacklogTitle.value = '';
         }
      });
   }
   
   bindTaskActions(handleToggle, handleDelete, handleEdit, handleMoveToday, handleCopy) {
      const lists = [this.listTodo, this.listDone, this.containerBacklogTasks];
      
      lists.forEach(listContainer => {
         if(!listContainer) return;
         
         // 1. 通常のアクション（クリックイベント）
         listContainer.addEventListener('click', (e) => {
            const target = e.target;
            const li = target.closest('.task-item');
            if (!li) return;
            const id = li.dataset.id;
            
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
                  actionMap[className](); 
                  return; 
               }
            }
         });
         
         // 2. 日付変更（datepicker）の変更イベントをキャッチするリスナーを追加
         listContainer.addEventListener('input', (e) => {
            const target = e.target;
            // 変更されたのが日付選択（move-date-picker）の場合のみ処理
            if (target.classList.contains('move-date-picker')) {
               const li = target.closest('.task-item');
               if (!li) return;
               const id = li.dataset.id;
               const chosenDate = target.value || null; // 選択された日付 (YYYY-MM-DD)
               handleMoveToday(id, chosenDate); 
            }
         });
         
         // 3. 編集フォームのSubmit
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
      let sourceList = null; // ドラッグを開始したリストを保持

      // 1. 固定のリスト（今日ToDo、今日Done）のイベント設定
      const staticTargets = [this.listTodo, this.listDone];
      staticTargets.forEach(targetList => {
         if (!targetList) return;
         this._setupDragEventsForList(targetList, () => draggedElement, (el) => draggedElement = el, handleSortUpdate);
      });

      // 2. 「今後のタスク」コンテナ全体のイベント設定（動的に生成されるリストに対応）
      if (this.containerBacklogTasks) {
         // dragstart: バックログ内のタスクがドラッグされたとき
         this.containerBacklogTasks.addEventListener('dragstart', (e) => {
            draggedElement = e.target.closest('.task-item');
            if (draggedElement) {
               draggedElement.classList.add('dragging');
               sourceList = draggedElement.closest('.task-list'); // どのグループからドラッグしたか記録
            }
         });

         // dragover: バックログ内のいずれかのリスト上でドラッグしているとき
         this.containerBacklogTasks.addEventListener('dragover', (e) => {
            e.preventDefault();
            const currentList = e.target.closest('.task-list');
            
            // 💡 安全策: 別のグループ（別の日付）への移動を防ぎ、同じグループ内だけの並び替えにする場合
            if (!currentList || currentList !== sourceList) return; 

            const afterElement = this._getDragAfterElement(currentList, e.clientY);
            if (afterElement == null) {
               currentList.appendChild(draggedElement);
            } else {
               currentList.insertBefore(draggedElement, afterElement);
            }
         });

         // dragend: ドラッグが終了したとき
         this.containerBacklogTasks.addEventListener('dragend', () => {
            if (draggedElement) {
               draggedElement.classList.remove('dragging');
               
               // ドラッグが終了したリスト内の最新の並び順を取得して保存
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

   // 💡 共通のイベントを設定するためのヘルパーメソッド（コードの重複を避けるため）
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
   
   // yyyy-mm-dd → mm/dd(曜日)
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
      // 1. モダンな Clipboard API が使える（かつセキュアコンテキストである）場合
      if (navigator.clipboard && window.isSecureContext) {
         try {
            await navigator.clipboard.writeText(text);
            console.log('Clipboard API でコピー成功');
            return true;
         } catch (err) {
            console.error('Clipboard API でのエラー:', err);
         }
      }
      
      // 2. フォールバック: 古いブラウザや非HTTPS環境の場合
      return this._fallbackCopyToClipboard(text);
   }
   
   _fallbackCopyToClipboard(text) {
      // 一時的な textarea 要素を作成
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 画面の外に配置してユーザーに見えないようにする
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      
      // テキストを選択状態にする
      textArea.focus();
      textArea.select();
      
      let success = false;
      try {
         // 選択されたテキストをクリップボードにコピー
         success = document.execCommand('copy');
         if (success) {
            console.log('フォールバック（execCommand）でコピー成功');
         } else {
            console.error('フォールバックでのコピーに失敗しました');
         }
      } catch (err) {
         console.error('フォールバック実行中にエラーが発生:', err);
      }
      
      // 不要になった要素を削除
      document.body.removeChild(textArea);
      return success;
   }
   
   bindPiPButton(getTodos) {
      if (!('documentPictureInPicture' in window)) {
         this.btnPiP.hidden = true;
         console.log("true");
         return;
      }
      this.btnPiP.addEventListener("click", async() => {
         const pipWindow  = await window.documentPictureInPicture.requestWindow();
         const pipContent = document.querySelector("#pip-content").content.cloneNode(true);
         pipWindow.document.body.append(pipContent);
         const tasks = getTodos();
         const title = (tasks.length > 0) ? tasks[0].title : "";
         pipWindow.document.querySelector("#pip-text").textContent = title;
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
