// view/parts/toast.js - 画面上部に一時的に出す通知 (見た目は .toast、常に出す通知は panels/statusBanner.js)

// 表示しておく時間 (ミリ秒)
const DEFAULT_DURATION = 2000;

let toast = null;
let hideTimer = null;

// message を duration ミリ秒だけ出す。表示中に呼ぶと内容を差し替えて出し直す
export function showToast(message, duration = DEFAULT_DURATION) {
   if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.hidden = true;
      document.body.appendChild(toast);
   }

   toast.textContent = message;
   toast.hidden = false;

   clearTimeout(hideTimer);
   hideTimer = setTimeout(() => { toast.hidden = true; }, duration);
}
