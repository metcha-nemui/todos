// view/modals/edit.js - タスク名の編集画面
import { bindModalClose } from './close.js';

export class EditModal {
   constructor() {
      this.modal     = document.getElementById('edit-modal');
      this.btnClose  = document.getElementById('btn-edit-close');
      this.btnCancel = document.getElementById('btn-edit-cancel');
      this.form      = document.getElementById('form-edit');
      this.input     = document.getElementById('input-edit-title');

      // 編集対象のタスクの id
      this._id = null;

      this.btnClose.addEventListener('click', () => this.close());
      this.btnCancel.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());
   }

   // 今のタスク名を入れた状態で開き、末尾にカーソルを置く
   open({ id, title }) {
      this._id = id;
      this.input.value = title;

      this.modal.hidden = false;
      this.input.focus();
      this.input.setSelectionRange(title.length, title.length);
   }

   close() {
      this.modal.hidden = true;
   }

   // 保存で handler に (編集対象の id, 新しいタスク名) を渡す。空なら閉じない
   bindSubmit(handler) {
      this.form.addEventListener('submit', (e) => {
         e.preventDefault();
         const title = this.input.value.trim();
         if (!title) return;

         handler(this._id, title);
         this.close();
      });
   }
}
