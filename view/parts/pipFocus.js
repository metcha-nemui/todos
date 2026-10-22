// view/parts/pipFocus.js - Focus: PiP ウィンドウで今日のToDoを1つずつ、持ち時間つきで表示する
// 持ち時間が過ぎたら次のタスクへ強制的に進む (Split との違い)
// マークアップは index.html の <template id="pip-focus-content">、スタイルは pip.css
import { isPiPSupported, openPiPWindow } from './pip.js';

// 1タスクあたりの持ち時間 (分) の既定値。前回の値を端末に保存して次回の初期値にする
const DEFAULT_MINUTES = 10;
const STORAGE_KEY = 'todo_focus_minutes';

// getTodos は今日のToDo、onComplete(id) は「完了」を押したときに呼ぶ。
// 戻り値の関数に全タスクを渡すと、メイン画面での変更を開いている Focus に反映する
export function bindPiPFocusButton(button, getTodos, onComplete) {
   let sync = null;

   if (!isPiPSupported()) {
      button.hidden = true;
      return () => {};
   }
   button.addEventListener("click", async() => {
      const pipWindow = await openPiPWindow("pip-focus-content");
      const currentSync = setupFocus(pipWindow, getTodos(), onComplete);
      sync = currentSync;
      pipWindow.addEventListener("pagehide", () => {
         if (sync === currentSync) sync = null;
      });
   });
   return (allTodos) => sync?.(allTodos);
}

function setupFocus(pipWindow, todos, onComplete) {
   const pipDocument = pipWindow.document;
   const $ = (selector) => pipDocument.querySelector(selector);

   const setupForm    = $("#focus-setup");
   const inputMinutes = $("#focus-minutes");
   const selectList   = $("#focus-select");
   const emptyText    = $("#focus-empty");
   const btnStart     = $("#focus-start");
   const runView      = $("#focus-run");
   const progress     = $("#focus-progress");
   const taskTitle    = $("#focus-task");
   const timer        = $("#focus-timer");
   const bar          = $("#focus-bar");
   const btnSkip      = $("#focus-skip");
   const btnDone      = $("#focus-done");
   const endView      = $("#focus-end");

   // 開始画面: 対象にするタスクを選ぶ (既定は未選択)
   inputMinutes.value = localStorage.getItem(STORAGE_KEY) || DEFAULT_MINUTES;
   const renderSelectList = () => {
      const checkedIds = new Set(
         [...selectList.querySelectorAll("input:checked")].map(input => input.value)
      );
      selectList.replaceChildren();
      todos.forEach(todo => {
         const label = pipDocument.createElement("label");
         label.classList.add("task");
         const checkbox = pipDocument.createElement("input");
         checkbox.type = "checkbox";
         checkbox.value = todo.id;
         checkbox.checked = checkedIds.has(todo.id);
         const span = pipDocument.createElement("span");
         span.textContent = todo.title;
         label.append(checkbox, span);
         selectList.append(label);
      });
      emptyText.hidden = todos.length > 0;
      updateStartButton();
   };

   const updateStartButton = () => {
      btnStart.disabled = !selectList.querySelector("input:checked");
   };
   selectList.addEventListener("change", updateStartButton);
   renderSelectList();

   let queue = [];
   let currentIndex = -1;
   let duration = 0;
   let startTime = 0;
   let frameId = null;

   // 残り時間を表示し、尽きたら次へ。
   // 元タブが非表示でも動くよう、描画タイミングは PiP ウィンドウ側のものを使う
   const tick = () => {
      const remaining = Math.max(0, duration - (pipWindow.performance.now() - startTime));
      const totalSeconds = Math.ceil(remaining / 1000);
      const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const ss = String(totalSeconds % 60).padStart(2, '0');
      timer.textContent = `${mm}:${ss}`;
      bar.style.width = `${(remaining / duration) * 100}%`;

      if (remaining <= 0) {
         next();
         return;
      }
      frameId = pipWindow.requestAnimationFrame(tick);
   };

   const showCurrent = () => {
      progress.textContent = `${currentIndex + 1} / ${queue.length}`;
      taskTitle.textContent = queue[currentIndex].title;
   };

   // 次のタスクを表示し、持ち時間を最初から数え直す
   const next = () => {
      pipWindow.cancelAnimationFrame(frameId);
      currentIndex++;

      if (currentIndex >= queue.length) {
         runView.hidden = true;
         endView.hidden = false;
         return;
      }
      showCurrent();
      startTime = pipWindow.performance.now();
      tick();
   };

   setupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selectedIds = new Set(
         [...selectList.querySelectorAll("input:checked")].map(input => input.value)
      );
      queue = todos.filter(todo => selectedIds.has(todo.id));
      duration = Number(inputMinutes.value) * 60000;
      localStorage.setItem(STORAGE_KEY, inputMinutes.value);

      setupForm.hidden = true;
      runView.hidden = false;
      next();
   });

   btnSkip.addEventListener("click", () => next());

   btnDone.addEventListener("click", () => {
      onComplete(queue[currentIndex].id);
      next();
   });

   // メイン画面での変更を反映する。完了・削除・日付変更されたタスクは対象から外し、
   // 表示中のタスクなら次へ進む。名前の変更は表示に反映する。済んだタスクはそのまま
   return (allTodos) => {
      const pendingById = new Map(allTodos.filter(t => !t.is_done).map(t => [t.id, t]));
      const latest = (task) => {
         const todo = pendingById.get(task.id);
         return todo?.due_date === task.due_date ? todo : null;
      };

      if (currentIndex < 0) {
         todos = todos.map(latest).filter(Boolean);
         renderSelectList();
         return;
      }
      if (currentIndex >= queue.length) return;

      const current = queue[currentIndex];
      const currentLatest = latest(current);
      const rest = queue.slice(currentIndex + 1).map(latest).filter(Boolean);
      // 表示中のタスクが外れたときも枠は残し、next() でその次へ進む
      queue = [...queue.slice(0, currentIndex), currentLatest ?? current, ...rest];
      if (currentLatest) {
         showCurrent();
      } else {
         next();
      }
   };
}
