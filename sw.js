// ═══════════════════════════════════════════════════════════════
//  sw.js — Pagaska Music Service Worker
//  Strategy:
//    - App Shell (HTML/CSS/JS/font) → Cache First, update background
//    - Audio (R2 URLs) → Cache First, simpan saat pertama diputar
//    - API calls (Supabase, backend) → Network Only (butuh koneksi)
// ═══════════════════════════════════════════════════════════════

const SW_VERSION    = 'pagaska-v1';
const SHELL_CACHE   = `${SW_VERSION}-shell`;
const AUDIO_CACHE   = `${SW_VERSION}-audio`;
const IMAGE_CACHE   = `${SW_VERSION}-images`;

// File-file app shell yang di-cache saat install
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

// Domain yang TIDAK boleh di-cache (selalu butuh network)
const NETWORK_ONLY_DOMAINS = [
  'supabase.co',          // Supabase API — chat, party, tracks
  'api.nexray.eu.cc',     // Nexray downloader
  'api.ferdev.my.id',     // Ferdev API
  'itunes.apple.com',     // iTunes search
  'music.apple.com',      // Apple Music search
  'lrclib.net',           // Lyrics
  'api.telegram.org',     // Telegram bot
];

// Domain audio R2 — di-cache
const AUDIO_DOMAINS = [
  'vex.web.id',
];

// ── INSTALL — cache app shell ────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...', SW_VERSION);
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // addAll akan gagal kalau salah satu file 404 — pakai add satu-satu
        return Promise.allSettled(
          SHELL_FILES.map(url => cache.add(url).catch(e => {
            console.warn('[SW] Shell cache miss:', url, e.message);
          }))
        );
      })
      .then(() => self.skipWaiting()) // Langsung aktif tanpa tunggu tab ditutup
  );
});

// ── ACTIVATE — hapus cache versi lama ───────────────────────
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
    }).then(() => self.clients.claim()) // Ambil alih semua tab yang terbuka
  );
});

// ── FETCH — intercept semua request ─────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET request (POST, DELETE, dll) — langsung ke network
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension dan non-http
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Network Only: Supabase, API calls ──────────────────
  if (NETWORK_ONLY_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ── 2. Audio Cache: R2 audio files ────────────────────────
  const isAudio = AUDIO_DOMAINS.some(d => url.hostname.includes(d))
    || url.pathname.endsWith('.mp3')
    || url.pathname.endsWith('.m4a')
    || url.pathname.endsWith('.aac')
    || (url.hostname.includes('cloudflarestorage') || url.hostname.includes('r2.dev'));

  if (isAudio) {
    event.respondWith(audioCacheStrategy(event.request));
    return;
  }

  // ── 3. Image Cache: thumbnail album ───────────────────────
  const isImage = url.pathname.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)
    || url.hostname.includes('mzstatic.com')   // Apple Music thumbnail
    || url.hostname.includes('is1-ssl.mzstatic')
    || url.hostname.includes('i.scdn.co');      // Spotify thumbnail

  if (isImage) {
    event.respondWith(imageCacheStrategy(event.request));
    return;
  }

  // ── 4. App Shell: HTML, CSS, JS, Font ─────────────────────
  event.respondWith(shellCacheStrategy(event.request));
});

