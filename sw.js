/* 会計管理アプリ Service Worker（オフライン対応）
   方針：ネットワーク優先（常に最新を取得）→ オフライン時のみキャッシュを使用。
   そのため、アプリ更新時に番号を上げ忘れても旧版が表示され続けることはありません。
   （古いキャッシュを整理したいときだけ CACHE の番号を上げてください） */
const CACHE = 'kaikei-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:'reload' … ブラウザのHTTPキャッシュ（GitHub Pagesは max-age=600）を経由せず必ず最新を取得
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // 外部リソースは対象外

  e.respondWith(
    // cache:'no-cache' … 毎回サーバに更新確認（変更なしなら304で軽量）
    fetch(req, { cache: 'no-cache' })
      .then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      // オフライン等でネットワークに出られないときだけキャッシュを使う
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
  );
});
