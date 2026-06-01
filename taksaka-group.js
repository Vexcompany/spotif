// ════════════════════════════════════════════════════════════════
//  taksaka-group.js  — Grup Taksaka AI (Kak + Dokter Taksaka)
//  UPDATE #1: Fix bergantian (keduanya jawab) + Markdown render
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
    if (_token && Date.now() < _tokenExp - 60000) return _token;

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

    let sess = null;
    try { sess = JSON.parse(localStorage.getItem('pgsk_v2_session') || 'null'); } catch {}

    if (!sess?.nama || !sess?.jabatan || !sess?.generasi) {
      throw new Error('Silakan login dulu ke Pagaska Music ya!');
    }

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
    } catch { _tokenExp = Date.now() + 604800000; }

    localStorage.setItem('_pgsk_ai_jwt', d.token);
    return d.token;
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

  // ── 🎵 SMART SONG SELECTION — UPDATE #2 ─────────────────────
  // Tidak lagi cari berdasarkan keyword nama lagu.
  // Ambil pool besar dari DB, filter pakai mood tags/genre,
  // lalu exclude lagu yang baru-baru ini sudah dimainkan AI.

  // History lagu yang sudah dikirim AI (max 30, reset saat clear)
  let _songHistory = (() => {
    try { return JSON.parse(localStorage.getItem('pgsk_ai_song_hist') || '[]'); }
    catch { return []; }
  })();

  function _saveSongHistory() {
    try { localStorage.setItem('pgsk_ai_song_hist', JSON.stringify(_songHistory.slice(-30))); }
    catch {}
  }

  // Mapping mood → genre/tag yang dicari di kolom `genre` atau `tags` supabase
  // Juga ada keyword fallback di judul/artis sebagai jaring pengaman
  const _moodProfile = {
    happy:   { genres: ['pop','indie pop','dance','funk','soul','acoustic pop'],   vibes: ['happy','ceria','gembira','feel good','upbeat'] },
    sad:     { genres: ['ballad','sad','ost','acoustic','blues','r&b'],            vibes: ['sedih','galau','rindu','patah hati','melankolis','sendu'] },
    stress:  { genres: ['lofi','ambient','jazz','classical','instrumental','chill'],vibes: ['santai','tenang','relax','damai','mellow'] },
    excited: { genres: ['rock','edm','hiphop','rap','trap','pop punk','metal'],    vibes: ['hype','energik','semangat','bangkit','gaspol'] },
    lonely:  { genres: ['acoustic','folk','indie','singer-songwriter','ost'],      vibes: ['sendiri','sepi','malam','sunyi','rindu'] },
    healing: { genres: ['acoustic','gospel','ambient','lofi','indie folk'],        vibes: ['healing','sembuh','damai','lembut','syukur'] },
  };

  async function _fetchSong(mood) {
    const sbUrl = (typeof SB_URL !== 'undefined') ? SB_URL : '';
    const sbKey = (typeof SB_KEY !== 'undefined') ? SB_KEY : '';
    if (!sbUrl || !sbKey) return null;

    const profile = _moodProfile[mood] || _moodProfile.happy;

    // ── Strategi 1: Ambil pool besar dari DB (50 lagu terpopuler)
    //   lalu filter secara client-side berdasarkan genre/tags/vibe
    try {
      const res = await fetch(
        `${sbUrl}/rest/v1/tracks?select=*&audio_url=not.is.null&order=play_count.desc&limit=50`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows?.length) {
          // Skor setiap lagu: cocok genre +2, cocok vibe +1
          const scored = rows.map(r => {
            let score = 0;
            const rGenre = (r.genre || r.tags || '').toLowerCase();
            const rTitle = (r.title || '').toLowerCase();
            const rArtist = (r.artist || '').toLowerCase();
            const rAll = `${rGenre} ${rTitle} ${rArtist}`;

            profile.genres.forEach(g => { if (rAll.includes(g)) score += 2; });
            profile.vibes.forEach(v  => { if (rAll.includes(v)) score += 1; });
            return { ...r, _score: score };
          });

          // Ambil yang ada skor > 0, lalu exclude yang ada di history
          let pool = scored
            .filter(r => r._score > 0 && !_songHistory.includes(r.id))
            .sort((a, b) => b._score - a._score);

          // Fallback: kalau pool kosong (semua sudah pernah diputar), reset history dan coba lagi
          if (!pool.length) {
            _songHistory = [];
            _saveSongHistory();
            pool = scored.filter(r => r._score > 0).sort((a, b) => b._score - a._score);
          }

          // Masih kosong? Ambil dari semua lagu yang ada tanpa filter mood (fallback total)
          if (!pool.length) {
            pool = rows.filter(r => !_songHistory.includes(r.id));
            if (!pool.length) { _songHistory = []; pool = rows; }
          }

          // Pilih secara weighted-random dari top 5 hasil skor tertinggi
          const top  = pool.slice(0, Math.min(5, pool.length));
          const pick = top[Math.floor(Math.random() * top.length)];

          // Catat di history supaya tidak muncul lagi
          _songHistory.push(pick.id);
          _saveSongHistory();

          return {
            title:     pick.title     || 'Unknown',
            artist:    pick.artist    || 'Unknown',
            thumbnail: pick.thumbnail || null,
            audioUrl:  pick.audio_url,
            trackId:   pick.id || ('db_' + Date.now()),
            source:    'db'
          };
        }
      }
    } catch { /* lanjut ke fallback */ }

    // ── Strategi 2: Fallback — ambil lagu acak apapun dari DB ──
    try {
      const res = await fetch(
        `${sbUrl}/rest/v1/tracks?select=*&audio_url=not.is.null&order=play_count.desc&limit=20`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        const valid = (rows || []).filter(r => r.audio_url && !_songHistory.includes(r.id));
        if (valid.length) {
          const pick = valid[Math.floor(Math.random() * Math.min(5, valid.length))];
          _songHistory.push(pick.id);
          _saveSongHistory();
          return {
            title:     pick.title     || 'Unknown',
            artist:    pick.artist    || 'Unknown',
            thumbnail: pick.thumbnail || null,
            audioUrl:  pick.audio_url,
            trackId:   pick.id || ('db_' + Date.now()),
            source:    'db'
          };
        }
      }
    } catch {}

    return null;
  }

  // ── 📝 MARKDOWN RENDERER (FIX #2) ───────────────────────────
  // Mengubah **bold**, *italic*, # heading, - list, dll. jadi HTML
  function _parseMarkdown(text) {
    if (!text) return '';

    // Escape HTML terlebih dahulu (tapi simpan agar bisa tambahkan tag HTML)
    let s = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Heading: ### H3, ## H2, # H1
    s = s.replace(/^###\s+(.+)$/gm, '<strong style="font-size:.85rem;display:block;margin:6px 0 2px">$1</strong>');
    s = s.replace(/^##\s+(.+)$/gm,  '<strong style="font-size:.88rem;display:block;margin:7px 0 3px">$1</strong>');
    s = s.replace(/^#\s+(.+)$/gm,   '<strong style="font-size:.92rem;display:block;margin:8px 0 4px">$1</strong>');

    // Bold: **text** atau __text__
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__(.+?)__/g,     '<strong>$1</strong>');

    // Italic: *text* atau _text_ (hati-hati tidak bentrok dengan bold)
    s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_\n]+?)_/g,   '<em>$1</em>');

    // Strikethrough: ~~text~~
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code: `code`
    s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.12);padding:1px 5px;border-radius:4px;font-size:.82em;font-family:monospace">$1</code>');

    // Numbered list: 1. item
    s = s.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:5px;margin:2px 0"><span style="color:var(--g);min-width:16px;font-size:.7rem;padding-top:1px">$1.</span><span>$2</span></div>');

    // Bullet list: - item atau * item (bila * tidak dalam bold)
    s = s.replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:5px;margin:2px 0"><span style="color:var(--g);font-size:.5rem;padding-top:4px">●</span><span>$1</span></div>');

    // Horizontal rule: ---
    s = s.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--bd);margin:6px 0">');

    // Newline → <br>
    s = s.replace(/\n/g, '<br>');

    return s;
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
      // FIX #2: pakai _parseMarkdown() bukan _esc()
      return `<div class="msg-wrap them">
        <div style="display:flex;align-items:flex-end;gap:6px">
          ${_avatar(p, 24)}
          <div style="flex:1;min-width:0">
            <div style="font-size:.6rem;color:${p.color};font-weight:700;margin-bottom:3px">${p.name}</div>
            <div class="msg-bubble" style="border-left:2px solid ${p.color}40">${songHtml}<span style="line-height:1.6">${_parseMarkdown(m.content)}</span></div>
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
      if (res.status === 401) {
        localStorage.removeItem('_pgsk_ai_jwt');
        _token = null; _tokenExp = 0;
        throw new Error('Token expired — silakan kirim ulang pesanmu.');
      }
      throw new Error(d.error || `AI error ${res.status}`);
    }
    return d.reply || d.message || 'Maaf, tidak ada respons.';
  }

  // ── 🎭 TAMPILKAN TYPING INDICATOR ────────────────────────────
  function _showTyping(persona) {
    const el  = document.getElementById('aiMessages');
    const id  = `ttyp_${persona.id}_${Date.now()}`;
    if (el) {
      el.innerHTML += `<div class="msg-wrap them" id="${id}">
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
    return id;
  }

  // ── 🤖 PROSES SATU AI DAN SIMPAN HASILNYA ────────────────────
  async function _processAI(persona, msg, token) {
    const typId = _showTyping(persona);
    try {
      const raw = await _callAI(persona, msg, token);
      const { clean, mood: aiMood } = _extractSong(raw);
      const detectedMood = aiMood || _detectMood(msg);
      let song = null;
      if (detectedMood) song = await _fetchSong(detectedMood);

      document.getElementById(typId)?.remove();

      _loadMsgs();
      const entry = { role: 'assistant', persona: persona.id, content: clean, ts: new Date().toISOString() };
      if (song) entry.song = song;
      _msgs.push(entry);
      _saveMsgs();
      _updatePreview(persona.id, clean);
      _render();
    } catch (err) {
      document.getElementById(typId)?.remove();
      _loadMsgs();
      _msgs.push({
        role: 'assistant', persona: persona.id,
        content: `⚠️ ${err.message || 'AI tidak dapat dihubungi saat ini.'}`,
        ts: new Date().toISOString()
      });
      _saveMsgs();
      _render();
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════

  function open() {
    _loadMsgs();
    document.getElementById('aiChatRoom')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    _updateTabs();
    _render();
    setTimeout(() => document.getElementById('aiChatInput')?.focus(), 100);
    const badge = document.getElementById('taksakaUnreadBadge');
    if (badge) badge.style.display = 'none';
  }

  function close() {
    document.getElementById('aiChatRoom')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function setMode(m) {
    _mode = m;
    _updateTabs();
  }

  // ── 📤 KIRIM PESAN — FIX #1: Mode bergantian = KEDUANYA jawab ─
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

    try {
      const token = await _ensureToken();

      if (_mode === 'kak') {
        // Hanya Kak Taksaka yang jawab
        await _processAI(PERSONAS.kak, msg, token);

      } else if (_mode === 'dokter') {
        // Hanya Dokter Taksaka yang jawab
        await _processAI(PERSONAS.dokter, msg, token);

      } else {
        // ── FIX #1: Mode BERGANTIAN = KEDUANYA jawab berurutan ──
        // Tentukan siapa yang jawab duluan berdasarkan konten pesan
        const t = msg.toLowerCase();
        const isEmotional = /sedih|nangis|galau|patah hati|kecewa|stress|capek|lelah|bosen|jenuh|penat|sendiri|sepi|lonely|takut|cemas|panik|khawatir|gelisah|bingung|hilang arah|overwhelm/.test(t);

        let first, second;
        if (isEmotional) {
          // Pesan emosional: Dokter duluan, Kak menyusul
          first  = PERSONAS.dokter;
          second = PERSONAS.kak;
        } else {
          // Pesan biasa: bergantian berdasarkan giliran
          _turn++;
          if (_turn % 2 === 1) {
            first  = PERSONAS.kak;
            second = PERSONAS.dokter;
          } else {
            first  = PERSONAS.dokter;
            second = PERSONAS.kak;
          }
        }

        // Jawab keduanya — pertama langsung, kedua menyusul setelah 800ms jeda
        await _processAI(first, msg, token);
        await new Promise(r => setTimeout(r, 800));
        await _processAI(second, msg, token);
      }

    } catch (err) {
      // Error saat auth (sebelum proses AI individual)
      _loadMsgs();
      _msgs.push({
        role: 'assistant', persona: 'kak',
        content: `⚠️ ${err.message || 'AI tidak dapat dihubungi saat ini.'}`,
        ts: new Date().toISOString()
      });
      _saveMsgs();
      _render();
    }

    if (btn) btn.disabled = false;
  }

  function clear() {
    if (!confirm('Hapus semua riwayat chat dengan Kak & Dokter Taksaka?')) return;
    _msgs = []; _saveMsgs();
    localStorage.removeItem('_pgsk_ai_jwt');
    localStorage.removeItem('pgsk_ai_song_hist');
    _token = null; _tokenExp = 0; _turn = 0;
    _songHistory = [];
    _render();
    const el = document.getElementById('taksakaGroupPreview');
    if (el) el.textContent = 'Kak Taksaka & Dokter Taksaka siap membantu...';
  }

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

  function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return { open, close, setMode, send, clear, playSong, onKeydown };

})();

window.TaksakaGroup = TaksakaGroup;

// Legacy compat
window.openAIChat  = () => TaksakaGroup.open();
window.closeAIChat = () => TaksakaGroup.close();
window.clearAIChat = () => TaksakaGroup.clear();
