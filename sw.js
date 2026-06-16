// ═══════════════════════════════════════════════════════════════
//  sw.js — Pagaska Music Service Worker  (FIXED)
//  Perubahan:
//    - Shell: Network First saat tab aktif, Cache ONLY saat offline
//    - Tambah 'beforeunload' message untuk stop caching saat app di-close
//    - Audio cache tetap (user minta disimpan secara eksplisit)
//    - App shell TIDAK di-cache ulang saat app di-close/background
// ═══════════════════════════════════════════════════════════════

const SW_VERSION    = 'pagaska-v3';
const SHELL_CACHE   = `${SW_VERSION}-shell`;
const AUDIO_CACHE   = `${SW_VERSION}-audio`;
const IMAGE_CACHE   = `${SW_VERSION}-images`;

const SHELL_FILES = [
  // index.html SENGAJA tidak di-cache agar selalu fresh dari network
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// File-file ini TIDAK pernah di-cache oleh SW (selalu network)
const NEVER_CACHE = [
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/',
];

const NETWORK_ONLY_DOMAINS = [
  'supabase.co',
  'api.nexray.eu.cc',
  'api.ferdev.my.id',
  'itunes.apple.com',
  'music.apple.com',
  'lrclib.net',
  'api.telegram.org',
  'theresav.biz.id',
];

const AUDIO_DOMAINS = ['vex.web.id'];

// Flag: apakah app sedang aktif (ada tab terbuka)
let _appActive = true;

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...', SW_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => Promise.allSettled(
        SHELL_FILES.map(url => cache.add(url).catch(e =>
          console.warn('[SW] Shell cache miss:', url, e.message)
        ))
      ))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — hapus cache versi lama ────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...', SW_VERSION);
  event.waitUntil(
    // Hapus semua cache lama (termasuk index.html yang mungkin ter-cache)
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith('pagaska-') && !key.startsWith(SW_VERSION))
        .map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
    )).then(() => self.clients.claim())
  );
});

// ── MESSAGE HANDLER ───────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, url } = event.data || {};

  // App kasih tahu SW saat akan di-close → stop update shell cache
  if (type === 'APP_CLOSING') {
    _appActive = false;
    console.log('[SW] App closing — shell cache update disabled');
    // Re-enable setelah 10 detik (jaga-jaga kalau user batal close)
    setTimeout(() => { _appActive = true; }, 10000);
  }

  if (type === 'APP_ACTIVE') {
    _appActive = true;
  }

  if (type === 'CHECK_AUDIO_CACHED') {
    caches.open(AUDIO_CACHE).then(cache =>
      cache.match(url).then(cached =>
        event.source.postMessage({ type: 'AUDIO_CACHE_STATUS', url, cached: !!cached })
      )
    );
  }

  if (type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats =>
      event.source.postMessage({ type: 'CACHE_STATS', stats })
    );
  }

  if (type === 'CLEAR_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then(() =>
      event.source.postMessage({ type: 'AUDIO_CACHE_CLEARED' })
    );
  }

  if (type === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // 1. Network Only
  if (NETWORK_ONLY_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Audio cache
  const isAudio = AUDIO_DOMAINS.some(d => url.hostname.includes(d))
    || url.pathname.endsWith('.mp3')
    || url.pathname.endsWith('.m4a')
    || url.pathname.endsWith('.aac')
    || url.hostname.includes('cloudflarestorage')
    || url.hostname.includes('r2.dev');

  if (isAudio) {
    event.respondWith(audioCacheStrategy(event.request));
    return;
  }

  // 3. Image cache
  const isImage = url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)
    || url.hostname.includes('mzstatic.com')
    || url.hostname.includes('i.scdn.co');

  if (isImage) {
    event.respondWith(imageCacheStrategy(event.request));
    return;
  }

  // 4. App Shell
  event.respondWith(shellCacheStrategy(event.request));
});

