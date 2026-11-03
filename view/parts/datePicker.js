// view/parts/datePicker.js - 日付を選ぶカレンダー
// 端末の日付入力 (<input type="date">) は端末ごとに動きが違う (月を移しただけで確定する、日付を消せない) ので使わない
import { getTodayDateString, getMonthStartString, shiftDateString, getWeekdayIndex, formatDateWithWeekday } from '../../lib/date.js';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
// 起点の要素との間隔と、画面の端との間隔 (px)
const ANCHOR_GAP = 4;
const VIEWPORT_MARGIN = 8;
// 矢印キーで動かす日数
const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const CHEVRON = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

// カレンダーは1つを使い回す (要素は自分で作るので HTML 側の用意はいらない)
let popover = null;
// 開いている間の状態 { anchor, anchorRect, value, allowEmpty, month, onSelect, onClose }
let current = null;
// 起点を押して閉じたとき、続く click で開き直さないための記録 { anchor, at }
let lastClosed = null;
const REOPEN_GUARD_MS = 300;

function ensurePopover() {
   if (popover) return popover;
   popover = document.createElement('div');
   popover.className = 'date-picker-popover';
   popover.setAttribute('popover', 'auto');
   popover.setAttribute('role', 'dialog');
   popover.setAttribute('aria-label', '日付を選ぶ');
   popover.addEventListener('click', onClick);
   popover.addEventListener('keydown', onKeydown);
   // beforetoggle は閉じる操作の中で同期的に来るので、続けて開き直しても状態が混ざらない
   popover.addEventListener('beforetoggle', (e) => {
      if (e.newState !== 'closed' || !current) return;
      const { anchor, onClose } = current;
      current = null;
      lastClosed = { anchor, at: performance.now() };
      onClose?.();
   });
   document.body.appendChild(popover);

   window.addEventListener('resize', position);
   window.addEventListener('scroll', position, { passive: true, capture: true });
   return popover;
}

// anchor の下 (入らなければ上) にカレンダーを開く。選ぶまで確定しない (月の移動では何も起きない)
// value: 選択中の日付 (null は日付なし)、allowEmpty: 「日付なし」を選べるか
// onSelect(date) は別の日付を選んだときに呼ぶ (日付なしは null)。onOpen(popover) / onClose() は開閉時に呼ぶ
export function openDatePicker(anchor, { value = null, allowEmpty = false, onSelect, onOpen, onClose }) {
   ensurePopover();
   // 開いているときに起点を押すと、押した時点で閉じている (外側のクリック扱い)。開き直さずに終える
   if (lastClosed?.anchor === anchor && performance.now() - lastClosed.at < REOPEN_GUARD_MS) return;
   if (current) popover.hidePopover();

   current = {
      anchor,
      anchorRect: anchor.getBoundingClientRect(),
      value,
      allowEmpty,
      month: getMonthStartString(value || getTodayDateString()),
      onSelect,
      onClose,
   };
   render();
   popover.showPopover();
   position();
   focusDay(value || getTodayDateString());
   onOpen?.(popover);
}

function render() {
   const { month, value, allowEmpty } = current;
   const [yyyy, mm] = month.split('-').map(Number);
   const today = getTodayDateString();

   // 月の行数によらず高さを揃えるため、常に6週分出す
   const start = shiftDateString(month, -getWeekdayIndex(month));
   const days = Array.from({ length: 42 }, (_, i) => {
      const date = shiftDateString(start, i);
      const classes = ['date-picker-day'];
      if (getMonthStartString(date) !== month) classes.push('is-outside');
      if (date === value) classes.push('is-selected');
      if (date === today) classes.push('is-today');
      if (i % 7 === 0) classes.push('is-sunday');
      if (i % 7 === 6) classes.push('is-saturday');
      return `<button type="button" class="${classes.join(' ')}" data-date="${date}" tabindex="-1"
                 aria-label="${formatDateWithWeekday(date)}" ${date === value ? 'aria-pressed="true"' : ''}>${Number(date.slice(8))}</button>`;
   }).join('');

   popover.innerHTML = `
      <div class="date-picker-header">
         <button type="button" class="secondary" data-month="-1" title="前の月" aria-label="前の月">${CHEVRON('m15 18-6-6 6-6')}</button>
         <span class="date-picker-title" aria-live="polite">${yyyy}年${mm}月</span>
         <button type="button" class="secondary" data-month="1" title="次の月" aria-label="次の月">${CHEVRON('m9 18 6-6-6-6')}</button>
      </div>
      <div class="date-picker-weekdays" aria-hidden="true">${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="date-picker-grid">${days}</div>
      <div class="date-picker-footer">
         <button type="button" class="secondary" data-date="${today}">今日</button>
         ${allowEmpty ? `<button type="button" class="secondary" data-date="">日付なし</button>` : ''}
      </div>
   `;
}

