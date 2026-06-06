// view.js - UI Representation Layer
export class TodoView {
    constructor() {
        // ヘッダー・共通
        this.currentDateText = document.getElementById('current-date-text');
        this.btnNextDay = document.getElementById('btn-next-day');
        this.datePicker = document.getElementById('date-picker');
        this.tabs = document.querySelectorAll('.tab-btn');
        this.sections = document.querySelectorAll('.view-section');

        // 今日ビュー
        this.formAddTodo = document.getElementById('form-add-todo');
        this.inputTodoTitle = document.getElementById('input-todo-title');
        this.listTodo = document.getElementById('list-todo');
        this.listDone = document.getElementById('list-done');
        this.btnCopyTodo = document.getElementById('btn-copy-todo');
        this.btnCopyDone = document.getElementById('btn-copy-done');

        // バックログビュー
        this.formBacklogAdd = document.getElementById('form-backlog-add');
        this.inputBacklogTitle = document.getElementById('input-backlog-title');
        this.inputBacklogDate = document.getElementById('input-backlog-date');
        this.listNoDate = document.getElementById('list-no-date');
        this.containerFutureTasks = document.getElementById('container-future-tasks');

        // アーカイブビュー
        this.containerArchive = document.getElementById('container-archive');

        this._initTabs();
    }

    _initTabs() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.tabs.forEach(t => t.classList.remove('active'));
                this.sections.forEach(s => s.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });
    }

    render(model) {
        // 日付反映
        this.currentDateText.textContent = model.currentDate;
        this.datePicker.value = model.currentDate;

        // 今日のToDo描画
        this._renderTaskList(this.listTodo, model.getTodayTodos(), false);
        // 今日のDone描画
        this._renderTaskList(this.listDone, model.getTodayDones(), true);

        // バックログ描画
        this._renderTaskList(this.listNoDate, model.getNoDateTodos(), false, true);
        this._renderFutureTasks(model.getFutureTodosGrouped());

        // アーカイブ描画
        this._renderArchive(model.getArchiveGrouped());
    }

    _renderTaskList(element, tasks, isDone, showMoveToToday = false) {
        element.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.dataset.id = task.id;
            if (!isDone) li.setAttribute('draggable', 'true');

            li.innerHTML = `
                <div class="task-item-content ${isDone ? 'done' : ''}">
                    <input type="checkbox" ${isDone ? 'checked' : ''} class="toggle-check">
                    <span>${this._escapeHtml(task.title)}</span>
                </div>
                <div class="task-actions">
                    ${showMoveToToday ? '<button class="move-today-btn">今日やる</button>' : ''}
                    <button class="edit-btn secondary">編集</button>
                    <button class="delete-btn danger">削除</button>
                </div>
            `;
            element.appendChild(li);
        });
    }

    _renderFutureTasks(groupedTasks) {
        this.containerFutureTasks.innerHTML = '';
        if (Object.keys(groupedTasks).length === 0) {
            this.containerFutureTasks.innerHTML = '<p style="color: var(--text-muted);">予定されている将来のタスクはありません</p>';
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
            this.containerFutureTasks.appendChild(div);
        }
    }

    _renderArchive(groupedArchive) {
        this.containerArchive.innerHTML = '';
        if (Object.keys(groupedArchive).length === 0) {
            this.containerArchive.innerHTML = '<p style="color: var(--text-muted);">過去の完了タスクはありません</p>';
            return;
        }

        for (const [date, tasks] of Object.entries(groupedArchive)) {
            const div = document.createElement('div');
            div.className = 'archive-day';
            div.innerHTML = `<div class="archive-date">${date}</div>`;
            
            const ul = document.createElement('ul');
            ul.className = 'task-list';
            this._renderTaskList(ul, tasks, true, false);
            
            div.appendChild(ul);
            this.containerArchive.appendChild(div);
        }
    }

    // イベントバインド群
    bindAdvanceDay(handler) {
        this.btnNextDay.addEventListener('click', handler);
    }

    bindDatePicker(handler) {
        this.datePicker.addEventListener('change', (e) => handler(e.target.value));
    }

    bindAddTodo(handler) {
        this.formAddTodo.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.inputTodoTitle.value.trim()) {
                handler(this.inputTodoTitle.value.trim());
                this.inputTodoTitle.value = '';
            }
        });
    }

    bindAddBacklog(handler) {
        this.formBacklogAdd.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = this.inputBacklogTitle.value.trim();
            const date = this.inputBacklogDate.value || null;
            if (title) {
                handler(title, date);
                this.inputBacklogTitle.value = '';
                this.inputBacklogDate.value = '';
            }
        });
    }

    bindTaskActions(handleToggle, handleDelete, handleEdit, handleMoveToday) {
        const lists = [this.listTodo, this.listDone, this.listNoDate, this.containerFutureTasks, this.containerArchive];
        
        lists.forEach(listContainer => {
            if (!listContainer) return;
            listContainer.addEventListener('click', (e) => {
                const target = e.target;
                const li = target.closest('.task-item');
                if (!li) return;
                const id = li.dataset.id;

                if (target.classList.contains('toggle-check')) {
                    handleToggle(id);
                } else if (target.classList.contains('delete-btn')) {
                    if (confirm('このタスクを物理削除しますか？（復元できません）')) {
                        handleDelete(id);
                    } else {
                        // チェック状態などが戻らないようキャンセル時はリバインドか再描画が必要
                        e.preventDefault();
                    }
                } else if (target.classList.contains('edit-btn')) {
                    const currentTitle = li.querySelector('span').textContent;
                    const newTitle = prompt('タスク名を編集してください:', currentTitle);
                    if (newTitle && newTitle.trim()) {
                        handleEdit(id, newTitle.trim());
                    }
                } else if (target.classList.contains('move-today-btn')) {
                    handleMoveToday(id);
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
            navigator.clipboard.writeText(md).then(() => alert('ToDoリスト（Markdown）をコピーしました！'));
        });

        this.btnCopyDone.addEventListener('click', () => {
            const md = getDones().map(t => `- [x] ${t.title}`).join('\n');
            navigator.clipboard.writeText(md).then(() => alert('Doneリスト（Markdown）をコピーしました！'));
        });
    }

    _escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
