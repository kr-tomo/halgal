/* 오프라인 캐시 서비스 워커. 파일을 수정(스프라이트 교체 등)하면 VERSION 을 올려 주세요. */
const VERSION = 'halligalli-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css',
  'js/assets.js', 'js/game.js', 'js/layout.js', 'js/sound.js', 'js/app.js',
  'assets/cards.svg', 'assets/bells.svg', 'assets/board.svg',
  'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png', 'assets/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 캐시 우선, 없으면 네트워크 (성공 시 캐시에 보관). 사용자 지정 사운드/이미지도 자동 캐시됨.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
