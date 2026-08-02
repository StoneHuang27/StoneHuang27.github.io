// ============================================================
// NUTRIPRO - 运动营养数据平台
// Service Worker: sw.js
// Purpose: Offline support with resilient fallback
// ============================================================

const CACHE_NAME = 'nutripro-v8';
const RUNTIME_CACHE = 'nutripro-runtime-v4';

// Static assets to cache on install
// NOTE: must stay in sync with the <script src="modules/..."> tags in index.html
const STATIC_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'modules/config.js',
  'modules/utils.js',
  'modules/state.js',
  'modules/db-compress.js',
  'modules/cloud-sync.js',
  'modules/auth.js',
  'modules/admin.js',
  'modules/admin-food.js',
  'modules/admin-users.js',
  'modules/admin-key.js',
  'modules/food-db.js',
  'modules/food-render.js',
  'modules/calculators.js',
  'modules/rpe-monitor.js',
  'modules/diet.js',
  'modules/advice.js',
  'modules/app.js',
  'modules/health.js',
  'modules/units.js',
  'modules/supplements.js',
  'modules/data-export.js',
];

// Install: cache static assets one by one so a single 404 cannot abort the whole batch
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('SW: failed to cache', asset, err);
          })
        )
      );
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches, then take control of open pages
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-first for HTML and API data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-http(s) schemes (chrome-extension:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Supabase API calls: network-first
  if (url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigation / HTML: network-first (always try to get the latest)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for other static assets (CSS, JS, images, fonts)
  event.respondWith(cacheFirst(request));
});

/**
 * Returns true for requests that should fall back to the app shell.
 */
function isNavigation(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

/**
 * Look up the cached app shell (index.html) regardless of query string / origin.
 */
async function getAppShell() {
  return (
    (await caches.match('index.html', { ignoreSearch: true })) ||
    (await caches.match('./', { ignoreSearch: true })) ||
    (await caches.match('/index.html', { ignoreSearch: true }))
  );
}

/**
 * Styled offline page — replaces the previous bare "Offline" text response.
 */
function offlineFallback() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NutriPro — 当前离线</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
         background:#0f172a; color:#e2e8f0; }
  .box { max-width:420px; padding:32px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; color:#f8fafc; }
  p { font-size:14px; line-height:1.7; color:#94a3b8; margin:0 0 20px; }
  button { padding:10px 24px; font-size:14px; border:0; border-radius:8px;
           background:#3b82f6; color:#fff; cursor:pointer; }
  button:hover { background:#2563eb; }
</style>
</head>
<body>
  <div class="box">
    <h1>网络不可用</h1>
    <p>无法连接到服务器，且本地缓存尚未建立。<br>
       请检查网络连接、代理设置或 hosts 配置后重试。</p>
    <button onclick="location.reload()">重新加载</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Cache-first strategy: try cache, fall back to network.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (isNavigation(request)) {
      const shell = await getAppShell();
      if (shell) return shell;
    }
    return offlineFallback();
  }
}

/**
 * Network-first strategy: try network, fall back to cache, then to the app shell.
 * A non-ok network response (404/500/502) now also triggers the fallback chain
 * instead of returning a bare "Offline" body.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful navigations/documents for future offline use
      if (isNavigation(request)) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    }
    // Network reachable but returned an error status — try cache before giving up
    const cachedOnError =
      (await caches.match(request, { ignoreSearch: true })) ||
      (isNavigation(request) ? await getAppShell() : null);
    if (cachedOnError) return cachedOnError;
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (isNavigation(request)) {
      const shell = await getAppShell();
      if (shell) return shell;
    }
  }
  return offlineFallback();
}
