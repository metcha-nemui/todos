// view/parts/pipFocus.js - Focus: PiP ウィンドウで今日のToDoを1つずつ、持ち時間つきで表示する
// 持ち時間が過ぎたら次のタスクへ強制的に進む (Split との違い)
// マークアップは index.html の <template id="pip-focus-content">、スタイルは pip.css
import { isPiPSupported, openPiPWindow } from './pip.js';

// 1タスクあたりの持ち時間 (分) の既定値
const DEFAULT_MINUTES = 10;

// getTodos は今日のToDo、onComplete(id) は「完了」を押したときに呼ぶ
export function bindPiPFocusButton(button, getTodos, onComplete) {
   if (!isPiPSupported()) {
      button.hidden = true;
      return;
   }
   button.addEventListener("click", async() => {
      const pipWindow = await openPiPWindow("pip-focus-content");
      setupFocus(pipWindow, getTodos(), onComplete);
   });
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

   // 開始画面: 対象にするタスクを選ぶ (既定はすべて)
   inputMinutes.value = DEFAULT_MINUTES;
   todos.forEach(todo => {
      const label = pipDocument.createElement("label");
      label.classList.add("task");
      const checkbox = pipDocument.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = todo.id;
      checkbox.checked = true;
      const span = pipDocument.createElement("span");
      span.textContent = todo.title;
      label.append(checkbox, span);
      selectList.append(label);
   });
   emptyText.hidden = todos.length > 0;

   const updateStartButton = () => {
      btnStart.disabled = !selectList.querySelector("input:checked");
   };
   selectList.addEventListener("change", updateStartButton);
   updateStartButton();

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

   // 次のタスクを表示し、持ち時間を最初から数え直す
   const next = () => {
      pipWindow.cancelAnimationFrame(frameId);
      currentIndex++;

      if (currentIndex >= queue.length) {
         runView.hidden = true;
         endView.hidden = false;
         return;
      }
      progress.textContent = `${currentIndex + 1} / ${queue.length}`;
      taskTitle.textContent = queue[currentIndex].title;
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

      setupForm.hidden = true;
      runView.hidden = false;
      next();
   });

   btnSkip.addEventListener("click", () => next());

   btnDone.addEventListener("click", () => {
      onComplete(queue[currentIndex].id);
      next();
   });
}