// 起点の要素に合わせて置き直す (起点が隠れた・消えたときは開いたときの位置を使う)
function position() {
   if (!current) return;
   const live = current.anchor.isConnected ? current.anchor.getBoundingClientRect() : null;
   if (live && live.width > 0) current.anchorRect = live;
   const rect = current.anchorRect;
   const { width, height } = popover.getBoundingClientRect();

   const below = rect.bottom + ANCHOR_GAP;
   const above = rect.top - ANCHOR_GAP - height;
   const fitsBelow = below + height + VIEWPORT_MARGIN <= window.innerHeight;
   const top = fitsBelow || above < VIEWPORT_MARGIN ? below : above;

   popover.style.top  = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - height - VIEWPORT_MARGIN)) + 'px';
   popover.style.left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)) + 'px';
}

// date の日のボタンへフォーカスを移す (表示中の月になければその月へ移る)
function focusDay(date) {
   let btn = popover.querySelector(`.date-picker-grid [data-date="${date}"]`);
   if (!btn) {
      current.month = getMonthStartString(date);
      render();
      btn = popover.querySelector(`.date-picker-grid [data-date="${date}"]`);
   }
   popover.querySelectorAll('.date-picker-day').forEach(b => { b.tabIndex = b === btn ? 0 : -1; });
   btn.focus({ preventScroll: true });
}

function moveMonth(months) {
   current.month = getMonthStartString(current.month, months);
   render();
   position();
}

function select(date) {
   const { anchor, value, onSelect } = current;
   popover.hidePopover();
   if (anchor.isConnected) anchor.focus({ preventScroll: true });
   if (date !== value) onSelect(date);
}

function onClick(e) {
   const btn = e.target.closest('button');
   if (!btn || !current) return;
   if (btn.dataset.month) moveMonth(Number(btn.dataset.month));
   else if ('date' in btn.dataset) select(btn.dataset.date || null);
}

function onKeydown(e) {
   if (!current) return;
   // 閉じるのは popover に任せ、外側 (モーダルやウィンドウ) の Escape 処理には渡さない
   if (e.key === 'Escape') {
      e.stopPropagation();
      if (current.anchor.isConnected) current.anchor.focus({ preventScroll: true });
      return;
   }

   const day = e.target.closest('.date-picker-day');
   if (!day) return;
   if (KEY_STEPS[e.key]) {
      e.preventDefault();
      focusDay(shiftDateString(day.dataset.date, KEY_STEPS[e.key]));
   } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      moveMonth(e.key === 'PageUp' ? -1 : 1);
      focusDay(current.month);
   }
}

// 年が今年と違うときだけ年を付ける
const formatLabel = (date) => {
   if (!date) return '日付なし';
   const year = date.slice(0, 4);
   return (year === getTodayDateString().slice(0, 4) ? '' : `${year}/`) + formatDateWithWeekday(date);
};

// 日付入力欄の代わりのボタン。押すとカレンダーを開き、選んだ日付をボタンの文字に出す
// options: { allowEmpty (「日付なし」を選べるか), onChange(value) (選び直したとき), onOpen, onClose }
export class DateField {
   constructor(button, { allowEmpty = false, onChange, onOpen, onClose } = {}) {
      this.button = button;
      this.allowEmpty = allowEmpty;
      this.value = '';

      button.addEventListener('click', () => {
         openDatePicker(button, {
            value: this.value || null,
            allowEmpty: this.allowEmpty,
            onSelect: (date) => {
               this.value = date;
               onChange?.(this.value);
            },
            onOpen,
            onClose,
         });
      });
   }

   // 'YYYY-MM-DD'。日付なしは空文字
   get value() {
      return this._value;
   }

   set value(date) {
      this._value = date || '';
      this.button.textContent = formatLabel(this._value);
   }
}
