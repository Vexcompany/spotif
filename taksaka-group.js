// ════════════════════════════════════════════════════════════════
//  taksaka-group.js — Orkestrator Grup Taksaka
//  Mengelola: storage, mode, song search, render UI, auth token
//  Depends on: kaktaksaka.js, doktertaksaka.js, api-downloader.js
// ════════════════════════════════════════════════════════════════

const TaksakaGroup = (() => {

  // ── Config — ganti setelah deploy ─────────────────────────
  const AI_BACKEND_URL = 'https://vanz-xi.vercel.app'; // URL backend ey-ay kamu

  // theresav endpoint (dari api-downloader.js)
  const THERESAV_ENDPOINT  = 'https://api.theresav.biz.id/download/applemusic';
  const THERESAV_APIKEY    = 'FKbI4';

  // ── State ──────────────────────────────────────────────────
  let _msgs      = [];   // array message objects
  let _mode      = 'bergantian'; // 'kak' | 'dokter' | 'bergantian'
  let _turnCount = 0;    // untuk bergantian
  let _aiToken   = null; // JWT token dari ey-ay backend
  let _tokenExp  = 0;    // expiry epoch ms

  // ── Storage key (per-user) ─────────────────────────────────
  const _storageKey = () => {
    try {
      const sess = JSON.parse(localStorage.getItem('pgsk_v2_session') || 'null');
      const ukey = sess ? `${sess.nama}_${sess.generasi}` : 'guest';
      return `pgsk_taksaka_v2_${ukey}`;
    } catch { return 'pgsk_taksaka_v2_guest'; }
  };

  // ── Load/Save messages ─────────────────────────────────────
  function _load() {
    try { _msgs = JSON.parse(localStorage.getItem(_storageKey()) || '[]'); }
    catch { _msgs = []; }
  }

  function _save() {
    try { localStorage.setItem(_storageKey(), JSON.stringify(_msgs.slice(-100))); }
    catch { /* storage penuh */ }
  }

  // ── Auth token ke ey-ay backend ────────────────────────────
  async function _ensureToken() {
    if (_aiToken && Date.now() < _tokenExp - 60000) return _aiToken;

    // Cek localStorage
    const cached = localStorage.getItem('_pgsk_ai_token');
    if (cached) {
      try {
        const payload = JSON.parse(atob(cached.split('.')[1]));
        if (payload.exp * 1000 > Date.now() + 60000) {
          _aiToken   = cached;
          _tokenExp  = payload.exp * 1000;
          return cached;
        }
      } catch { /* expired/invalid */ }
    }

    // Re-login pakai session yang ada
    try {
      const sess = JSON.parse(localStorage.getItem('pgsk_v2_session') || 'null');
      if (!sess?.nama || !sess?.jabatan || !sess?.generasi) return null;

      const r = await fetch(`${AI_BACKEND_URL}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: sess.nama, jabatan: sess.jabatan, generasi: sess.generasi })
      });
      if (!r.ok) return null;
      const d = await r.json();
      if (d.token) {
        _aiToken = d.token;
        try {
          const p = JSON.parse(atob(d.token.split('.')[1]));
          _tokenExp = p.exp * 1000;
        } catch { _tokenExp = Date.now() + 86400000; }
        localStorage.setItem('_pgsk_ai_token', d.token);
        return d.token;
      }
    } catch { /* network error */ }
    return null;
  }

  // ── Siapa yang menjawab sekarang ───────────────────────────
  function _whoAnswers(userMsg) {
    if (_mode === 'kak')    return KakTaksaka;
    if (_mode === 'dokter') return DokterTaksaka;

    // Mode bergantian: Dokter prioritas jika mood sad/stress/lonely
    const kakMood = KakTaksaka.detectMood(userMsg);
    const docMood = DokterTaksaka.detectMood(userMsg);
    if (docMood === 'sad' || docMood === 'stress' || docMood === 'lonely') {
      return DokterTaksaka;
    }
    // Bergantian normal
    _turnCount++;
    return _turnCount % 2 === 1 ? DokterTaksaka : KakTaksaka;
  }

  // ── Cari lagu via theresav (sesuai mood) ───────────────────
  async function _fetchSongByMood(mood) {
    const moodQuery = {
      happy:   'lagu semangat happy indonesia',
      sad:     'lagu sedih galau sendu',
      stress:  'lagu menenangkan relaksasi santai',
      excited: 'lagu hype energik semangat',
      lonely:  'lagu teman setia malam',
      healing: 'lagu healing menenangkan jiwa',
      default: 'lagu populer indonesia'
    };
    const q = moodQuery[mood] || moodQuery.default;

    // 1. Coba cari dari database Supabase dulu (sudah ter-stream, langsung play)
    try {
      const sbUrl = window.SB_URL || '';
      const sbKey = window.SB_KEY || '';
      if (sbUrl && sbKey) {
        const keyword = q.split(' ').slice(0, 2).join('+');
        const res = await fetch(
          `${sbUrl}/rest/v1/tracks?search_query=ilike.*${encodeURIComponent(keyword)}*&order=play_count.desc&limit=8`,
          { headers: { apikey: sbKey, Authorization: 'Bearer ' + sbKey } }
        );
        const rows = res.ok ? await res.json() : [];
        if (rows?.length) {
          const pick = rows[Math.floor(Math.random() * Math.min(4, rows.length))];
          if (pick.audio_url) return {
            title:     pick.title,
            artist:    pick.artist,
            thumbnail: pick.thumbnail || null,
            audioUrl:  pick.audio_url,
            appleUrl:  pick.apple_url || null,
            trackId:   pick.id,
            source:    'db'
          };
        }
      }
    } catch { /* lanjut ke theresav */ }

    // 2. Tidak ada di DB? Tidak bisa search theresav tanpa Apple URL — return null
    // (theresav butuh Apple Music URL, bukan keyword search)
    return null;
  }

  // ── Render card lagu (shared, dipanggil dari kaktaksaka/doktertaksaka) ──
  function renderSongCard(track) {
    const thumb = track.thumbnail
      ? `<img src="${track.thumbnail}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:7px;object-fit:cover;flex-shrink:0">`
      : `<div style="width:36px;height:36px;border-radius:7px;background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-music" style="font-size:.7rem;color:var(--mt)"></i></div>`;

    const trackEnc = encodeURIComponent(JSON.stringify(track));
    return `<div class="msg-track" onclick="TaksakaGroup.playAISong('${trackEnc}')" style="margin-bottom:6px">
      ${thumb}
      <div class="msg-track-inf">
        <div class="msg-track-t">${_esc(track.title)}</div>
        <div class="msg-track-a">${_esc(track.artist)}</div>
        <div class="msg-track-play"><i class="fas fa-play-circle"></i> Tap untuk putar</div>
      </div>
    </div>`;
  }

  // ── Format waktu ───────────────────────────────────────────
  function fmtTime(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  // ── Escape HTML ────────────────────────────────────────────
  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Render semua messages ──────────────────────────────────
  function _renderMsgs() {
    const el = document.getElementById('aiMessages');
    if (!el) return;

    if (!_msgs.length) {
      // Tampilkan welcome dari kedua AI
      el.innerHTML = `<div style="padding:16px">
        ${KakTaksaka.renderWelcome()}
        <div style="height:1px;background:var(--bd);margin:12px 0"></div>
        ${DokterTaksaka.renderWelcome()}
      </div>`;
      return;
    }

    el.innerHTML = _msgs.map(m => {
      if (m.role === 'user') {
        return `<div class="msg-wrap me">
          <div class="msg-bubble">${_esc(m.content)}</div>
          <div class="msg-time">${fmtTime(m.ts)}</div>
        </div>`;
      }
      // AI bubble — dispatch ke persona yang tepat
      if (m.persona === 'kak') return KakTaksaka.renderBubble(m);
      if (m.persona === 'dokter') return DokterTaksaka.renderBubble(m);
      return '';
    }).join('');

    el.scrollTop = el.scrollHeight;
  }

  // ── Update tab UI ──────────────────────────────────────────
  function _updateTabs() {
    const tabContainer = document.getElementById('taksakaTabRow');
    if (!tabContainer) return;
    tabContainer.innerHTML =
      KakTaksaka.renderTabBtn(_mode === 'kak') +
      DokterTaksaka.renderTabBtn(_mode === 'dokter') +
      `<button id="tabBergantian" onclick="TaksakaGroup.setMode('bergantian')" style="flex:1;padding:5px 8px;border-radius:8px;border:1px solid;font-size:.65rem;font-weight:700;cursor:pointer;transition:all .2s;${_mode==='bergantian'?'border-color:rgba(255,255,255,.3);background:var(--s3);color:var(--tx)':'border-color:var(--bd);background:var(--s2);color:var(--mt)'}">
        <i class="fas fa-layer-group" style="margin-right:4px"></i>Bergantian
      </button>`;
    // Update placeholder
    const inp = document.getElementById('aiChatInput');
    if (inp) inp.placeholder = _mode === 'kak'
      ? KakTaksaka.PERSONA.placeholder
      : _mode === 'dokter'
      ? DokterTaksaka.PERSONA.placeholder
      : 'Cerita ke Kak atau Dokter Taksaka...';
  }

  // ── Update preview di chat list ────────────────────────────
  function _updatePreview(persona, text) {
    const el = document.getElementById('taksakaGroupPreview');
    if (!el) return;
    const prefix = persona === 'kak' ? '😊 Kak: ' : '🩺 Dok: ';
    el.textContent = prefix + text.slice(0, 55) + (text.length > 55 ? '...' : '');
  }

  // ── PUBLIC: open/close grup ────────────────────────────────
  function open() {
    _load();
    document.getElementById('aiChatRoom')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    _updateTabs();
    _renderMsgs();
    document.getElementById('aiChatInput')?.focus();
    // Reset unread badge
    const badge = document.getElementById('taksakaUnreadBadge');
    if (badge) badge.style.display = 'none';
  }

  function close() {
    document.getElementById('aiChatRoom')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── PUBLIC: set mode ───────────────────────────────────────
  function setMode(mode) {
    _mode = mode;
    _updateTabs();
  }

  // ── PUBLIC: kirim pesan ────────────────────────────────────
  async function send() {
    const input = document.getElementById('aiChatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    const btn = document.getElementById('aiSendBtn');
    if (btn) btn.disabled = true;
    input.value = '';
    input.style.height = '42px';

    _load();
    _msgs.push({ role: 'user', content: msg, ts: new Date().toISOString() });
    _save();
    _renderMsgs();

    // Tentukan siapa yang jawab
    const persona = _whoAnswers(msg);
    const pid = persona.PERSONA.id;
    const pColor = persona.PERSONA.color;
    const pInits = persona.PERSONA.initials;

    // Typing indicator
    const el    = document.getElementById('aiMessages');
    const typId = 'taksTyping_' + Date.now();
    if (el) {
      el.innerHTML += `<div class="msg-wrap them" id="${typId}">
        <div style="display:flex;align-items:flex-end;gap:6px">
          ${persona.renderAvatar(24)}
          <div>
            <div style="font-size:.6rem;color:${pColor};font-weight:700;margin-bottom:3px">${persona.PERSONA.name}</div>
            <div class="msg-bubble" style="opacity:.6;border-left:2px solid ${pColor}40"><i class="fas fa-circle-notch spin"></i> Sedang mengetik...</div>
          </div>
        </div>
      </div>`;
      el.scrollTop = el.scrollHeight;
    }

    try {
      const token = await _ensureToken();
      const rawReply = await persona.callAI(msg, token, AI_BACKEND_URL);

      // Extract [SEND_SONG] tag jika ada
      const { cleanText, mood } = persona.extractSongTag(rawReply);

      // Cari lagu jika ada mood tag
      let song = null;
      if (mood) {
        song = await _fetchSongByMood(mood);
      }

      document.getElementById(typId)?.remove();

      _load();
      const msgObj = {
        role: 'assistant', persona: pid,
        content: cleanText, ts: new Date().toISOString()
      };
      if (song) msgObj.song = song;
      _msgs.push(msgObj);
      _save();
      _updatePreview(pid, cleanText);

    } catch (err) {
      document.getElementById(typId)?.remove();
      _load();
      _msgs.push({
        role: 'assistant', persona: pid,
        content: `⚠️ ${err.message || 'AI tidak dapat dihubungi saat ini.'}`,
        ts: new Date().toISOString()
      });
      _save();
    }

    if (btn) btn.disabled = false;
    _renderMsgs();
  }

  // ── PUBLIC: clear chat ─────────────────────────────────────
  function clear() {
    if (!confirm('Hapus semua riwayat chat dengan Kak & Dokter Taksaka?')) return;
    _msgs = [];
    _save();
    localStorage.removeItem('_pgsk_ai_token');
    _aiToken  = null;
    _tokenExp = 0;
    _renderMsgs();
    const el = document.getElementById('taksakaGroupPreview');
    if (el) el.textContent = 'Kak Taksaka & Dokter Taksaka siap membantu...';
  }

  // ── PUBLIC: play lagu dari AI ──────────────────────────────
  async function playAISong(encoded) {
    try {
      const track = JSON.parse(decodeURIComponent(encoded));
      if (!track.audioUrl) { toast('⚠️ URL audio tidak tersedia'); return; }
      const t = {
        id:        track.trackId || ('ai_' + Date.now()),
        title:     track.title,
        artist:    track.artist,
        thumbnail: track.thumbnail || '',
        audio:     track.audioUrl,
        source:    track.source || 'ai'
      };
      if (typeof addToQueue === 'function') addToQueue(t);
      if (typeof playTrackObj === 'function') await playTrackObj(t);
    } catch (e) {
      if (typeof toast === 'function') toast('❌ Gagal memutar: ' + e.message);
    }
  }

  // ── PUBLIC: keyboard handler ───────────────────────────────
  function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  // ── Expose ke window untuk dipanggil dari HTML ─────────────
  return {
    open, close, setMode, send, clear, onKeydown, playAISong,
    renderSongCard, fmtTime,
    get mode() { return _mode; }
  };

})();

window.TaksakaGroup = TaksakaGroup;
