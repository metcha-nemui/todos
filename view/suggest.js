// view/suggest.js - 入力欄のカスタムサジェスト

// targets: [{ input, list }]、getTemplates: 候補文字列の配列を返す関数
// onManage: 末尾の「候補を編集…」が選ばれたときに呼ぶ関数 (省略時は行を出さない)
export function setupCustomSuggest(targets, getTemplates, onManage) {
   targets.forEach(({ input, list }) => {
      if (!input || !list) return;

      input.addEventListener('input', () => {
         const val = input.value.trim().toLowerCase();
         const matches = getTemplates().filter(t => t.toLowerCase().includes(val));

         // 合う候補が無ければ出さない。未入力のときは「候補を編集…」だけでも出す
         if (matches.length === 0 && (val || !onManage)) {
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

         if (onManage) {
            const div = document.createElement('div');
            div.className = 'suggest-item suggest-manage';
            div.textContent = '候補を編集…';
            div.addEventListener('mousedown', (e) => {
               e.preventDefault();
               list.hidePopover();
               onManage();
            });
            list.appendChild(div);
         }
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
