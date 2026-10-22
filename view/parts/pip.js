// view/parts/pip.js - Document Picture-in-Picture ウィンドウを開く共通処理 (Split / Focus が使う)
// スタイルは pip.css

const PIP_CSS_URL = new URL('../../pip.css', import.meta.url).href;

export function isPiPSupported() {
   return 'documentPictureInPicture' in window;
}

// 直前の PiP ウィンドウの中身の大きさ。開き直しても同じ大きさにする
let lastSize = null;

// PiP ウィンドウを開き、index.html の <template id="..."> の中身を流し込む。
// ブラウザ任せで前回の大きさを引き継ぐと、開き直すたびに枠の分だけ横に広がるので、
// 大きさは自前で覚えて指定する
export async function openPiPWindow(templateId) {
   const pipWindow = await window.documentPictureInPicture.requestWindow(
      lastSize ? { ...lastSize, preferInitialWindowPlacement: true } : {}
   );
   const pipDocument = pipWindow.document;

   const saveSize = () => {
      lastSize = { width: pipWindow.innerWidth, height: pipWindow.innerHeight };
   };
   saveSize();
   pipWindow.addEventListener("resize", saveSize);

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
