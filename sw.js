// sw.js - サービスワーカー
// 役割は「ページを開くときにオフラインなら offline.html を返す」ことだけ。
// アプリのファイル (HTML / CSS / JS) はキャッシュしない (古い版が出続けるのを避けるため)

const CACHE_NAME  = 'offline-v1';
const OFFLINE_URL = 'offline.html';

self.addEventListener('install', (event) => {
   event.waitUntil(
      caches.open(CACHE_NAME)
         .then(cache => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
         .then(() => self.skipWaiting())
   );
});

// 古い名前のキャッシュを消す
self.addEventListener('activate', (event) => {
   event.waitUntil(
      caches.keys()
         .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
         .then(() => self.clients.claim())
   );
});

// ページ本体の取得だけを扱う。それ以外 (CSS / JS / CDN / Supabase) には触れない
self.addEventListener('fetch', (event) => {
   if (event.request.mode !== 'navigate') return;

   event.respondWith(
      fetch(event.request).catch(async () => {
         const cache = await caches.open(CACHE_NAME);
         return cache.match(OFFLINE_URL);
      })
   );
});
