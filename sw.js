// ═══════════════════════════════════════════════════════════════
//  sw.js — Pagaska Music Service Worker
//  Strategy:
//    - App Shell (HTML/CSS/JS/font) → Cache First, update background
//    - Audio (R2 URLs) → Cache First, simpan saat pertama diputar
//    - API calls (Supabase, backend) → Network Only (butuh koneksi)
// ═══════════════════════════════════════════════════════════════

const SW_VERSION    = 'pagaska-v2'; // bump versi agar SW lama diganti
const SHELL_CACHE   = `${SW_VERSION}-shell`;
const AUDIO_CACHE   = `${SW_VERSION}-audio`;
const IMAGE_CACHE   = `${SW_VERSION}-images`;

const SHELL_FILES = [
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/explore.js',
  '/_lib/db.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const NETWORK_ONLY_DOMAINS = [
  'supabase.co',
  'api.nexray.eu.cc',
  'api.ferdev.my.id',
  'itunes.apple.com',
  'music.apple.com',
  'lrclib.net',
  'api.telegram.org',
];

const AUDIO_DOMAINS = [
  'vex.web.id',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...', SW_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return Promise.allSettled(
          SHELL_FILES.map(url => cache.add(url).catch(e => {
            console.warn('[SW] Shell cache miss:', url, e.message);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...', SW_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('pagaska-') && !key.startsWith(SW_VERSION))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // 1. Network Only
  if (NETWORK_ONLY_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Audio Cache
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

  // 3. Image Cache
  const isImage = url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)
    || url.hostname.includes('mzstatic.com')
    || url.hostname.includes('is1-ssl.mzstatic')
    || url.hostname.includes('i.scdn.co');

  if (isImage) {
    event.respondWith(imageCacheStrategy(event.request));
    return;
  }

  // 4. App Shell
  event.respondWith(shellCacheStrategy(event.request));
});

async function audioCacheStrategy(request) {
  const cache  = await caches.open(AUDIO_CACHE);

  // Cek cache dulu — kalau ada, langsung serve tanpa network
  const cached = await cache.match(request.url);
  if (cached) {
    console.log('[SW] Audio cache hit:', request.url.substring(0, 60));
    return cached;
  }

  console.log('[SW] Audio cache miss, fetching:', request.url.substring(0, 60));

  const corsRequest = new Request(request.url, {
    method:      'GET',
    mode:        'cors',         // kirim Origin header → R2 return ACAO header
    credentials: 'omit',        // jangan kirim cookie/auth agar ACAO:* berlaku
    headers:     { 'Accept': 'audio/mpeg, audio/*, */*' },
  });

  try {
    const response = await fetch(corsRequest);

    if (response.ok) {
      // Clone karena response hanya bisa dibaca sekali
      cache.put(request.url, response.clone());
      console.log('[SW] Audio cached:', request.url.substring(0, 60));
      notifyClients({ type: 'AUDIO_CACHED', url: request.url });
      trimAudioCache(cache);
    } else {
      console.warn('[SW] Audio fetch non-ok:', response.status, request.url.substring(0, 60));
    }

    return response;

  } catch (e) {
    console.warn('[SW] Audio fetch failed (offline?):', e.message);

    // Coba fallback ke cache dengan URL string (bukan Request object)
    const fallback = await cache.match(request.url);
    if (fallback) {
      console.log('[SW] Serving stale audio from cache');
      return fallback;
    }

    return new Response(
      JSON.stringify({ error: 'Audio tidak tersedia offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── STRATEGY: Image — Cache First ────────────────────────────
async function imageCacheStrategy(request) {
  const cache  = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    // Gambar dari domain lain juga butuh CORS agar bisa di-cache
    const corsRequest = new Request(request.url, {
      method:      'GET',
      mode:        'cors',
      credentials: 'omit',
    });
    const response = await fetch(corsRequest);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline fallback: 1x1 pixel transparan
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// ── STRATEGY: App Shell — Network First + Cache Fallback ─────
async function shellCacheStrategy(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.headers.get('accept')?.includes('text/html')) {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }

    return new Response('Offline — koneksi tidak tersedia', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// ── TRIM AUDIO CACHE ─────────────────────────────────────────
const MAX_AUDIO_MB    = 500;
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;

async function trimAudioCache(cache) {
  try {
    const keys = await cache.keys();
    let totalSize = 0;
    const entries = [];

    for (const req of keys) {
      const res  = await cache.match(req);
      const blob = await res.blob();
      totalSize += blob.size;
      entries.push({ req, size: blob.size });
    }

    if (totalSize > MAX_AUDIO_BYTES) {
      console.log(`[SW] Audio cache ${(totalSize/1024/1024).toFixed(0)}MB > ${MAX_AUDIO_MB}MB, trimming...`);
      let freed = 0;
      const toFree = totalSize - MAX_AUDIO_BYTES;
      for (const entry of entries) {
        if (freed >= toFree) break;
        await cache.delete(entry.req);
        freed += entry.size;
        console.log('[SW] Evicted:', entry.req.url.substring(0, 60));
      }
    }
  } catch (e) {
    console.warn('[SW] trimAudioCache error:', e.message);
  }
}

// ── NOTIFY CLIENTS ───────────────────────────────────────────
async function notifyClients(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => client.postMessage(data));
}

// ── MESSAGE HANDLER ──────────────────────────────────────────
self.addEventListener('message', event => {
  const { type, url } = event.data || {};

  if (type === 'CHECK_AUDIO_CACHED') {
    caches.open(AUDIO_CACHE).then(cache => {
      cache.match(url).then(cached => {
        event.source.postMessage({ type: 'AUDIO_CACHE_STATUS', url, cached: !!cached });
      });
    });
  }

  if (type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.source.postMessage({ type: 'CACHE_STATS', stats });
    });
  }

  if (type === 'CLEAR_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then(() => {
      event.source.postMessage({ type: 'AUDIO_CACHE_CLEARED' });
    });
  }

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── GET CACHE STATS ──────────────────────────────────────────
async function getCacheStats() {
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    const shellCache = await caches.open(SHELL_CACHE);
    const imageCache = await caches.open(IMAGE_CACHE);

    const audioKeys = await audioCache.keys();
    const shellKeys = await shellCache.keys();
    const imageKeys = await imageCache.keys();

    let audioSize = 0;
    for (const req of audioKeys) {
      const res  = await audioCache.match(req);
      const blob = await res.blob();
      audioSize += blob.size;
    }

    return {
      audio: {
        count:  audioKeys.length,
        sizeMB: (audioSize / 1024 / 1024).toFixed(1),
        maxMB:  MAX_AUDIO_MB,
        urls:   audioKeys.map(r => r.url),
      },
      shell:  { count: shellKeys.length },
      images: { count: imageKeys.length },
    };
  } catch (e) {
    return { error: e.message };
  }
}
