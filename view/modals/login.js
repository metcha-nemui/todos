// view/modals/login.js - ログイン画面 (Supabase Auth のメールアドレスとパスワード)
import { bindModalClose } from './close.js';

export class LoginModal {
   constructor() {
      this.modal         = document.getElementById('login-modal');
      this.btnClose      = document.getElementById('btn-login-close');
      this.form          = document.getElementById('form-login');
      this.inputEmail    = document.getElementById('input-login-email');
      this.inputPassword = document.getElementById('input-login-password');
      this.errorText     = document.getElementById('login-error');
      this.btnSubmit     = document.getElementById('btn-login-submit');

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());
   }

   open() {
      this.errorText.hidden = true;
      this.modal.hidden = false;
      (this.inputEmail.value ? this.inputPassword : this.inputEmail).focus();
   }

   // パスワードは画面に残さない
   close() {
      this.modal.hidden = true;
      this.inputPassword.value = '';
   }

   // handler(email, password) は成功したら null、失敗したらメッセージを返す
   bindSubmit(handler) {
      this.form.addEventListener('submit', async (e) => {
         e.preventDefault();
         this.btnSubmit.disabled = true;
         const message = await handler(this.inputEmail.value.trim(), this.inputPassword.value);
         this.btnSubmit.disabled = false;

         if (!message) return this.close();
         this.errorText.textContent = message;
         this.errorText.hidden = false;
      });
   }
}
