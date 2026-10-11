// view/suggest.js - 入力欄のカスタムサジェスト

// targets: [{ input, list }]、getTemplates: 候補文字列の配列を返す関数
export function setupCustomSuggest(targets, getTemplates) {
   targets.forEach(({ input, list }) => {
      if (!input || !list) return;

      input.addEventListener('input', () => {
         const val = input.value.trim().toLowerCase();
         const templates = getTemplates();
         if (templates.length === 0) {
            list.hidePopover();
            return;
         }

         const matches = templates.filter(t => t.toLowerCase().includes(val));
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
