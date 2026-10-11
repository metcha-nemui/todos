// view/html.js - HTML 文字列を組み立てて要素にするためのヘルパ

// HTML に埋め込む文字列をエスケープする (要素の中身・属性値のどちらにも使える)
export function escapeHtml(str) {
   return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// HTML 文字列から要素を1つ作る
export function parseHtml(htmlString) {
   const template = document.createElement('template');
   template.innerHTML = htmlString.trim();
   return template.content.firstElementChild;
}
