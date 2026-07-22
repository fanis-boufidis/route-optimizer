const CACHE_NAME = 'route-optimizer-v11';

// Τα βασικά αρχεία που κάνουμε cache ώστε το app να ανοίγει γρήγορα / offline
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: γεμίζουμε το cache με το app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: καθαρίζουμε παλιά caches από προηγούμενες εκδόσεις
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first για το app shell.
// ΠΡΟΣΟΧΗ: οι κλήσεις προς το Google Routes API (routes.googleapis.com)
// ΔΕΝ πρέπει να γίνονται cache — θέλουμε πάντα φρέσκο αποτέλεσμα δρομολόγησης.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ποτέ μην κάνεις cache κλήσεις προς το Google API
  if (url.hostname.includes('googleapis.com')) {
    return; // άφησε το request να πάει κανονικά στο δίκτυο
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});