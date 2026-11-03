// view/parts/tabs.js - タブの切り替え (role="tab" のボタンと、aria-controls で指す中身)

// tablist 内のタブを押したら、そのタブを選んだ状態にし、対応する中身だけを出す。最初に選ぶタブは HTML 側で決める
export function bindTabs(tablist) {
   const tabs = [...tablist.querySelectorAll('[role="tab"]')];
   tabs.forEach(tab => {
      tab.addEventListener('click', () => {
         tabs.forEach(t => {
            const isSelected = t === tab;
            t.setAttribute('aria-selected', String(isSelected));
            document.getElementById(t.getAttribute('aria-controls')).hidden = !isSelected;
         });
      });
   });
}
