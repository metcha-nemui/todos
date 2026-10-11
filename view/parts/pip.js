// view/parts/pip.js - Picture-in-Picture ウィンドウでのToDo表示とタイマー
// マークアップは index.html の <template id="pip-content">、スタイルは pip.css

const PIP_CSS_URL = new URL('../../pip.css', import.meta.url).href;

const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

export function bindPiPButton(button, getTodos) {
   if (!('documentPictureInPicture' in window)) {
      button.hidden = true;
      return;
   }
   button.addEventListener("click", async() => {
      const pipWindow = await window.documentPictureInPicture.requestWindow();
      const pipDocument = pipWindow.document;

      await loadStyleSheet(pipDocument, PIP_CSS_URL);

      const pipContent = document.querySelector("#pip-content").content.cloneNode(true);
      pipDocument.body.append(pipContent);

      const wrapper = pipDocument.querySelector("#wrapper");
      getTodos().forEach(task => {
         const div = pipDocument.createElement("div");
         div.classList.add("task");
         div.textContent = task.title;
         div.insertAdjacentHTML("beforeend", `<span class="delete">${DELETE_ICON}</span>`);
         wrapper.append(div);
      });

      setupTimer(pipWindow);
   });
}

// 読み込み完了 (または失敗) まで待つ。スタイル無しの状態を見せないため
function loadStyleSheet(targetDocument, href) {
   return new Promise(resolve => {
      const link = targetDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      targetDocument.head.append(link);
   });
}

// クリックのたびに次のタスクへ進み、開始からの経過時間を表示する。
// 元タブが非表示でも動くよう、描画タイミングは PiP ウィンドウ側のものを使う
function setupTimer(pipWindow) {
   const pipDocument = pipWindow.document;
   const wrapper = pipDocument.querySelector("#wrapper");
   const timer   = pipDocument.querySelector("#timer");

   let currentIndex = -1;
   let startTime = 0;
   let isRunning = false;
   let frameId = null;

   const updateTimer = () => {
      if (!isRunning) return;

      const elapsedTime = pipWindow.performance.now() - startTime;

      const minutes = Math.floor(elapsedTime / 60000);
      const seconds = Math.floor((elapsedTime % 60000) / 1000);
      const centiseconds = Math.floor((elapsedTime % 1000) / 10);

      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      const cc = String(centiseconds).padStart(2, '0');

      timer.innerHTML = `${mm}:${ss}.<span class="sec">${cc}</span>`;

      frameId = pipWindow.requestAnimationFrame(updateTimer);
   };

   const startTimer = () => {
      if (isRunning) return;
      isRunning = true;
      startTime = pipWindow.performance.now();
      frameId = pipWindow.requestAnimationFrame(updateTimer);
   };

   const stopTimer = () => {
      isRunning = false;
      pipWindow.cancelAnimationFrame(frameId);
   };

   const onClick = (e) => {
      if(e.target.closest(".delete")) {
         e.target.closest(".task").remove();
         return;
      }

      const tasks = pipDocument.querySelectorAll(".task");

      // 終えたタスクに、その時点の経過時間 (分:秒) を残す
      if(currentIndex >= 0) {
         const task = tasks[currentIndex];
         task.classList.remove("is-active");
         const div = pipDocument.createElement("div");
         div.textContent = timer.textContent.split(".")[0];
         task.append(div);
      }
      currentIndex++;

      if(currentIndex < tasks.length) {
         tasks[currentIndex].classList.add("is-active");
         timer.classList.add("is-active");
         wrapper.classList.add("is-running");
         startTimer();
      } else {
         stopTimer();
         timer.classList.remove("is-active");
         timer.classList.add("is-end");
         wrapper.classList.remove("is-running");
         pipDocument.removeEventListener("click", onClick);
      }
   };

   pipDocument.addEventListener("click", onClick);
}
