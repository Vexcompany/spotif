// ════════════════════════════════════════════════════════════════
//  taksaka-group.js  — Grup Taksaka AI (Kak + Dokter Taksaka)
//  Self-contained: auth ke ey-ay, 2 persona, mood, song, render
//  Diload setelah index.html — pakai SB_URL, SB_KEY, USER_KEY
//  yang sudah dideclare di index.html
// ════════════════════════════════════════════════════════════════

const TaksakaGroup = (() => {

  // ── ⚙️  CONFIG — ganti AI_URL setelah deploy ey-ay ─────────
  const AI_URL = 'https://ey-ay-neon.vercel.app'; // URL backend ey-ay

  // ── 🎭 PERSONA DEFINITIONS ──────────────────────────────────
  const PERSONAS = {
    kak: {
      id:       'kak',
      key:      'taksaka',            // key untuk getPersona() di ey-ay
      name:     'Kak Taksaka',
      initials: 'KT',
      color:    '#1DB954',
      colorAlt: '#17a348',
      grad:     'linear-gradient(135deg,#1DB954,#17a348)',
      icon:     'fas fa-user-friends',
      ph:       'Ngobrol atau tanya ke Kak Taksaka...',
      // System prompt tambahan — dikirim sebagai bagian pesan pertama kalau backend support
      hint: `Kamu Kak Taksaka — AI santai Pagaska. Kalau kamu mau kirim lagu sesuai suasana user, tambahkan tag [SEND_SONG:mood=happy] atau [SEND_SONG:mood=sad] atau [SEND_SONG:mood=stress] atau [SEND_SONG:mood=excited] atau [SEND_SONG:mood=lonely] di akhir responmu (opsional, jangan tiap pesan).`
    },
    dokter: {
      id:       'dokter',
      key:      'dokter',             // key untuk getPersona() di ey-ay
      name:     'Dokter Taksaka',
      initials: 'DT',
      color:    '#a78bfa',
      colorAlt: '#7c5cbf',
      grad:     'linear-gradient(135deg,#7c5cbf,#5a3fa0)',
      icon:     'fas fa-user-md',
      ph:       'Cerita ke Dokter Taksaka, aku dengerin...',
      hint: `Kamu Dokter Taksaka — AI empatik Pagaska untuk support emosional. Kalau kamu mau menemani user dengan musik, tambahkan tag [SEND_SONG:mood=sad] atau [SEND_SONG:mood=stress] atau [SEND_SONG:mood=lonely] atau [SEND_SONG:mood=healing] di akhir responmu (opsional).`
    }
  };

  // ── 🧠 STATE ─────────────────────────────────────────────────
  let _msgs      = [];
  let _mode      = 'bergantian';  // 'kak' | 'dokter' | 'bergantian'
  let _turn      = 0;
  let _token     = null;
  let _tokenExp  = 0;

  // ── 🔑 STORAGE KEY (per-user) ────────────────────────────────
  function _storeKey() {
    // USER_KEY dideclare di index.html — fallback ke SESS kalau belum ada
    try {
      const uk = (typeof USER_KEY !== 'undefined' && USER_KEY) ? USER_KEY : _sessKey();
      return `pgsk_taksaka_v2_${uk}`;
    } catch { return 'pgsk_taksaka_v2_guest'; }
  }

  function _sessKey() {
    try {
      const s = JSON.parse(localStorage.getItem('pgsk_v2_session') || 'null');
      return s ? `${s.nama}_${s.generasi}` : 'guest';
    } catch { return 'guest'; }
  }

  function _loadMsgs() {
    try { _msgs = JSON.parse(localStorage.getItem(_storeKey()) || '[]'); }
    catch { _msgs = []; }
  }

  function _saveMsgs() {
    try { localStorage.setItem(_storeKey(), JSON.stringify(_msgs.slice(-100))); }
    catch { /* storage penuh */ }
  }

  // ── 🔐 AUTH — login ke ey-ay backend, simpan JWT ─────────────
  async function _ensureToken() {
    // Masih valid?
    if (_token && Date.now() < _tokenExp - 60000) return _token;

    // Cek localStorage cache
    const cached = localStorage.getItem('_pgsk_ai_jwt');
    if (cached) {
      try {
        const p = JSON.parse(atob(cached.split('.')[1]));
        if (p.exp * 1000 > Date.now() + 60000) {
          _token    = cached;
          _tokenExp = p.exp * 1000;
          return cached;
        }
      } catch { /* expired */ }
    }

    // Ambil session dari localStorage (disimpan login.html)
    let sess = null;
    try { sess = JSON.parse(localStorage.getItem('pgsk_v2_session') || 'null'); } catch {}

    if (!sess?.nama || !sess?.jabatan || !sess?.generasi) {
      throw new Error('Silakan login dulu ke Pagaska Music ya!');
    }

    // Hit /api/auth/login di ey-ay
    const r = await fetch(`${AI_URL}/api/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama:     sess.nama,
        jabatan:  sess.jabatan,
        generasi: sess.generasi
      })
    });

    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Login AI gagal. Coba refresh halaman.');

    _token = d.token;
    try {
      const p = JSON.parse(atob(d.token.split('.')[1]));
      _tokenExp = p.exp * 1000;
    } catch { _tokenExp = Date.now() + 604800000; } // 7 hari fallback

    localStorage.setItem('_pgsk_ai_jwt', d.token);
    return d.token;
  }

  // ── 🎯 SIAPA YANG JAWAB ──────────────────────────────────────
  function _whoAnswers(userMsg) {
    if (_mode === 'kak')    return PERSONAS.kak;
    if (_mode === 'dokter') return PERSONAS.dokter;

    // Bergantian — Dokter prioritas kalau deteksi mood negatif
    const t = userMsg.toLowerCase();
    const isNegative = /sedih|nangis|galau|patah hati|kecewa|stress|capek|lelah|bosen|jenuh|penat|sendiri|sepi|lonely|takut|cemas|panik|khawatir|gelisah|bingung|hilang arah|overwhelm/.test(t);
    if (isNegative) return PERSONAS.dokter;

    _turn++;
    return _turn % 2 === 1 ? PERSONAS.dokter : PERSONAS.kak;
  }

  // ── 🎵 DETEKSI MOOD ──────────────────────────────────────────
  function _detectMood(text) {
    const t = text.toLowerCase();
    if (/senang|bahagia|happy|yeay|asik|seru|gembira|excited|hore|yey/.test(t))            return 'happy';
    if (/sedih|nangis|galau|patah hati|sakit hati|kecewa|down|menangis/.test(t))            return 'sad';
    if (/stress|capek|lelah|bosen|jenuh|penat|pusing|overwhelm|takut|cemas|panik|gelisah/.test(t)) return 'stress';
    if (/semangat|bangkit|kuat|gaspol|gas|hype/.test(t))                                    return 'excited';
    if (/sendiri|sepi|lonely|ditinggal|ga ada yang/.test(t))                                return 'lonely';
    if (/sembuh|baikan|pulih|lega|mendingan|alhamdulillah/.test(t))                         return 'healing';
    return null;
  }

  // ── 🎵 EXTRACT [SEND_SONG] TAG dari reply AI ────────────────
  function _extractSong(text) {
    const m = text.match(/\[SEND_SONG:mood=(\w+)\]/);
    return m
      ? { clean: text.replace(/\s*\[SEND_SONG:mood=\w+\]/, '').trim(), mood: m[1] }
      : { clean: text, mood: null };
  }

  // ── 🎵 CARI LAGU DARI SUPABASE SESUAI MOOD ──────────────────
  async function _fetchSong(mood) {
    const kwMap = {
      happy:   ['semangat','happy','gembira','ceria'],
      sad:     ['sedih','galau','rindu','sendu'],
      stress:  ['santai','tenang','relax','instrumental'],
      excited: ['hype','energik','upbeat','semangat'],
      lonely:  ['teman','malam','sendiri','sunyi'],
      healing: ['healing','damai','lembut','menenangkan'],
    };

    const kws = kwMap[mood] || ['populer','indonesia'];
    // Coba beberapa keyword sampai dapat hasil
    for (const kw of kws) {
      try {
        const sbUrl = (typeof SB_URL !== 'undefined') ? SB_URL : '';
        const sbKey = (typeof SB_KEY !== 'undefined') ? SB_KEY : '';
        if (!sbUrl || !sbKey) break;

        const res = await fetch(
          `${sbUrl}/rest/v1/tracks?or=(title.ilike.*${encodeURIComponent(kw)}*,artist.ilike.*${encodeURIComponent(kw)}*)&order=play_count.desc&limit=8`,
          { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
        );
        if (!res.ok) continue;
        const rows = await res.json();
        if (!rows?.length) continue;

        // Filter yang punya audio_url
        const valid = rows.filter(r => r.audio_url);
        if (!valid.length) continue;

        const pick = valid[Math.floor(Math.random() * Math.min(3, valid.length))];
        return {
          title:     pick.title     || 'Unknown',
          artist:    pick.artist    || 'Unknown',
          thumbnail: pick.thumbnail || null,
          audioUrl:  pick.audio_url,
          trackId:   pick.id || ('db_' + Date.now()),
          source:    'db'
        };
      } catch { continue; }
    }
    return null; // tidak ada lagu
  }

  // ── 🎨 RENDER HELPERS ────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _time(ts) {
    try { return new Date(ts).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); }
    catch { return ''; }
  }

  function _avatar(p, size) {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${p.grad};display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.28)}px;font-weight:800;color:#fff;flex-shrink:0">${p.initials}</div>`;
  }

  function _songCard(song) {
    const enc   = encodeURIComponent(JSON.stringify(song));
    const thumb = song.thumbnail
      ? `<img src="${_esc(song.thumbnail)}" onerror="this.style.display='none'" style="width:38px;height:38px;border-radius:7px;object-fit:cover;flex-shrink:0">`
      : `<div style="width:38px;height:38px;border-radius:7px;background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-music" style="font-size:.7rem;color:var(--mt)"></i></div>`;
    return `<div onclick="TaksakaGroup.playSong('${enc}')" style="display:flex;gap:9px;align-items:center;background:rgba(255,255,255,.06);border:1px solid var(--bd);border-radius:10px;padding:8px 10px;margin-bottom:7px;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='rgba(255,255,255,.11)'" onmouseleave="this.style.background='rgba(255,255,255,.06)'">
      ${thumb}
      <div style="flex:1;min-width:0">
        <div style="font-size:.75rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(song.title)}</div>
        <div style="font-size:.65rem;color:var(--mt);margin-top:1px">${_esc(song.artist)}</div>
        <div style="font-size:.6rem;color:var(--g);margin-top:2px"><i class="fas fa-play-circle" style="margin-right:3px"></i>Tap untuk putar</div>
      </div>
    </div>`;
  }

  // ── 🖼️ RENDER SELURUH MESSAGES ───────────────────────────────
  function _render() {
    const el = document.getElementById('aiMessages');
    if (!el) return;

    if (!_msgs.length) {
      el.innerHTML = `<div style="padding:20px 16px">
        <!-- Welcome Kak -->
        <div style="text-align:center;padding:20px 12px 14px;background:rgba(29,185,84,.05);border:1px solid rgba(29,185,84,.12);border-radius:14px;margin-bottom:10px">
          ${_avatar(PERSONAS.kak,44)}
          <div style="font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;margin:8px 0 4px">${PERSONAS.kak.name} 😊</div>
          <div style="font-size:.72rem;color:var(--mt);line-height:1.7">Hai! Aku Kak Taksaka, AI-nya Pagaska.<br>Mau ngobrol, nanya, atau butuh bantuan apa?<br><span style="font-size:.67rem;opacity:.65">Aku juga bisa kirim lagu sesuai suasana hatimu 🎵</span></div>
        </div>
        <!-- Welcome Dokter -->
        <div style="text-align:center;padding:20px 12px 14px;background:rgba(124,92,191,.05);border:1px solid rgba(124,92,191,.12);border-radius:14px">
          ${_avatar(PERSONAS.dokter,44)}
          <div style="font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;margin:8px 0 4px">${PERSONAS.dokter.name} 🩺</div>
          <div style="font-size:.72rem;color:var(--mt);line-height:1.7">Hei, aku Dokter Taksaka.<br>Cerita aja apa yang kamu rasakan, aku siap dengerin.<br><span style="font-size:.67rem;opacity:.65">Aku juga bisa kirim lagu yang sesuai suasana hatimu 🎵</span></div>
        </div>
      </div>`;
      return;
    }

    el.innerHTML = _msgs.map(m => {
      if (m.role === 'user') {
        return `<div class="msg-wrap me">
          <div class="msg-bubble">${_esc(m.content)}</div>
          <div class="msg-time">${_time(m.ts)}</div>
        </div>`;
      }
      const p = PERSONAS[m.persona] || PERSONAS.kak;
      const songHtml = m.song ? _songCard(m.song) : '';
      return `<div class="msg-wrap them">
        <div style="display:flex;align-items:flex-end;gap:6px">
          ${_avatar(p, 24)}
          <div style="flex:1;min-width:0">
            <div style="font-size:.6rem;color:${p.color};font-weight:700;margin-bottom:3px">${p.name}</div>
            <div class="msg-bubble" style="border-left:2px solid ${p.color}40">${songHtml}<span style="white-space:pre-wrap">${_esc(m.content)}</span></div>
          </div>
        </div>
        <div class="msg-time" style="margin-left:30px">${_time(m.ts)}</div>
      </div>`;
    }).join('');

    el.scrollTop = el.scrollHeight;
  }

  // ── 🎛️ UPDATE TABS ────────────────────────────────────────────
  function _updateTabs() {
    const row = document.getElementById('taksakaTabRow');
    if (!row) return;

    const tabs = [
      { key: 'kak',        p: PERSONAS.kak,    label: PERSONAS.kak.name    },
      { key: 'dokter',     p: PERSONAS.dokter, label: PERSONAS.dokter.name },
      { key: 'bergantian', p: null,            label: 'Bergantian',  icon: 'fas fa-layer-group', color: 'var(--tx)', border: 'rgba(255,255,255,.3)', bg: 'var(--s3)' }
    ];

    row.innerHTML = tabs.map(t => {
      const active = _mode === t.key;
      const color  = active ? (t.p?.color || t.color || 'var(--tx)') : 'var(--mt)';
      const border = active ? (t.p ? `rgba(${t.key==='kak'?'29,185,84':'167,139,250'},.45)` : t.border) : 'var(--bd)';
      const bg     = active ? (t.p ? `rgba(${t.key==='kak'?'29,185,84':'124,92,191'},.13)` : t.bg) : 'var(--s2)';
      const icon   = t.p ? t.p.icon : t.icon;
      return `<button onclick="TaksakaGroup.setMode('${t.key}')" style="flex:1;padding:5px 6px;border-radius:8px;border:1px solid ${border};background:${bg};color:${color};font-size:.62rem;font-weight:700;cursor:pointer;transition:all .18s">
        <i class="${icon}" style="margin-right:3px"></i>${t.label}
      </button>`;
    }).join('');

    // Update placeholder input
    const inp = document.getElementById('aiChatInput');
    if (inp) inp.placeholder = _mode === 'kak' ? PERSONAS.kak.ph : _mode === 'dokter' ? PERSONAS.dokter.ph : 'Cerita ke Kak atau Dokter Taksaka...';
  }

  // ── 📋 UPDATE PREVIEW DI CHAT LIST ───────────────────────────
  function _updatePreview(persona, text) {
    const el = document.getElementById('taksakaGroupPreview');
    if (!el) return;
    const pfx = persona === 'kak' ? '😊 Kak: ' : '🩺 Dok: ';
    el.textContent = pfx + text.slice(0, 55) + (text.length > 55 ? '...' : '');
  }

  // ── 📞 CALL AI BACKEND ────────────────────────────────────────
  async function _callAI(persona, message, token) {
    const res = await fetch(`${AI_URL}/api/chat/gemini`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: `${persona.hint}\n\n${message}`,
        persona: persona.key
      })
    });
    const d = await res.json();
    if (!res.ok) {
      // Token expired? Hapus cache lalu retry sekali
      if (res.status === 401) {
        localStorage.removeItem('_pgsk_ai_jwt');
        _token = null; _tokenExp = 0;
        throw new Error('Token expired — silakan kirim ulang pesanmu.');
      }
      throw new Error(d.error || `AI error ${res.status}`);
    }
    return d.reply || d.message || 'Maaf, tidak ada respons.';
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════

  /** Buka chat room grup */
  function open() {
    _loadMsgs();
    document.getElementById('aiChatRoom')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    _updateTabs();
    _render();
    setTimeout(() => document.getElementById('aiChatInput')?.focus(), 100);
    // Reset unread badge
    const badge = document.getElementById('taksakaUnreadBadge');
    if (badge) badge.style.display = 'none';
  }

  /** Tutup chat room */
  function close() {
    document.getElementById('aiChatRoom')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /** Ganti mode: 'kak' | 'dokter' | 'bergantian' */
  function setMode(m) {
    _mode = m;
    _updateTabs();
  }

  /** Kirim pesan */
  async function send() {
    const input = document.getElementById('aiChatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    const btn = document.getElementById('aiSendBtn');
    if (btn) btn.disabled = true;
    input.value = '';
    input.style.height = '42px';

    // Simpan pesan user
    _loadMsgs();
    _msgs.push({ role: 'user', content: msg, ts: new Date().toISOString() });
    _saveMsgs();
    _render();

    // Tentukan persona
    const persona = _whoAnswers(msg);

    // Typing indicator
    const el    = document.getElementById('aiMessages');
    const typId = `ttyp_${Date.now()}`;
    if (el) {
      el.innerHTML += `<div class="msg-wrap them" id="${typId}">
        <div style="display:flex;align-items:flex-end;gap:6px">
          ${_avatar(persona, 24)}
          <div>
            <div style="font-size:.6rem;color:${persona.color};font-weight:700;margin-bottom:3px">${persona.name}</div>
            <div class="msg-bubble" style="opacity:.55;border-left:2px solid ${persona.color}40">
              <i class="fas fa-circle-notch spin" style="margin-right:5px"></i>Sedang mengetik...
            </div>
          </div>
        </div>
      </div>`;
      el.scrollTop = el.scrollHeight;
    }

    try {
      // Auth
      const token = await _ensureToken();

      // Panggil AI
      const raw = await _callAI(persona, msg, token);

      // Extract [SEND_SONG] tag
      const { clean, mood: aiMood } = _extractSong(raw);

      // Fallback mood detection dari pesan user kalau AI tidak kasih tag
      const detectedMood = aiMood || _detectMood(msg);

      // Cari lagu hanya kalau ada mood (AI minta atau user detect)
      let song = null;
      if (detectedMood) song = await _fetchSong(detectedMood);

      document.getElementById(typId)?.remove();

      _loadMsgs();
      const entry = { role: 'assistant', persona: persona.id, content: clean, ts: new Date().toISOString() };
      if (song) entry.song = song;
      _msgs.push(entry);
      _saveMsgs();
      _updatePreview(persona.id, clean);

    } catch (err) {
      document.getElementById(typId)?.remove();
      _loadMsgs();
      _msgs.push({
        role: 'assistant', persona: persona.id,
        content: `⚠️ ${err.message || 'AI tidak dapat dihubungi saat ini.'}`,
        ts: new Date().toISOString()
      });
      _saveMsgs();
    }

    if (btn) btn.disabled = false;
    _render();
  }

  /** Hapus semua riwayat chat */
  function clear() {
    if (!confirm('Hapus semua riwayat chat dengan Kak & Dokter Taksaka?')) return;
    _msgs = []; _saveMsgs();
    localStorage.removeItem('_pgsk_ai_jwt');
    _token = null; _tokenExp = 0; _turn = 0;
    _render();
    const el = document.getElementById('taksakaGroupPreview');
    if (el) el.textContent = 'Kak Taksaka & Dokter Taksaka siap membantu...';
  }

  /** Play lagu yang dikirim AI */
  async function playSong(encoded) {
    try {
      const song = JSON.parse(decodeURIComponent(encoded));
      if (!song.audioUrl) { if (typeof toast === 'function') toast('⚠️ Audio tidak tersedia'); return; }
      const t = {
        id:        song.trackId || ('ai_' + Date.now()),
        title:     song.title,
        artist:    song.artist,
        thumbnail: song.thumbnail || '',
        audio:     song.audioUrl,
        source:    'ai'
      };
      if (typeof addToQueue    === 'function') addToQueue(t);
      if (typeof playTrackObj  === 'function') await playTrackObj(t);
    } catch(e) {
      if (typeof toast === 'function') toast('❌ Gagal memutar: ' + e.message);
    }
  }

  /** Keyboard handler untuk textarea */
  function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return { open, close, setMode, send, clear, playSong, onKeydown };

})();

window.TaksakaGroup = TaksakaGroup;

// Legacy compat — kalau ada bagian lain di index.html yang masih panggil ini
window.openAIChat  = () => TaksakaGroup.open();
window.closeAIChat = () => TaksakaGroup.close();
window.clearAIChat = () => TaksakaGroup.clear();