// ── STRATEGY: Shell — Network First, tapi TIDAK update cache saat app closing ──
async function shellCacheStrategy(request) {
  const url = new URL(request.url);
  const isNeverCache = NEVER_CACHE.some(p => url.pathname === p || url.pathname === p + 'index.html');

  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    // Jangan cache file yang masuk NEVER_CACHE list
    if (response.ok && _appActive && !isNeverCache) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline — koneksi tidak tersedia', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ── STRATEGY: Audio — Cache First (CORS fix) ─────────────────
async function audioCacheStrategy(request) {
  const cache  = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request.url);
  if (cached) {
    console.log('[SW] Audio cache hit:', request.url.substring(0, 60));
    return cached;
  }

  const corsReq = new Request(request.url, {
    method: 'GET', mode: 'cors', credentials: 'omit',
    headers: { 'Accept': 'audio/mpeg, audio/*, */*' },
  });

  try {
    let response;
    try { response = await fetch(corsReq); } catch (e) {
      console.warn('[SW] CORS fetch failed:', e.message);
    }
    if (!response && request.mode === 'no-cors') {
      response = await fetch(new Request(request.url, { method: 'GET', mode: 'no-cors', credentials: 'omit' }));
    }
    if (!response) throw new Error('CORS fetch gagal');

    try {
  if (response.status === 200) {
    await cache.put(request.url, response.clone());
    notifyClients({ type: 'AUDIO_CACHED', url: request.url });
    trimAudioCache(cache);
  } else {
    console.log('[SW] Skip cache partial audio:', response.status);
  }
} catch (e) {
  console.warn('[SW] Cache put gagal:', e.message);
}

    return response;
  } catch (e) {
    console.warn('[SW] Audio fetch gagal:', e.message);
    const stale = await cache.match(request.url);
    if (stale) return stale;
    return new Response(JSON.stringify({ error: 'Audio tidak tersedia offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

// ── STRATEGY: Image — Cache First ────────────────────────────
async function imageCacheStrategy(request) {
  const cache  = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      { headers: { 'Content-Type': 'image/svg+xml' } });
  }
}

// ── TRIM AUDIO CACHE ──────────────────────────────────────────
const MAX_AUDIO_MB    = 500;
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;
// Bug 5 fix: pakai Storage API estimate dulu sebelum baca semua blob
// Ini jauh lebih ringan — tidak perlu buka semua response
let _trimRunning = false;
async function trimAudioCache(cache) {
  if (_trimRunning) return; // skip kalau sudah jalan
  _trimRunning = true;
  // Jalankan di background setelah response sudah dikirim ke client
  setTimeout(async () => {
    try {
      // Pakai StorageManager estimate kalau tersedia (jauh lebih cepat)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage, quota } = await navigator.storage.estimate();
        // Kalau total storage masih < 80% quota, skip trim
        if (usage / quota < 0.8) { _trimRunning = false; return; }
      }
      const keys = await cache.keys();
      // Batasi: max 120 file audio di cache (FIFO — hapus yang paling lama)
      const MAX_FILES = 120;
      if (keys.length > MAX_FILES) {
        const toDelete = keys.slice(0, keys.length - MAX_FILES);
        await Promise.all(toDelete.map(k => cache.delete(k)));
        console.log('[SW] trimAudioCache: deleted', toDelete.length, 'old entries');
      }
    } catch (e) { console.warn('[SW] trimAudioCache error:', e.message); }
    _trimRunning = false;
  }, 0);
}

// ── NOTIFY CLIENTS ────────────────────────────────────────────
async function notifyClients(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage(data));
}

// ── GET CACHE STATS ───────────────────────────────────────────
async function getCacheStats() {
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    const shellCache = await caches.open(SHELL_CACHE);
    const imageCache = await caches.open(IMAGE_CACHE);
    const audioKeys  = await audioCache.keys();
    const shellKeys  = await shellCache.keys();
    const imageKeys  = await imageCache.keys();
    let audioSize = 0;
    for (const req of audioKeys) {
      const res  = await audioCache.match(req);
      const blob = await res.blob();
      audioSize += blob.size;
    }
    return {
      audio:  { count: audioKeys.length, sizeMB: (audioSize/1024/1024).toFixed(1), maxMB: MAX_AUDIO_MB, urls: audioKeys.map(r => r.url) },
      shell:  { count: shellKeys.length },
      images: { count: imageKeys.length },
    };
  } catch (e) { return { error: e.message }; }
}

// ── PUSH NOTIFICATION ─────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Pagaska Music';
  const body  = data.body  || 'Ada pesan baru dari admin!';
  const icon  = data.icon  || '/icons/icon-192.png';
  const badge = data.badge || '/icons/icon-192.png';
  const tag   = data.tag   || 'pagaska-notif-' + Date.now();
  const url   = data.url   || '/index.html';
  event.waitUntil(
    self.registration.showNotification(title, {
      body, icon, badge, tag,
      data: { url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
