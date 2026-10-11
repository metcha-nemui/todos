// view/clipboard.js - クリップボードへのコピー

export async function copyToClipboard(text) {
   if (navigator.clipboard && window.isSecureContext) {
      try {
         await navigator.clipboard.writeText(text);
         console.log('Clipboard API でコピー成功');
         return true;
      } catch (err) {
         console.error('Clipboard API でのエラー:', err);
      }
   }
   return fallbackCopyToClipboard(text);
}

function fallbackCopyToClipboard(text) {
   const textArea = document.createElement('textarea');
   textArea.value = text;
   textArea.style.position = 'fixed';
   textArea.style.top = '-9999px';
   textArea.style.left = '-9999px';
   document.body.appendChild(textArea);

   textArea.focus();
   textArea.select();

   let success = false;
   try {
      success = document.execCommand('copy');
   } catch (err) {
      console.error('フォールバック実行中にエラーが発生:', err);
   }

   document.body.removeChild(textArea);
   return success;
}
