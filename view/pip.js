// view/pip.js - Picture-in-Picture ウィンドウでのToDo表示

export function bindPiPButton(button, getTodos) {
   if (!('documentPictureInPicture' in window)) {
      button.hidden = true;
      return;
   }
   button.addEventListener("click", async() => {
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
