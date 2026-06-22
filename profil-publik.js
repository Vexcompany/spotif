/**
 * profil-publik.js
 * Halaman profil publik full-page yang bisa dibuka oleh siapapun.
 * Inject page#page-profil-publik ke DOM, handle routing via navigate().
 *
 * API yang dipakai:
 *   PublikProfil.open(userKey, displayName)  — buka halaman profil orang lain
 *   PublikProfil.openSelf()                  — buka profil sendiri (full-page)
 *   PublikProfil.close()                     — kembali ke halaman sebelumnya
 */

const PublikProfil = (() => {
  // ── State ────────────────────────────────────────────────
  let _currentKey  = null;
  let _prevPage    = 'beranda';
  let _injected    = false;

  // ── Inject page ke DOM (sekali saja) ────────────────────
  function _inject() {
    if (_injected) return;
    _injected = true;

    const page = document.createElement('div');
    page.className = 'page';
    page.id = 'page-profil-publik';
    page.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:0px">
        <button class="page-back-btn" id="ppBack" aria-label="Kembali">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="sec-title" style="margin-bottom:0;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="ppPageTitle">Profil</div>
        <button id="ppShareBtn" style="width:34px;height:34px;border-radius:10px;border:1px solid var(--bd);background:var(--s2);color:var(--mt);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.8rem;flex-shrink:0;transition:all .2s" title="Bagikan profil">
          <i class="fas fa-share"></i>
        </button>
      </div>

      <!-- Hero profil -->
      <div style="background:var(--s1);border:1px solid var(--bd);border-radius:20px;overflow:hidden;margin-bottom:16px;margin-top:14px">
        <!-- Banner warna dinamis -->
        <div id="ppBanner" style="height:80px;background:linear-gradient(135deg,var(--p),var(--dyn1));position:relative;flex-shrink:0">
          <div id="ppBannerOrb" style="position:absolute;inset:0;background:inherit;filter:blur(0px)"></div>
        </div>

        <div style="padding:0 16px 16px;margin-top:-32px;position:relative">
          <!-- Avatar -->
          <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px">
            <div id="ppAvWrap" style="width:64px;height:64px;border-radius:50%;border:3px solid var(--bg);overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,var(--p),var(--dyn1));display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:#fff">?</div>
            <button id="ppChatBtn" style="display:none;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;background:var(--dyn1);color:#000;border:none;font-size:.78rem;font-weight:700;cursor:pointer;font-family:inherit">
              <i class="fas fa-comment-dots"></i> Chat
            </button>
          </div>

          <!-- Info -->
          <div id="ppName" style="font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:800;margin-bottom:2px">–</div>
          <div id="ppSub" style="font-size:.72rem;color:var(--mt);margin-bottom:10px">–</div>

          <!-- Stats row -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            <div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 8px;text-align:center">
              <div id="ppStatPlays" style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800">–</div>
              <div style="font-size:.58rem;color:var(--mt);margin-top:2px">Total Putar</div>
            </div>
            <div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 8px;text-align:center">
              <div id="ppStatTracks" style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800">–</div>
              <div style="font-size:.58rem;color:var(--mt);margin-top:2px">Lagu Berbeda</div>
            </div>
            <div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 8px;text-align:center">
              <div id="ppStatStreak" style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800">–</div>
              <div style="font-size:.58rem;color:var(--mt);margin-top:2px">Hari Streak</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pin Showcase -->
      <div style="margin-bottom:16px">
        <div style="font-size:.82rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px">
          <i class="fas fa-thumbtack" style="color:var(--dyn1)"></i> Pin Favorit
        </div>
        <div class="pin-grid" id="ppPinGrid"></div>
      </div>

      <!-- Top Lagu -->
      <div style="margin-bottom:16px">
        <div style="font-size:.82rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px">
          <i class="fas fa-trophy" style="color:var(--yw)"></i> Lagu Favorit
        </div>
        <div id="ppTopTracks" style="display:flex;flex-direction:column;gap:2px"></div>
      </div>

      <!-- Artis Favorit -->
      <div style="margin-bottom:16px">
        <div style="font-size:.82rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px">
          <i class="fas fa-microphone" style="color:var(--p2)"></i> Artis Terbanyak
        </div>
        <div id="ppTopArtists" style="display:flex;flex-direction:column;gap:4px"></div>
      </div>

      <!-- Riwayat Terakhir -->
      <div>
        <div style="font-size:.82rem;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:7px">
          <i class="fas fa-history" style="color:var(--b2)"></i> Diputar Terakhir
        </div>
        <div id="ppRecentList" class="tlist"></div>
      </div>
    `;

    document.querySelector('.main-content').appendChild(page);

    // Event listeners
    document.getElementById('ppBack').addEventListener('click', () => close());
    document.getElementById('ppChatBtn').addEventListener('click', () => {
      if (!_currentKey) return;
      const name = document.getElementById('ppName').textContent || _currentKey;
      close();
      setTimeout(() => openChatRoom(_currentKey, name), 300);
    });
    document.getElementById('ppShareBtn').addEventListener('click', () => {
      const name = document.getElementById('ppName').textContent || 'anggota';
      if (navigator.share) {
        navigator.share({ title: `Profil ${name} — Pagaska Music`, text: `Cek profil ${name} di Pagaska Music!`, url: window.location.href });
      } else {
        navigator.clipboard?.writeText(window.location.href).then(() => toast('Link disalin!'));
      }
    });
  }

  // ── Open profil orang lain ───────────────────────────────
  async function open(userKey, displayName) {
    if (!userKey) return;
    _inject();
    _prevPage    = typeof currentPage !== 'undefined' ? currentPage : 'beranda';
    _currentKey  = userKey;

    // Navigasi ke halaman
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('page-profil-publik').classList.add('active');
    if (typeof currentPage !== 'undefined') window.currentPage = 'profil-publik';

    // Set judul sementara
    const name = displayName || userKey.split('_').slice(0,-1).join(' ') || userKey;
    document.getElementById('ppPageTitle').textContent = name;
    document.getElementById('ppName').textContent = name;

    // Sembunyikan tombol chat kalau profil sendiri
    const isSelf = (typeof USER_KEY !== 'undefined') && userKey === USER_KEY;
    const chatBtn = document.getElementById('ppChatBtn');
    chatBtn.style.display = isSelf ? 'none' : 'flex';

    // Load data
    await _loadProfile(userKey, isSelf);
  }

  // ── Open profil sendiri (full-page) ─────────────────────
  async function openSelf() {
    if (typeof USER_KEY === 'undefined') return;
    await open(USER_KEY, typeof session !== 'undefined' && session?.nama ? session.nama : undefined);
  }

  // ── Close / kembali ─────────────────────────────────────
  function close() {
    if (typeof navigate === 'function') navigate(_prevPage);
    _currentKey = null;
  }

  // ── Load semua data profil ───────────────────────────────
  async function _loadProfile(userKey, isSelf) {
    const PH_ = typeof PH !== 'undefined' ? PH : 'https://placehold.co/200x200/0d0d24/1DB954?text=♪';

    // Reset UI ke skeleton
    _skeleton();

    try {
      // 1. Info user dari DB (tabel users / PAGASKA_DB)
      let userData = null;
      if (typeof window.PAGASKA_DB !== 'undefined' && window.PAGASKA_DB.getAllUsers) {
        const all = window.PAGASKA_DB.getAllUsers();
        userData = all.find(u => `${u.nama}_${u.generasi}` === userKey);
      }
      const ini = (userData?.nama || userKey).split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);

      // 2. Avatar
      const avWrap = document.getElementById('ppAvWrap');
      try {
        const avRows = await sb.get('user_profiles', `user_key=eq.${encodeURIComponent(userKey)}&select=avatar_url,accent_color`);
        if (avRows?.length) {
          if (avRows[0].avatar_url) {
            avWrap.innerHTML = `<img src="${avRows[0].avatar_url}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='${ini}'">`;
          } else {
            avWrap.textContent = ini;
          }
          // Warna aksen dari profil
          if (avRows[0].accent_color) {
            document.getElementById('ppBanner').style.background = `linear-gradient(135deg,${avRows[0].accent_color},var(--dyn1))`;
          }
        } else {
          avWrap.textContent = ini;
        }
      } catch(e) {
        avWrap.textContent = ini;
      }

      // 3. Sub-info
      document.getElementById('ppSub').textContent = userData
        ? `${userData.jabatan || 'Anggota'} · Generasi ${userData.generasi}`
        : userKey;

      // 4. Play history — ambil semua (max 500 row terbaru)
      const history = await sb.get('play_history',
        `user_key=eq.${encodeURIComponent(userKey)}&select=track_id,played_at&order=played_at.desc&limit=500`
      );

      const totalPlays  = history.length;
      const countMap    = {};
      history.forEach(h => { countMap[h.track_id] = (countMap[h.track_id] || 0) + 1; });
      const uniqTracks  = Object.keys(countMap).length;

      // Streak
      const localDate = dt => {
        const d = new Date(dt);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      };
      const playDays = new Set(history.map(h => h.played_at ? localDate(h.played_at) : null));
      let streak = 0;
      const _d = new Date();
      while (playDays.has(localDate(_d))) { streak++; _d.setDate(_d.getDate() - 1); }

      document.getElementById('ppStatPlays').textContent  = totalPlays.toLocaleString('id-ID');
      document.getElementById('ppStatTracks').textContent = uniqTracks;
      document.getElementById('ppStatStreak').textContent = streak + 'h';

      // 5. Top track IDs
      const sortedIds = Object.keys(countMap).sort((a,b) => countMap[b] - countMap[a]);
      const top10Ids  = sortedIds.slice(0, 10);

      let trackMap = {};
      if (top10Ids.length) {
        const tracks = await sb.get('tracks',
          `id=in.(${top10Ids.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,thumbnail,duration,audio_url`
        );
        tracks.forEach(t => { trackMap[t.id] = t; });
      }

      // 6. Top lagu
      const topTracksEl = document.getElementById('ppTopTracks');
      if (!top10Ids.length) {
        topTracksEl.innerHTML = '<div class="empty-ti"><i class="fas fa-music"></i>Belum ada data</div>';
      } else {
        topTracksEl.innerHTML = top10Ids.map((id, i) => {
          const t = trackMap[id];
          if (!t) return '';
          const track = typeof rowToTrack === 'function' ? rowToTrack(t, 'db') : t;
          return `<div class="ti" onclick='typeof playTrackObj==="function"&&playTrackObj(${JSON.stringify(track).replace(/"/g,"&quot;")})'>
            <div class="ti-n">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
            <div class="ti-th"><img src="${t.thumbnail||PH_}" onerror="this.src='${PH_}'"></div>
            <div class="ti-inf">
              <div class="ti-t">${_esc(t.title)}</div>
              <div class="ti-a">${_esc(t.artist)}</div>
            </div>
            <div class="ti-dur" style="color:var(--dyn1);font-weight:700;font-size:.72rem">${countMap[id]}×</div>
          </div>`;
        }).filter(Boolean).join('');
      }

      // 7. Top artis
      const artistMap = {};
      top10Ids.forEach(id => {
        const t = trackMap[id]; if (!t) return;
        artistMap[t.artist||'?'] = (artistMap[t.artist||'?'] || 0) + countMap[id];
      });
      const topArtists = Object.entries(artistMap).sort((a,b) => b[1]-a[1]).slice(0,5);
      const artistsEl  = document.getElementById('ppTopArtists');
      artistsEl.innerHTML = topArtists.length
        ? topArtists.map(([name, cnt]) =>
            `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--s2);border:1px solid var(--bd);border-radius:10px">
              <span style="font-size:.82rem;font-weight:600">${_esc(name)}</span>
              <span style="font-size:.72rem;color:var(--dyn1);font-weight:700">${cnt} putar</span>
            </div>`
          ).join('')
        : '<div class="empty-ti"><i class="fas fa-microphone"></i>Belum ada data</div>';

      // 8. Riwayat terakhir (10 terbaru unik)
      const recentEl  = document.getElementById('ppRecentList');
      const seenIds   = new Set();
      const recentIds = history.reduce((acc, h) => {
        if (!seenIds.has(h.track_id) && acc.length < 10) { seenIds.add(h.track_id); acc.push(h); }
        return acc;
      }, []);
      if (!recentIds.length) {
        recentEl.innerHTML = '<div class="empty-ti"><i class="fas fa-history"></i>Belum ada riwayat</div>';
      } else {
        // Ambil detail track yang belum ada di trackMap
        const missingIds = recentIds.map(h => h.track_id).filter(id => !trackMap[id]);
        if (missingIds.length) {
          const more = await sb.get('tracks',
            `id=in.(${missingIds.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,thumbnail,duration,audio_url`
          );
          more.forEach(t => { trackMap[t.id] = t; });
        }
        recentEl.innerHTML = recentIds.map((h, i) => {
          const t = trackMap[h.track_id]; if (!t) return '';
          const track = typeof rowToTrack === 'function' ? rowToTrack(t, 'db') : t;
          const ago   = typeof getTimeAgo === 'function' ? getTimeAgo(h.played_at) : '';
          return `<div class="ti" onclick='typeof playTrackObj==="function"&&playTrackObj(${JSON.stringify(track).replace(/"/g,"&quot;")})'>
            <div class="ti-n">${i+1}</div>
            <div class="ti-th"><img src="${t.thumbnail||PH_}" onerror="this.src='${PH_}'"></div>
            <div class="ti-inf">
              <div class="ti-t">${_esc(t.title)}</div>
              <div class="ti-a">${_esc(t.artist)}</div>
            </div>
            <div class="ti-dur">${ago}</div>
          </div>`;
        }).filter(Boolean).join('');
      }

      // 9. Pin grid
      const pinGrid = document.getElementById('ppPinGrid');
      try {
        const pinRows = await sb.get('user_pins', `user_key=eq.${encodeURIComponent(userKey)}&order=slot.asc`);
        if (!pinRows?.length) {
          pinGrid.innerHTML = '<div style="color:var(--mt);font-size:.75rem;grid-column:1/-1;text-align:center;padding:12px">Belum ada pin</div>';
        } else {
          // Ambil detail track pin
          const pinIds = pinRows.map(p => p.track_id).filter(Boolean);
          let pinTracks = {};
          if (pinIds.length) {
            const pts = await sb.get('tracks', `id=in.(${pinIds.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,thumbnail`);
            pts.forEach(t => { pinTracks[t.id] = t; });
          }
          pinGrid.innerHTML = [0,1,2].map(slot => {
            const pin = pinRows.find(p => p.slot === slot);
            const t   = pin ? pinTracks[pin.track_id] : null;
            if (!t) return `<div class="pin-empty" style="pointer-events:none"><i class="fas fa-music"></i></div>`;
            const track = typeof rowToTrack === 'function' ? rowToTrack(t, 'db') : t;
            return `<div class="pin-card" onclick='typeof playTrackObj==="function"&&playTrackObj(${JSON.stringify(track).replace(/"/g,"&quot;")})'>
              <img src="${t.thumbnail||PH_}" onerror="this.src='${PH_}'" style="width:100%;height:100%;object-fit:cover">
              <div class="pin-overlay">
                <div class="pin-title">${_esc(t.title)}</div>
                <div class="pin-artist">${_esc(t.artist)}</div>
              </div>
            </div>`;
          }).join('');
        }
      } catch(e) {
        pinGrid.innerHTML = '<div style="color:var(--mt);font-size:.75rem;grid-column:1/-1;text-align:center;padding:12px">Pin tidak tersedia</div>';
      }

    } catch(e) {
      console.error('[PublikProfil]', e.message);
      if (typeof toast === 'function') toast('Gagal load profil: ' + e.message);
    }
  }

  // ── Skeleton saat loading ────────────────────────────────
  function _skeleton() {
    ['ppStatPlays','ppStatTracks','ppStatStreak'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '...';
    });
    document.getElementById('ppTopTracks').innerHTML  = '<div class="empty-ti"><i class="fas fa-circle-notch spin"></i></div>';
    document.getElementById('ppTopArtists').innerHTML = '<div class="empty-ti"><i class="fas fa-circle-notch spin"></i></div>';
    document.getElementById('ppRecentList').innerHTML = '<div class="empty-ti"><i class="fas fa-circle-notch spin"></i></div>';
    document.getElementById('ppPinGrid').innerHTML    = '';
  }

  // ── Escape HTML ─────────────────────────────────────────
  function _esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { open, openSelf, close };
})();

// ══════════════════════════════════════════════════════════════
//  PATCH: Override PinAvatar.openPubProfile → pakai PublikProfil
//  (Menggantikan popup sheet yang ada sebelumnya)
// ══════════════════════════════════════════════════════════════
(function patchPubProfileTriggers() {
  function _patch() {
    if (typeof PinAvatar !== 'undefined' && PinAvatar.openPubProfile) {
      PinAvatar.openPubProfile = (userKey, displayName) => PublikProfil.open(userKey, displayName);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _patch);
  } else {
    // PinAvatar mungkin belum di-load, tunggu sebentar
    setTimeout(_patch, 300);
  }
})();

// ══════════════════════════════════════════════════════════════
//  PATCH: Fix loadWrapped() — baca langsung dari play_history
//  bukan dari myPlayCounts / user_play_counts yang sering stale
// ══════════════════════════════════════════════════════════════
(function patchLoadWrapped() {
  // Override fungsi loadWrapped yang ada di index.html
  // Ini dijalankan setelah DOMContentLoaded agar yakin window.loadWrapped sudah ada

  const _fixedLoadWrapped = async function() {
    const _wrPeriod = typeof _wrappedPeriod !== 'undefined' ? _wrappedPeriod : 'month';
    const _PH       = typeof PH !== 'undefined' ? PH : '';
    const _USER_KEY = typeof USER_KEY !== 'undefined' ? USER_KEY : 'guest';

    if (!_USER_KEY || _USER_KEY === 'guest') {
      ['wrTopTracks','wrTopArtists','wrTimeSlot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="wr-empty">Login dulu untuk lihat rekap kamu.</div>';
      });
      return;
    }

    // Skeleton
    ['wrTotalPlays','wrTotalMins','wrUniqTracks','wrStreak'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '...';
    });
    ['wrTopTracks','wrTopArtists','wrTimeSlot'].forEach(id => {
      const el = document.getElementById(id); if (el) el.innerHTML = '<div class="wr-empty">Memuat...</div>';
    });

    try {
      // Tentukan rentang waktu
      const now   = new Date();
      const since = new Date(now);
      if (_wrPeriod === 'month') since.setMonth(now.getMonth() - 1);
      if (_wrPeriod === 'year')  since.setFullYear(now.getFullYear() - 1);
      const sinceISO = _wrPeriod === 'all' ? null : since.toISOString();

      // ── KUNCI FIX: baca langsung dari play_history, BUKAN user_play_counts ──
      const filter = `user_key=eq.${encodeURIComponent(_USER_KEY)}`
        + (sinceISO ? `&played_at=gte.${encodeURIComponent(sinceISO)}` : '')
        + '&select=track_id,played_at,duration_played&order=played_at.desc&limit=2000';

      const history = await sb.get('play_history', filter);

      if (!history.length) {
        ['wrTopTracks','wrTopArtists','wrTimeSlot'].forEach(id => {
          const el = document.getElementById(id); if (el) el.innerHTML = '<div class="wr-empty">Belum ada data di periode ini.</div>';
        });
        ['wrTotalPlays','wrTotalMins','wrUniqTracks','wrStreak'].forEach(id => {
          const el = document.getElementById(id); if (el) el.textContent = '0';
        });
        return;
      }

      // Hitung play count per track — SETIAP ROW = 1 play
      const countMap = {};
      history.forEach(h => {
        if (!h.track_id) return;
        countMap[h.track_id] = (countMap[h.track_id] || 0) + 1;
      });

      const sortedIds   = Object.keys(countMap).sort((a,b) => countMap[b] - countMap[a]);
      const totalPlays  = history.length;
      const uniqTracks  = sortedIds.length;

      // Total menit: duration_played aktual > durasi lagu > 3.5 menit
      let totalSecs = 0;
      const fetchedTrackMap = {};
      const top20Ids = sortedIds.slice(0, 20);

      // Ambil detail track untuk top 20
      if (top20Ids.length) {
        const tracks = await sb.get('tracks',
          `id=in.(${top20Ids.map(id => encodeURIComponent(id)).join(',')})&select=id,title,artist,thumbnail,duration`
        );
        tracks.forEach(t => { fetchedTrackMap[t.id] = t; });
      }

      history.forEach(h => {
        if (h.duration_played && Number(h.duration_played) > 0) {
          totalSecs += Number(h.duration_played);
        } else {
          const t = fetchedTrackMap[h.track_id];
          if (t?.duration && typeof t.duration === 'string' && t.duration.includes(':')) {
            const [m, s] = t.duration.split(':').map(Number);
            totalSecs += (m * 60 + (s || 0));
          } else {
            totalSecs += 210;
          }
        }
      });
      const totalMins = Math.round(totalSecs / 60);

      // Streak
      const localDate = dt => {
        const d = new Date(dt);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      };
      const playDays = new Set(history.map(h => h.played_at ? localDate(h.played_at) : null));
      let streak = 0;
      const _d = new Date();
      while (playDays.has(localDate(_d))) { streak++; _d.setDate(_d.getDate() - 1); }

      // Update stats cards
      const _s = id => document.getElementById(id);
      if (_s('wrTotalPlays')) _s('wrTotalPlays').textContent = totalPlays.toLocaleString('id-ID');
      if (_s('wrTotalMins'))  _s('wrTotalMins').textContent  = totalMins.toLocaleString('id-ID');
      if (_s('wrUniqTracks')) _s('wrUniqTracks').textContent = uniqTracks;
      if (_s('wrStreak'))     _s('wrStreak').textContent     = streak + 'h';

      // Top tracks
      const topTracksEl = _s('wrTopTracks');
      if (topTracksEl) {
        topTracksEl.innerHTML = top20Ids.slice(0, 10).map((id, i) => {
          const t = fetchedTrackMap[id] || {};
          if (!t.title) return '';
          const track = typeof rowToTrack === 'function' ? rowToTrack(t, 'db') : t;
          return `<div class="wr-track-item" onclick='typeof playTrackObj==="function"&&playTrackObj(${JSON.stringify(track).replace(/"/g,"&quot;")})'>
            <div class="wr-track-rank">${i < 3 ? ['🥇','🥈','🥉'][i] : i+1}</div>
            <img class="wr-track-thumb" src="${t.thumbnail||_PH}" onerror="this.src='${_PH}'">
            <div class="wr-track-info">
              <div class="wr-track-title">${t.title||'Unknown'}</div>
              <div class="wr-track-artist">${t.artist||'–'}</div>
            </div>
            <div class="wr-track-cnt">${countMap[id]}×</div>
          </div>`;
        }).filter(Boolean).join('') || '<div class="wr-empty">Tidak ada data track.</div>';
      }

      // Top artis
      const artistMap = {};
      top20Ids.forEach(id => {
        const t = fetchedTrackMap[id]; if (!t) return;
        const a = t.artist || 'Unknown';
        artistMap[a] = (artistMap[a] || 0) + countMap[id];
      });
      const topArtists = Object.entries(artistMap).sort((a,b) => b[1]-a[1]).slice(0,7);
      const artistsEl  = _s('wrTopArtists');
      if (artistsEl) {
        artistsEl.innerHTML = topArtists.length
          ? topArtists.map(([name, cnt]) =>
              `<div class="wr-artist-item">
                <div class="wr-artist-name">${name}</div>
                <div class="wr-artist-cnt">${cnt} putar</div>
              </div>`
            ).join('')
          : '<div class="wr-empty">Tidak ada data artis.</div>';
      }

      // Waktu favorit
      const slots = { 'Tengah Malam': 0, 'Dini Hari': 0, 'Pagi': 0, 'Siang': 0, 'Sore': 0, 'Malam': 0 };
      history.forEach(h => {
        if (!h.played_at) return;
        const hr = new Date(h.played_at).getHours();
        if (hr < 4) slots['Tengah Malam']++;
        else if (hr < 8)  slots['Dini Hari']++;
        else if (hr < 12) slots['Pagi']++;
        else if (hr < 16) slots['Siang']++;
        else if (hr < 20) slots['Sore']++;
        else              slots['Malam']++;
      });
      const maxSlot = Math.max(...Object.values(slots), 1);
      const tsEl = _s('wrTimeSlot');
      if (tsEl) {
        tsEl.innerHTML = Object.entries(slots).map(([lbl, cnt]) =>
          `<div class="wr-ts-row">
            <div class="wr-ts-lbl">${lbl}</div>
            <div class="wr-ts-bar-wrap"><div class="wr-ts-bar" style="width:${Math.round(cnt/maxSlot*100)}%"></div></div>
            <div class="wr-ts-cnt">${cnt}</div>
          </div>`
        ).join('');
      }

    } catch(e) {
      if (typeof toast === 'function') toast('Gagal load rekap: ' + e.message);
    }
  };

  // Override setelah DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.loadWrapped = _fixedLoadWrapped; });
  } else {
    window.loadWrapped = _fixedLoadWrapped;
  }
})();
