// view/modals/close.js - モーダル (.modal) 共通の閉じる操作

// 背景クリックと Escape で close を呼ぶ
export function bindModalClose(modal, close) {
   // 入力欄からのドラッグが背景で終わった場合は閉じない
   let pressedOnBackdrop = false;
   modal.addEventListener('mousedown', (e) => {
      pressedOnBackdrop = e.target === modal;
   });
   modal.addEventListener('click', (e) => {
      if (pressedOnBackdrop && e.target === modal) close();
   });

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
   });
}
