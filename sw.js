// ============================================================
// NUTRIPRO - 运动营养数据平台
// Service Worker: sw.js
// Purpose: Offline support via cache-first strategy
// ============================================================

const CACHE_NAME = 'nutripro-v2';
const RUNTIME_CACHE = 'nutripro-runtime-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  'index.html',
  'styles.css',
  'food_db.json',
  'modules/config.js',
  'modules/utils.js',
  'modules/state.js',
  'modules/cloud-sync.js',
  'modules/auth.js',
  'modules/admin.js',
  'modules/admin-food.js',
  'modules/admin-users.js',
  'modules/admin-key.js',
  'modules/food-db.js',
  'modules/food-render.js',
  'modules/calculators.js',
  'modules/diet.js',
  'modules/advice.js',
  'modules/app.js',
];

// CDN resources to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => console.warn('SW: Some static assets failed to cache'))
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for API/runtime data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API calls — use network-first for those
  if (url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static assets (HTML, CSS, JS, JSON, images)
  event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy: try cache, fall back to network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Clone and cache successful responses
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // For navigation requests, fall back to index.html (SPA routing)
    if (request.destination === 'document') {
      return caches.match('index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first strategy: try network, fall back to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) return response;
  } catch {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) return cached;
  }
  // Neither network nor cache succeeded
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}
