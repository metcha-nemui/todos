// view/modals/backup.js - 全データの JSON バックアップと復元 (モーダル)
import { getTodayDateString } from '../../lib/date.js';
import { bindModalClose } from './close.js';

export class BackupModal {
   constructor() {
      this.modal       = document.getElementById('backup-modal');
      this.btnClose    = document.getElementById('btn-backup-close');
      this.btnDownload = document.getElementById('btn-backup-download');
      this.btnRestore  = document.getElementById('btn-backup-restore');
      this.inputFile   = document.getElementById('input-backup-file');

      this.btnClose.addEventListener('click', () => this.close());
      bindModalClose(this.modal, () => this.close());

      this.btnRestore.addEventListener('click', () => this.inputFile.click());
   }

   open() {
      this.modal.hidden = false;
      this.btnClose.focus();
   }

   close() {
      this.modal.hidden = true;
   }

   // handler は書き出す内容 (オブジェクト) を返す。失敗時は null
   bindDownload(handler) {
      this.btnDownload.addEventListener('click', async () => {
         this._setBusy(true);
         const backup = await handler();
         this._setBusy(false);
         if (backup) this._download(backup);
      });
   }

   // handler は読み込んだファイルの内容 (オブジェクト) を受け取り、成功したら true を返す
   bindRestore(handler) {
      this.inputFile.addEventListener('change', async () => {
         const file = this.inputFile.files[0];
         this.inputFile.value = '';
         if (!file) return;

         let backup;
         try {
            backup = JSON.parse(await file.text());
         } catch (e) {
            alert('JSON として読み込めませんでした');
            return;
         }
         if (!confirm(`${file.name} から復元します。よろしいですか？`)) return;

         this._setBusy(true);
         const restored = await handler(backup);
         this._setBusy(false);
         if (restored) alert('復元しました');
      });
   }

   _setBusy(busy) {
      this.btnDownload.disabled = busy;
      this.btnRestore.disabled  = busy;
   }

   // 'todo-backup-YYYY-MM-DD.json' として保存させる
   _download(backup) {
      const json = JSON.stringify(backup, null, 2);
      const url  = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `todo-backup-${getTodayDateString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
   }
}