// ── STRATEGY: Audio — Cache First (CORS fix) ────────────────
// Buat Request baru dengan mode:'cors' karena Request dari <audio>
// punya mode:'no-cors' yang tidak bisa diubah → R2 tidak return
// Access-Control-Allow-Origin → browser blokir Web Audio API.
async function audioCacheStrategy(request) {
  const cache  = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request.url);

  if (cached) {
    console.log('[SW] Audio cache hit:', request.url.substring(0, 60));
    return cached;
  }

  console.log('[SW] Audio cache miss, fetching:', request.url.substring(0, 60));

  // Request baru dengan CORS mode — tidak bisa modifikasi request asli
  const corsReq = new Request(request.url, {
    method:      'GET',
    mode:        'cors',
    credentials: 'omit',
    headers:     { 'Accept': 'audio/mpeg, audio/*, */*' },
  });

  try {
    // Coba fetch dengan CORS (benar-benar cross-origin jika server mendukung)
    let response;
    try {
      response = await fetch(corsReq);
    } catch (e) {
      console.warn('[SW] CORS fetch failed, will try no-cors fallback:', e.message);
    }

    // Jika fetch CORS gagal atau server tidak memberikan CORS header,
    // hanya fallback ke no-cors jika permintaan asli memang no-cors.
    if (!response) {
      if (request.mode === 'no-cors') {
        try {
          const noCorsReq = new Request(request.url, { method: 'GET', mode: 'no-cors', credentials: 'omit' });
          response = await fetch(noCorsReq);
          console.log('[SW] Audio no-cors fetch result:', response.type || 'unknown');
        } catch (e) {
          console.warn('[SW] no-cors fetch also failed:', e.message);
          throw e;
        }
      } else {
        // Tidak melakukan no-cors fallback untuk permintaan yang mengharapkan CORS,
        // agar tidak mengembalikan opaque response yang menyebabkan error di client.
        throw new Error('CORS fetch failed and request requires CORS');
      }
    }

    // Cache the response when possible (opaque responses will have type 'opaque' and status 0)
    try {
      cache.put(request.url, response.clone());
      console.log('[SW] Audio cached (maybe opaque):', request.url.substring(0, 60));
      notifyClients({ type: 'AUDIO_CACHED', url: request.url });
      trimAudioCache(cache);
    } catch (e) {
      console.warn('[SW] Failed to cache audio response:', e.message);
    }

    return response;
  } catch (e) {
    console.warn('[SW] Audio fetch failed (offline?):', e.message);
    // Coba serve dari cache kalau ada (stale fallback)
    const stale = await cache.match(request.url);
    if (stale) return stale;
    return new Response(
      JSON.stringify({ error: 'Audio tidak tersedia offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── STRATEGY: Image — Cache First ───────────────────────────
async function imageCacheStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline, tidak ada cache → return placeholder 1x1 transparan
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// ── STRATEGY: App Shell — Network First + Cache Fallback ────
// Coba ambil fresh dari network. Kalau gagal (offline), pakai cache.
async function shellCacheStrategy(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()); // Update cache di background
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fallback ke index.html untuk SPA navigation
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
// Hapus lagu paling lama kalau total cache > MAX_AUDIO_BYTES
const MAX_AUDIO_MB    = 500;
const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024;

async function trimAudioCache(cache) {
  try {
    const keys = await cache.keys();
    let totalSize = 0;
    const entries = [];

    for (const req of keys) {
      const res = await cache.match(req);
      const blob = await res.blob();
      totalSize += blob.size;
      entries.push({ req, size: blob.size });
    }

    if (totalSize > MAX_AUDIO_BYTES) {
      console.log(`[SW] Audio cache ${(totalSize/1024/1024).toFixed(0)}MB > ${MAX_AUDIO_MB}MB, trimming...`);
      // Hapus dari yang pertama (paling lama di-cache)
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
// Terima pesan dari index.html (misal: cek status cache, hapus cache)
self.addEventListener('message', event => {
  const { type, url } = event.data || {};

  if (type === 'CHECK_AUDIO_CACHED') {
    caches.open(AUDIO_CACHE).then(cache => {
      cache.match(url).then(cached => {
        event.source.postMessage({
          type: 'AUDIO_CACHE_STATUS',
          url,
          cached: !!cached
        });
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
    const audioCache  = await caches.open(AUDIO_CACHE);
    const shellCache  = await caches.open(SHELL_CACHE);
    const imageCache  = await caches.open(IMAGE_CACHE);

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
      audio: {
        count:   audioKeys.length,
        sizeMB:  (audioSize / 1024 / 1024).toFixed(1),
        maxMB:   MAX_AUDIO_MB,
        urls:    audioKeys.map(r => r.url),
      },
      shell:  { count: shellKeys.length },
      images: { count: imageKeys.length },
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  UPDATE #4 — PUSH NOTIFICATION HANDLER
// ═══════════════════════════════════════════════════════════════

// ── PUSH EVENT — terima notif dari server ────────────────────
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title   = data.title   || 'Pagaska Music';
  const body    = data.body    || 'Ada pesan baru dari admin!';
  const icon    = data.icon    || '/icons/icon-192.png';
  const badge   = data.badge   || '/icons/icon-192.png';
  const tag     = data.tag     || 'pagaska-notif-' + Date.now();
  const url     = data.url     || '/index.html';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// ── NOTIFICATION CLICK — buka app ────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Kalau app sudah terbuka, fokus ke sana
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      // Kalau belum terbuka, buka baru
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
