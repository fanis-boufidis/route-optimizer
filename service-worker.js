const CACHE_NAME = 'route-optimizer-v6';

// Τα βασικά αρχεία που κάνουμε cache ώστε το app να ανοίγει γρήγορα / offline
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: γεμίζουμε το cache με το app shell.
// Κάθε αρχείο ξεχωριστά ώστε ένα που λείπει να μη ρίχνει όλο το install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => console.warn('SW: δεν έγινε cache:', url, err))
        )
      )
    )
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

// Fetch strategy:
// - Google/Firebase APIs: πάντα δίκτυο (ποτέ cache) — φρέσκα δεδομένα/δρομολόγηση
// - App shell (ίδιο origin): cache-first, με network fallback και ενημέρωση cache
// - Πλοήγηση (navigation) offline: επιστρέφουμε το cached index.html
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Μόνο GET γίνεται cache
  if (request.method !== 'GET') return;

  // Ποτέ cache για Google/Firebase δικτυακές κλήσεις
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google.com')
  ) {
    return; // άφησε το request να πάει κανονικά στο δίκτυο
  }

  // Navigation requests: αν αποτύχει το δίκτυο (offline), δώσε το cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Υπόλοιπα (ίδιο origin): cache-first με network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Αποθήκευσε στο cache αντίγραφο για την επόμενη φορά
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
