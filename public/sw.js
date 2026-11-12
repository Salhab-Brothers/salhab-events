// Minimal offline support. It keeps the app itself (page, scripts, styles, icons) so the
// calendar opens without a connection. It never touches data: only same-origin GET requests
// are handled, so Supabase (bookings, login) and the captcha always go straight to the network.
const CACHE = 'shell-v1';
const SHELL = ['/', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
const MAX_ASSETS = 60; // hashed build files pile up across deploys; keep the newest ones

const offlinePage = () => new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>مناسبات آل سلهب</title><body dir="rtl" style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">' +
  '<p>لا يوجد اتصال بالإنترنت.<br>افتح الموقع مرة أخرى عند عودة الاتصال.</p>',
  { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
);

async function trimAssets(cache) {
  const assets = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith('/assets/'));
  await Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map((r) => cache.delete(r)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network first, so a new deploy shows up at once; the saved page is only for offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); }
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit || offlinePage())),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    // Build files have the content hash in their name and never change, so cache first.
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy).then(() => trimAssets(c)));
        }
        return res;
      })),
    );
  }
});
