// sw.js
const CACHE_NAME = 'trip-planner-v1';

// 必須快取的外部套件與靜態資源
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// 1. 安裝階段：將關鍵套件與頁面寫入快取
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 快取核心檔案與 CDN 套件');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 啟用階段：清除舊版本的快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] 清除舊快取：', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截網路請求：網路優先，斷網時自動讀取本地快取
self.addEventListener('fetch', (event) => {
  // 不攔截 Supabase API 的直接請求，API 資料我們改用 LocalStorage 處理
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果成功從網路拿到資源，複製一份更新到快取中
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 當網路連線失敗（離線）時，改從快取拿資料
        console.log('[Service Worker] 離線模式，讀取快取：', event.request.url);
        return caches.match(event.request);
      })
  );
});
