// view/parts/pip.js - Document Picture-in-Picture ウィンドウを開く共通処理 (Split / Focus が使う)
// スタイルは pip.css

const PIP_CSS_URL = new URL('../../pip.css', import.meta.url).href;

export function isPiPSupported() {
   return 'documentPictureInPicture' in window;
}

// PiP ウィンドウを開き、index.html の <template id="..."> の中身を流し込む
export async function openPiPWindow(templateId) {
   const pipWindow = await window.documentPictureInPicture.requestWindow();
   const pipDocument = pipWindow.document;

   await loadStyleSheet(pipDocument, PIP_CSS_URL);

   const content = document.getElementById(templateId).content.cloneNode(true);
   pipDocument.body.append(content);
   return pipWindow;
}

// 読み込み完了 (または失敗) まで待つ。スタイル無しの状態を見せないため
function loadStyleSheet(targetDocument, href) {
   return new Promise(resolve => {
      const link = targetDocument.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      targetDocument.head.append(link);
   });
}
