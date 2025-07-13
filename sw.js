const CACHE_NAME = 'pilkarzyki-cache-v1';
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Instalacja Service Workera i zapisanie zasobów w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otwarto cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Odpowiadanie z cache, gdy aplikacja jest offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jeśli zasób jest w cache, zwróć go. W przeciwnym razie, pobierz z sieci.
        return response || fetch(event.request);
      })
  );
});

// Usuwanie starych wersji cache podczas aktywacji nowego Service Workera
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME).map(cacheName => caches.delete(cacheName))
      );
    })
  );
});