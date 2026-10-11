// view/configModal.js - Supabase 接続設定の入力画面
// app.js とは別に読み込む (Supabase を読み込めない状態でも設定できるようにするため)

const STORAGE_KEY = 'supabaseConfig';

const modal     = document.getElementById('config-modal');
const inputUrl  = document.getElementById('supabase-url');
const inputKey  = document.getElementById('supabase-key');
const btnSave   = document.getElementById('save-config');
const btnCancel = document.getElementById('cancel-config');

function loadConfig() {
   try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
   } catch(e) {
      return null;
   }
}

// 設定済みなら現在の値を入れて開く。未設定のときは保存するまで閉じられない
function open() {
   const cfg = loadConfig();
   inputUrl.value = cfg?.SUPABASE_URL || '';
   inputKey.value = cfg?.SUPABASE_ANON_KEY || '';
   btnCancel.hidden = !cfg;
   modal.hidden = false;
}

btnSave.addEventListener('click', () => {
   const url = inputUrl.value.trim();
   const key = inputKey.value.trim();
   if (url && key) {
      const stored = { SUPABASE_URL: url, SUPABASE_ANON_KEY: key };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      window.location.reload();
   } else {
      alert('URL とキーを入力してください');
   }
});

btnCancel.addEventListener('click', () => {
   modal.hidden = true;
});

// data-open-config を付けた要素が入口になる
document.addEventListener('click', (e) => {
   if (e.target.closest('[data-open-config]')) open();
});

if (!loadConfig()) open();
