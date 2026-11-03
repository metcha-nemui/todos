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

// area を指で横にはらったら、隣のタブを押したのと同じにする (左へはらうと右のタブ)。端のタブでは何もしない
// 入力欄 (カーソル移動・選択に使う) と浮き出す面 (カレンダー・メニュー) の上で始めた操作は対象にしない
const SWIPE_MIN_X = 60;  // これより短い横の動きは無視する (px)
const SWIPE_MAX_MS = 600;

export function bindTabSwipe(tablist, area) {
   let start = null;

   area.addEventListener('touchstart', (e) => {
      start = null;
      if (e.touches.length !== 1) return;
      if (e.target.closest('input, textarea, select, [contenteditable], [popover]')) return;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, time: Date.now() };
   }, { passive: true });

   area.addEventListener('touchend', (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const elapsed = Date.now() - start.time;
      start = null;
      // 縦のスクロールに近い動きは対象にしない
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) < Math.abs(dy) * 1.5 || elapsed > SWIPE_MAX_MS) return;

      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      const current = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      const next = tabs[current + (dx < 0 ? 1 : -1)];
      if (next) next.click();
   }, { passive: true });

   area.addEventListener('touchcancel', () => { start = null; }, { passive: true });
}
