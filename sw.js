// Service worker: precaches the app shell so Stroomkringen works offline.
// The cache name includes the app version, so bumping js/version.js
// makes every device download the new files once.

importScripts('js/version.js');

const CACHE = `stroomkringen-${self.APP_VERSION}`;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/version.js',
  'js/app.js',
  'js/views.js',
  'js/workspace.js',
  'js/store.js',
  'js/db.js',
  'js/ui.js',
  'js/sound.js',
  'js/circuit/parts.js',
  'js/circuit/model.js',
  'js/circuit/sim.js',
  'js/circuit/draw.js',
  'js/circuit/editor.js',
  'js/lessons/lessons.js',
  'js/lessons/checks.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('stroomkringen-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first for our own files, network for everything else.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
    })
  );
});
