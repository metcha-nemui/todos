// view/templateModal.js - サジェスト候補 (テンプレート) の登録画面
import { escapeHtml } from './html.js';
import { bindModalClose } from './modal.js';

export class TemplateModal {
   constructor() {
      this.modal     = document.getElementById('template-modal');
      this.btnClose  = document.getElementById('btn-template-close');
      this.formAdd   = document.getElementById('form-add-template');
      this.inputName = document.getElementById('input-template-name');
      this.list      = document.getElementById('list-template');
      this.emptyText = document.getElementById('template-empty');

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());

      // 行内の編集開始・キャンセル
      this.list.addEventListener('click', (e) => {
         const li = e.target.closest('.template-item');
         if (!li) return;
         const editInput = li.querySelector('.edit-input');

         if (e.target.closest('.edit-btn')) {
            li.classList.add('is-editing');
            editInput.focus();
            editInput.setSelectionRange(editInput.value.length, editInput.value.length);
         } else if (e.target.closest('.cancel-btn')) {
            editInput.value = li.dataset.name;
            li.classList.remove('is-editing');
         }
      });
   }

   open() {
      this.modal.hidden = false;
      this.inputName.focus();
   }

   close() {
      this.modal.hidden = true;
   }

   // templates: 候補文字列の配列 (表示順に並んでいること)
   render(templates) {
      // 追加に成功した入力は消す
      if (templates.includes(this.inputName.value.trim())) this.inputName.value = '';

      this.emptyText.hidden = templates.length > 0;
      this.list.innerHTML = '';
      templates.forEach(name => {
         const li = document.createElement('li');
         li.className = 'template-item';
         li.dataset.name = name;

         li.innerHTML = `
            <div class="template-view-mode">
               <span class="template-name-text">${escapeHtml(name)}</span>
               <div class="template-actions">
                  <button type="button" class="edit-btn secondary" title="編集" aria-label="編集"><i data-lucide="pencil"></i></button>
                  <button type="button" class="delete-btn danger" title="削除" aria-label="削除"><i data-lucide="trash-2"></i></button>
               </div>
            </div>

            <form class="template-edit-mode">
               <input type="text" class="edit-input" value="${escapeHtml(name)}" required>
               <button type="submit" class="save-btn">保存</button>
               <button type="button" class="cancel-btn secondary">キャンセル</button>
            </form>
         `;
         this.list.appendChild(li);
      });

      if (typeof lucide !== 'undefined') {
         lucide.createIcons();
      }
   }

   bindAdd(handler) {
      this.formAdd.addEventListener('submit', (e) => {
         e.preventDefault();
         const name = this.inputName.value.trim();
         if (name) handler(name);
      });
   }

   bindRename(handler) {
      this.list.addEventListener('submit', (e) => {
         e.preventDefault();
         const li = e.target.closest('.template-item');
         if (!li) return;

         const newName = li.querySelector('.edit-input').value.trim();
         if (newName) handler(li.dataset.name, newName);
      });
   }

   bindDelete(handler) {
      this.list.addEventListener('click', (e) => {
         if (!e.target.closest('.delete-btn')) return;
         const li = e.target.closest('.template-item');
         if (!li) return;

         if (confirm(`「${li.dataset.name}」を候補から削除しますか？`)) handler(li.dataset.name);
      });
   }
}
