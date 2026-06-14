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
      this.inputTodoDate  = document.getElementById('input-todo-date');
      this.listTodo = document.getElementById('list-todo');
      this.listDone = document.getElementById('list-done');
      this.btnCopyTodo = document.getElementById('btn-copy-todo');
      this.btnCopyDone = document.getElementById('btn-copy-done');
      
      // バックログビュー
      this.containerBacklogTasks = document.getElementById('container-backlog-tasks');
      
      this.isInitTodoDate = true;
   }
   
   render(data) {
      // 日付反映
      this.currentDateText.textContent = data.currentDate;
      this.datePicker.value = data.currentDate;
      if(this.isInitTodoDate && data.currentDate)
      {  this.inputTodoDate.value = data.currentDate;
         this.isInitTodoDate = false;
      }
      
      // 今日のToDo描画
      this._renderTaskList(this.listTodo, data.todayTodos, false, true);
      // 今日のDone描画
      this._renderTaskList(this.listDone, data.todayDones, true);
      // バックログ描画
      this._renderBacklogTasks(data.backlogTodos);
      
      // 動的生成された要素のLucideアイコンを有効化
      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }
   
   setInitialDate(date) {
      this.inputTodoDate.value = date;
   }
   
   _renderTaskList(element, tasks, isDone, showDateChanger = false) {
      element.innerHTML = '';
      tasks.forEach(task => {
         const li = document.createElement('li');
         li.className = 'task-item';
         li.dataset.id = task.id;
         if (!isDone) li.setAttribute('draggable', 'true');
         
         li.innerHTML = `
            <div class="task-view-mode" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
               <div class="task-item-content ${isDone ? 'done' : ''}">
                  <input type="checkbox" ${isDone ? 'checked' : ''} class="toggle-check">
                  <span class="task-title-text">${this._escapeHtml(task.title)}</span>
               </div>
               <div class="task-actions" style="display: flex; align-items: center; gap: 5px;">
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
      
      for (const [date, tasks] of Object.entries(groupedTasks)) {
         const div = document.createElement('div');
         div.className = 'backlog-group';
         div.innerHTML = `<div class="backlog-title">${date}</div>`;
         
         const ul = document.createElement('ul');
         ul.className = 'task-list';
         this._renderTaskList(ul, tasks, false, true);
         
         div.appendChild(ul);
         this.containerBacklogTasks.appendChild(div);
      }
   }
    
   bindDatePicker(handler) {
      this.datePicker.addEventListener('change', (e) => handler(e.target.value));
   }
   
   bindAddTodo(handler) {
      this.formAddTodo.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.inputTodoTitle.value.trim();
         const date  = this.inputTodoDate.value || null;
         if(title) {
            handler(title, date);
            this.inputTodoTitle.value = '';
         }
      });
   }
   
   bindTaskActions(handleToggle, handleDelete, handleEdit, handleMoveToday) {
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
                  const ret = confirm('このタスクを物理削除しますか？（復元できません）');
                  if(ret) handleDelete(id);
                  else    e.preventDefault();
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
               // 「move-today-btn」は削除したためここからは除外
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
      
      // ToDoリストコンテナにリスナーを設定
      this.listTodo.addEventListener('dragstart', (e) => {
         draggedElement = e.target.closest('.task-item');
         if (draggedElement) {
            draggedElement.classList.add('dragging');
         }
      });
      
      this.listTodo.addEventListener('dragend', () => {
         if (draggedElement) {
            draggedElement.classList.remove('dragging');
            draggedElement = null;
            
            // 現在のDOM順序からすべてのIDを抽出してソート順の更新を依頼
            const orderedIds = [...this.listTodo.querySelectorAll('.task-item')].map(li => li.dataset.id);
            handleSortUpdate(orderedIds);
         }
      });
      
      this.listTodo.addEventListener('dragover', (e) => {
         e.preventDefault();
         const afterElement = this._getDragAfterElement(this.listTodo, e.clientY);
         if (afterElement == null) {
            this.listTodo.appendChild(draggedElement);
         } else {
            this.listTodo.insertBefore(draggedElement, afterElement);
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
         const md = getTodos().map(t => `- [ ] ${t.title}`).join('\n');
         this._copyToClipboard(md).then(() => alert("クリップボードにコピーしました"));
      });
      
      this.btnCopyDone.addEventListener('click', () => {
         const md = getDones().map(t => `- [x] ${t.title}`).join('\n');
         this._copyToClipboard(md).then(() => alert("クリップボードにコピーしました"));
      });
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
   
   _escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
   }
}
