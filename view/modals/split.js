// view/modals/split.js - タスクの分割画面 (1行が分割後の1タスク)
import { escapeHtml } from '../util/html.js';
import { bindModalClose } from './close.js';

export class SplitModal {
   constructor() {
      this.modal     = document.getElementById('split-modal');
      this.btnClose  = document.getElementById('btn-split-close');
      this.btnCancel = document.getElementById('btn-split-cancel');
      this.btnAddRow = document.getElementById('btn-split-add-row');
      this.source    = document.getElementById('split-source');
      this.form      = document.getElementById('form-split');
      this.list      = document.getElementById('list-split');

      // 分割対象のタスクの id
      this._id = null;

      this.btnClose.addEventListener('click', () => this.close());
      this.btnCancel.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());

      this.btnAddRow.addEventListener('click', () => this._addRow().focus());

      // 行の削除 (最後の1行は消さずに空にする)
      this.list.addEventListener('click', (e) => {
         if (!e.target.closest('.remove-row-btn')) return;
         const li = e.target.closest('.split-row');
         if (this.list.children.length > 1) li.remove();
         else li.querySelector('.split-input').value = '';
      });

      // Enter は確定ではなく次の行へ進む (最後の行なら行を足す)。変換の確定は除く
      this.list.addEventListener('keydown', (e) => {
         if (e.key !== 'Enter' || e.isComposing) return;
         if (!e.target.classList.contains('split-input')) return;
         e.preventDefault();

         const next = e.target.closest('.split-row').nextElementSibling;
         (next ? next.querySelector('.split-input') : this._addRow()).focus();
      });
   }

   // 元のタスク名は見出しの下に表示するだけにし、入力は空の2行から始める
   open({ id, title }) {
      this._id = id;
      this.source.textContent = `元のタスク: ${title}`;
      this.list.innerHTML = '';
      const first = this._addRow();
      this._addRow();

      this.modal.hidden = false;
      first.focus();
   }

   close() {
      this.modal.hidden = true;
   }

   // 行を末尾に足し、その入力欄を返す
   _addRow(value = '') {
      const li = document.createElement('li');
      li.className = 'split-row';
      li.innerHTML = `
         <input type="text" class="split-input" value="${escapeHtml(value)}" placeholder="分割後のタスクを入力..." autocomplete="off">
         <button type="button" class="remove-row-btn secondary" title="行を削除" aria-label="行を削除"><i data-lucide="x"></i></button>
      `;
      this.list.appendChild(li);

      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
      return li.querySelector('.split-input');
   }

   // OK で handler に (分割対象の id, 分割後のタスク名の配列) を渡す。空の行は除く
   bindSubmit(handler) {
      this.form.addEventListener('submit', (e) => {
         e.preventDefault();
         const titles = [...this.list.querySelectorAll('.split-input')]
            .map(input => input.value.trim())
            .filter(title => title);
         if (titles.length === 0) return;

         handler(this._id, titles);
         this.close();
      });
   }
}
