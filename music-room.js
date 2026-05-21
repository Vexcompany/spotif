// ════════════════════════════════════════════════════════════════
//  MUSIC ROOM FEATURE PATCH
//  File ini berisi semua kode baru untuk fitur Listening Together & Karaoke
//  Cara pakai: paste isi ini ke index.html sebelum </script> penutup
// ════════════════════════════════════════════════════════════════

// ───────────────────────── STATE ──────────────────────────────
let musicRoomState = {
  active: false,
  mode: null, // 'listen' | 'karaoke'
  sessionId: null,
  partnerKey: null,
  partnerName: null,
  isHost: false,
  karaokeMyTurn: false,
  karaokeMyLines: [],  // line indices assigned to me
  karaokePartnerLines: [],
  localStream: null,
  remoteStream: null,
  pc: null, // RTCPeerConnection
  micActive: false,
  listenInterval: null,
  sigInterval: null,
};

const MUSIC_ROOM_TABLE = 'music_rooms';
const MUSIC_SIG_TABLE  = 'music_signals';

// ───────────────────────── CSS INJECTION ──────────────────────
(function injectMusicRoomCSS() {
  const style = document.createElement('style');
  style.textContent = `
/* ── PLUS MENU BUTTON ─────────────────────────────────────── */
.chat-plus-btn {
  width: 42px; height: 42px; border-radius: 12px;
  border: 1px solid var(--bd); background: var(--s2);
  color: var(--mt); font-size: 1.1rem;
  cursor: pointer; display: flex; align-items: center;
  justify-content: center; transition: all .2s; flex-shrink: 0;
}
.chat-plus-btn:hover { background: var(--s3); color: var(--dyn1); border-color: var(--dyn1); }
.chat-plus-btn.active { background: var(--dyn1); color: #000; border-color: var(--dyn1); transform: rotate(45deg); }

/* ── PLUS POPUP MENU ──────────────────────────────────────── */
.chat-plus-menu {
  position: absolute; bottom: calc(100% + 8px); left: 16px;
  background: var(--s2); border: 1px solid var(--bd2);
  border-radius: 16px; padding: 6px;
  display: none; flex-direction: column; gap: 2px;
  box-shadow: 0 8px 32px rgba(0,0,0,.6);
  z-index: 10; min-width: 220px;
  animation: menuIn .2s cubic-bezier(.16,1,.3,1);
}
.chat-plus-menu.open { display: flex; }
@keyframes menuIn {
  from { opacity: 0; transform: translateY(8px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cpm-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 12px; cursor: pointer;
  transition: background .16s; border: none; background: transparent;
  text-align: left; font-family: inherit; color: var(--tx); width: 100%;
}
.cpm-item:hover { background: var(--s3); }
.cpm-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; flex-shrink: 0;
}
.cpm-icon.listen { background: linear-gradient(135deg, var(--dyn1), #00b4d8); color: #000; }
.cpm-icon.karaoke { background: linear-gradient(135deg, var(--pk), var(--p)); color: #fff; }
.cpm-text { flex: 1; }
.cpm-title { font-size: .82rem; font-weight: 700; margin-bottom: 1px; }
.cpm-sub { font-size: .65rem; color: var(--mt); }

/* ── MUSIC ROOM PANEL ─────────────────────────────────────── */
.music-room-panel {
  position: fixed; inset: 0; z-index: 600;
  background: var(--bg);
  transform: translateY(100%);
  transition: transform .35s cubic-bezier(.16,1,.3,1);
  display: flex; flex-direction: column;
}
.music-room-panel.open { transform: translateY(0); }

.mrp-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  background: rgba(7,7,26,.95); backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--bd); flex-shrink: 0;
}
.mrp-back {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--bd); background: var(--s2);
  color: var(--mt); display: flex; align-items: center;
  justify-content: center; cursor: pointer; transition: all .2s;
}
.mrp-back:hover { background: var(--s3); color: var(--tx); }
.mrp-title { font-family: 'Syne', sans-serif; font-size: .95rem; font-weight: 800; flex: 1; }
.mrp-badge {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px; font-size: .65rem; font-weight: 700;
}
.mrp-badge.listen { background: rgba(29,185,84,.15); color: var(--dyn1); border: 1px solid rgba(29,185,84,.3); }
.mrp-badge.karaoke { background: rgba(247,37,133,.15); color: var(--pk); border: 1px solid rgba(247,37,133,.3); }

.mrp-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; scrollbar-width: none; }
.mrp-body::-webkit-scrollbar { display: none; }

/* Track card inside room */
.mrp-track-card {
  background: var(--s1); border: 1px solid var(--bd);
  border-radius: 18px; padding: 16px;
  display: flex; align-items: center; gap: 14px;
}
.mrp-track-img {
  width: 64px; height: 64px; border-radius: 12px; overflow: hidden;
  flex-shrink: 0; position: relative;
}
.mrp-track-img img { width: 100%; height: 100%; object-fit: cover; }
.mrp-track-playing {
  position: absolute; inset: 0; background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  gap: 2px;
}
.mrp-bar {
  width: 3px; border-radius: 2px; background: var(--dyn1);
  animation: barDance .6s ease-in-out infinite alternate;
}
.mrp-bar:nth-child(2) { animation-delay: .1s; }
.mrp-bar:nth-child(3) { animation-delay: .2s; }
@keyframes barDance {
  from { height: 6px; } to { height: 20px; }
}
.mrp-track-inf { flex: 1; min-width: 0; }
.mrp-track-t { font-size: .92rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
.mrp-track-a { font-size: .74rem; color: var(--mt); }
.mrp-track-prog { margin-top: 8px; height: 3px; background: var(--s4); border-radius: 2px; overflow: hidden; }
.mrp-track-fill { height: 100%; background: linear-gradient(90deg, var(--dyn1), var(--p)); border-radius: 2px; transition: width .5s linear; }

/* Users row */
.mrp-users {
  display: flex; align-items: center; justify-content: center; gap: 24px;
  padding: 16px; background: var(--s1); border: 1px solid var(--bd); border-radius: 18px;
}
.mrp-user { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.mrp-user-av {
  width: 52px; height: 52px; border-radius: 50%;
  background: linear-gradient(135deg, var(--p), var(--b));
  display: flex; align-items: center; justify-content: center;
  font-size: .88rem; font-weight: 800; color: #fff; position: relative;
}
.mrp-user-av.me { background: linear-gradient(135deg, var(--dyn1), var(--p)); }
.mrp-user-av.speaking::after {
  content: ''; position: absolute; inset: -3px; border-radius: 50%;
  border: 2px solid var(--pk); animation: speakPulse .8s ease-in-out infinite;
}
@keyframes speakPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(1.1); } }
.mrp-user-mic {
  position: absolute; bottom: -2px; right: -2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--bg); border: 1.5px solid var(--bd);
  display: flex; align-items: center; justify-content: center; font-size: .55rem;
}
.mrp-user-mic.on { background: var(--pk); color: #fff; border-color: var(--pk); }
.mrp-user-nm { font-size: .72rem; font-weight: 700; }
.mrp-user-role { font-size: .6rem; color: var(--mt); }
.mrp-link {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(29,185,84,.15); border: 1px solid rgba(29,185,84,.3);
  display: flex; align-items: center; justify-content: center;
  color: var(--dyn1); font-size: .8rem;
}

/* Controls */
.mrp-controls {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.mrp-ctrl-btn {
  flex: 1; min-width: 120px; padding: 12px 8px;
  border-radius: 14px; border: 1px solid var(--bd); background: var(--s2);
  color: var(--tx); font-size: .78rem; font-weight: 600;
  cursor: pointer; transition: all .2s; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
.mrp-ctrl-btn:hover { background: var(--s3); border-color: var(--dyn1); }
.mrp-ctrl-btn.primary { background: linear-gradient(135deg, var(--dyn1), var(--p)); border: none; color: #fff; }
.mrp-ctrl-btn.danger  { border-color: rgba(255,77,109,.4); color: var(--rd); }
.mrp-ctrl-btn.danger:hover { background: rgba(255,77,109,.1); }
.mrp-ctrl-btn.active  { background: var(--pk); border-color: var(--pk); color: #fff; }

/* ── KARAOKE SECTION ─────────────────────────────────────── */
.mrp-karaoke-box {
  background: var(--s1); border: 1px solid var(--bd);
  border-radius: 18px; overflow: hidden;
}
.mrp-karaoke-header {
  padding: 12px 16px; border-bottom: 1px solid var(--bd);
  display: flex; align-items: center; justify-content: space-between;
}
.mrp-karaoke-title {
  font-size: .8rem; font-weight: 700; display: flex; align-items: center; gap: 6px;
}
.mrp-turn-badge {
  padding: 3px 10px; border-radius: 20px; font-size: .65rem; font-weight: 700;
}
.mrp-turn-badge.my-turn { background: rgba(247,37,133,.2); color: var(--pk); border: 1px solid rgba(247,37,133,.4); }
.mrp-turn-badge.their-turn { background: rgba(29,185,84,.15); color: var(--dyn1); border: 1px solid rgba(29,185,84,.3); }
.mrp-lyric-lines { max-height: 340px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; scrollbar-width: none; }
.mrp-lyric-lines::-webkit-scrollbar { display: none; }
.mrp-lyric-line {
  padding: 8px 12px; border-radius: 10px; font-size: .82rem; line-height: 1.5;
  transition: all .3s; color: var(--mt); border: 1px solid transparent;
}
.mrp-lyric-line.mine { border-color: rgba(247,37,133,.2); background: rgba(247,37,133,.05); color: rgba(247,37,133,.8); }
.mrp-lyric-line.theirs { border-color: rgba(29,185,84,.2); background: rgba(29,185,84,.05); color: rgba(29,185,84,.8); }
.mrp-lyric-line.active-mine {
  background: rgba(247,37,133,.2); border-color: var(--pk); color: #fff;
  font-weight: 700; font-size: .9rem; transform: scale(1.02);
}
.mrp-lyric-line.active-theirs {
  background: rgba(29,185,84,.2); border-color: var(--dyn1); color: #fff;
  font-weight: 700; font-size: .9rem; transform: scale(1.02);
}

/* voice wave visualizer */
.mrp-voice-vis {
  display: flex; align-items: center; justify-content: center; gap: 3px;
  height: 32px; padding: 0 12px;
}
.mrp-vbar {
  width: 3px; border-radius: 2px; background: var(--pk);
  height: 6px; transition: height .1s;
}

/* waiting state */
.mrp-waiting {
  text-align: center; padding: 32px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.mrp-waiting-spinner {
  width: 48px; height: 48px; border-radius: 50%;
  border: 3px solid var(--s4); border-top-color: var(--dyn1);
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mrp-waiting-text { font-size: .84rem; color: var(--mt); }

/* toast notif khusus room */
.mrp-invite-banner {
  position: fixed; bottom: calc(var(--nav-h) + 90px); left: 12px; right: 12px;
  z-index: 550; background: var(--s2); border: 1px solid rgba(29,185,84,.4);
  border-radius: 16px; padding: 14px; box-shadow: 0 8px 32px rgba(0,0,0,.6);
  display: none; flex-direction: column; gap: 10px;
  animation: slideUp .35s cubic-bezier(.16,1,.3,1);
}
.mrp-invite-banner.show { display: flex; }
.mrp-invite-title { font-size: .84rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.mrp-invite-sub { font-size: .72rem; color: var(--mt); }
.mrp-invite-btns { display: flex; gap: 8px; }
.mrp-invite-accept {
  flex: 1; padding: 9px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, var(--dyn1), var(--p)); color: #fff;
  font-weight: 700; font-size: .78rem; cursor: pointer; font-family: inherit;
}
.mrp-invite-decline {
  padding: 9px 16px; border-radius: 10px; border: 1px solid var(--bd);
  background: transparent; color: var(--mt); font-size: .78rem;
  cursor: pointer; font-family: inherit;
}
`;
  document.head.appendChild(style);
})();

// ─────────────────── HTML INJECTION ───────────────────────────
(function injectHTML() {
  // 1. Tombol + di chat input row (normal chat room)
  const chatInputRow = document.querySelector('#chatRoom .chat-input-row');
  if (chatInputRow) {
    const plusBtn = document.createElement('button');
    plusBtn.className = 'chat-plus-btn';
    plusBtn.id = 'chatPlusBtn';
    plusBtn.title = 'Fitur Musik';
    plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
    plusBtn.onclick = togglePlusMenu;
    chatInputRow.insertBefore(plusBtn, chatInputRow.firstChild);
  }

  // 2. Plus popup menu
  const chatInputWrap = document.querySelector('#chatRoom .chat-input-wrap');
  if (chatInputWrap) {
    chatInputWrap.style.position = 'relative';
    const menu = document.createElement('div');
    menu.className = 'chat-plus-menu';
    menu.id = 'chatPlusMenu';
    menu.innerHTML = `
      <button class="cpm-item" onclick="initMusicRoom('listen')">
        <div class="cpm-icon listen"><i class="fas fa-headphones"></i></div>
        <div class="cpm-text">
          <div class="cpm-title">Listening Together</div>
          <div class="cpm-sub">Dengerin lagu bareng secara sync</div>
        </div>
      </button>
      <button class="cpm-item" onclick="initMusicRoom('karaoke')">
        <div class="cpm-icon karaoke"><i class="fas fa-microphone"></i></div>
        <div class="cpm-text">
          <div class="cpm-title">Karaoke Mode</div>
          <div class="cpm-sub">Saut-sautan lirik / dengerin yang nyanyi</div>
        </div>
      </button>
    `;
    chatInputWrap.appendChild(menu);
  }

  // 3. Music Room Panel (full screen overlay)
  const panel = document.createElement('div');
  panel.className = 'music-room-panel';
  panel.id = 'musicRoomPanel';
  panel.innerHTML = `
    <div class="mrp-header">
      <button class="mrp-back" onclick="closeMusicRoom()"><i class="fas fa-chevron-down"></i></button>
      <div class="mrp-title" id="mrpTitle">Music Room</div>
      <div class="mrp-badge listen" id="mrpBadge"><i class="fas fa-circle" style="font-size:.45rem"></i> LIVE</div>
    </div>
    <div class="mrp-body" id="mrpBody">
      <div class="mrp-waiting" id="mrpWaiting">
        <div class="mrp-waiting-spinner"></div>
        <div class="mrp-waiting-text" id="mrpWaitingText">Menunggu partner bergabung...</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // 4. Invite banner
  const banner = document.createElement('div');
  banner.className = 'mrp-invite-banner';
  banner.id = 'mrpInviteBanner';
  banner.innerHTML = `
    <div class="mrp-invite-title"><i class="fas fa-headphones" style="color:var(--dyn1)"></i> <span id="mrpInviteTitle">Ajakan Music Room</span></div>
    <div class="mrp-invite-sub" id="mrpInviteSub">–</div>
    <div class="mrp-invite-btns">
      <button class="mrp-invite-accept" onclick="acceptMusicRoom()"><i class="fas fa-check"></i> Gabung</button>
      <button class="mrp-invite-decline" onclick="declineMusicRoom()">Tolak</button>
    </div>
  `;
  document.body.appendChild(banner);
})();

// ─────────────────── PLUS MENU ─────────────────────────────────
function togglePlusMenu() {
  const menu = document.getElementById('chatPlusMenu');
  const btn  = document.getElementById('chatPlusBtn');
  const open = menu.classList.toggle('open');
  btn.classList.toggle('active', open);
  if (open) {
    setTimeout(() => {
      const close = () => { menu.classList.remove('open'); btn.classList.remove('active'); document.removeEventListener('click', close); };
      document.addEventListener('click', close);
    }, 10);
  }
}

// ─────────────────── INIT MUSIC ROOM ──────────────────────────
async function initMusicRoom(mode) {
  document.getElementById('chatPlusMenu').classList.remove('open');
  document.getElementById('chatPlusBtn').classList.remove('active');

  if (!currentChatWith) { toast('Buka percakapan dulu'); return; }
  if (!currentTrack)    { toast('Putar lagu dulu sebelum Listening Together'); return; }
  if (musicRoomState.active) { openMusicRoomPanel(); return; }

  const sessionId = `${USER_KEY}__${currentChatWith}__${Date.now()}`;
  musicRoomState = {
    ...musicRoomState,
    active: true, mode, sessionId,
    partnerKey: currentChatWith,
    partnerName: document.getElementById('chatRoomName')?.textContent || currentChatWith,
    isHost: true,
    karaokeMyTurn: mode === 'karaoke',
  };

  // Save session ke Supabase (tabel music_rooms)
  await sb.post(MUSIC_ROOM_TABLE, {
    session_id: sessionId,
    host_key: USER_KEY,
    guest_key: currentChatWith,
    mode,
    track_id: currentTrack.id,
    track_title: currentTrack.title,
    track_artist: currentTrack.artist,
    track_audio: currentTrack.audio,
    track_thumb: currentTrack.thumbnail,
    status: 'waiting',
    host_pos: audio.currentTime,
    updated_at: new Date().toISOString(),
  }).catch(() => {});

  // Kirim pesan notif ke partner
  await sb.post('messages', {
    from_key: USER_KEY,
    to_key: currentChatWith,
    content: `🎵 _music_room_invite_|${sessionId}|${mode}|${currentTrack.title}`,
    created_at: new Date().toISOString(),
  }).catch(() => {});

  openMusicRoomPanel();
  renderMusicRoomBody();
  startRoomSync();
}

// ─────────────────── OPEN / CLOSE PANEL ───────────────────────
function openMusicRoomPanel() {
  document.getElementById('musicRoomPanel').classList.add('open');
  const isKaraoke = musicRoomState.mode === 'karaoke';
  document.getElementById('mrpTitle').textContent = isKaraoke ? '🎤 Karaoke Mode' : '🎧 Listening Together';
  const badge = document.getElementById('mrpBadge');
  badge.className = `mrp-badge ${isKaraoke ? 'karaoke' : 'listen'}`;
  badge.innerHTML = `<i class="fas fa-circle" style="font-size:.45rem"></i> LIVE`;
}

function closeMusicRoom() {
  document.getElementById('musicRoomPanel').classList.remove('open');
}

async function endMusicRoom() {
  if (musicRoomState.sessionId) {
    await sb.patch(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(musicRoomState.sessionId)}`, { status: 'ended' }).catch(() => {});
  }
  stopRoomSync();
  stopWebRTC();
  musicRoomState = { active: false, mode: null, sessionId: null, partnerKey: null, partnerName: null, isHost: false, karaokeMyTurn: false, karaokeMyLines: [], karaokePartnerLines: [], localStream: null, remoteStream: null, pc: null, micActive: false, listenInterval: null, sigInterval: null };
  document.getElementById('musicRoomPanel').classList.remove('open');
  toast('Music Room ditutup');
}

// ─────────────────── RENDER BODY ──────────────────────────────
function renderMusicRoomBody() {
  const body = document.getElementById('mrpBody');
  const s = musicRoomState;
  const track = currentTrack;
  const meIni = (USER_KEY || 'A').slice(0, 2).toUpperCase();
  const theyIni = (s.partnerName || 'B').slice(0, 2).toUpperCase();

  const trackCard = track ? `
    <div class="mrp-track-card">
      <div class="mrp-track-img">
        <img src="${track.thumbnail || PH}" onerror="this.src='${PH}'">
        <div class="mrp-track-playing">
          <div class="mrp-bar"></div><div class="mrp-bar"></div><div class="mrp-bar"></div>
        </div>
      </div>
      <div class="mrp-track-inf">
        <div class="mrp-track-t">${track.title}</div>
        <div class="mrp-track-a">${track.artist}</div>
        <div class="mrp-track-prog"><div class="mrp-track-fill" id="mrpTrackFill"></div></div>
      </div>
    </div>
  ` : '';

  const usersRow = `
    <div class="mrp-users">
      <div class="mrp-user">
        <div class="mrp-user-av me" id="mrpMeAv">
          ${meIni}
          <div class="mrp-user-mic" id="mrpMeMic"><i class="fas fa-microphone-slash"></i></div>
        </div>
        <div class="mrp-user-nm">Kamu</div>
        <div class="mrp-user-role" id="mrpMeRole">${s.isHost ? 'Host' : 'Guest'}</div>
      </div>
      <div class="mrp-link"><i class="fas fa-music"></i></div>
      <div class="mrp-user">
        <div class="mrp-user-av" id="mrpTheyAv">${theyIni}</div>
        <div class="mrp-user-nm">${s.partnerName || '–'}</div>
        <div class="mrp-user-role" id="mrpTheyRole">${s.isHost ? 'Guest' : 'Host'}</div>
      </div>
    </div>
  `;

  let extraSection = '';
  if (s.mode === 'karaoke') {
    extraSection = renderKaraokeSection();
  } else {
    extraSection = `
      <div class="mrp-controls">
        <button class="mrp-ctrl-btn" id="mrpMicBtn" onclick="toggleRoomMic()">
          <i class="fas fa-microphone-slash"></i> Mikrofon
        </button>
        <button class="mrp-ctrl-btn danger" onclick="endMusicRoom()">
          <i class="fas fa-door-open"></i> Keluar Room
        </button>
      </div>
      <div id="mrpWaiting" class="mrp-waiting" style="display:none">
        <div class="mrp-waiting-spinner"></div>
        <div class="mrp-waiting-text" id="mrpWaitingText">Menunggu partner bergabung...</div>
      </div>
    `;
  }

  body.innerHTML = trackCard + usersRow + extraSection;
  startProgressSync();
}

function renderKaraokeSection() {
  const s = musicRoomState;
  const turnBadge = s.karaokeMyTurn
    ? `<div class="mrp-turn-badge my-turn">Giliran Kamu 🎤</div>`
    : `<div class="mrp-turn-badge their-turn">Giliran ${s.partnerName} 🎧</div>`;

  return `
    <div class="mrp-karaoke-box">
      <div class="mrp-karaoke-header">
        <div class="mrp-karaoke-title"><i class="fas fa-microphone" style="color:var(--pk)"></i> Karaoke</div>
        ${turnBadge}
      </div>
      <div class="mrp-lyric-lines" id="mrpLyricLines">
        <div style="text-align:center;color:var(--mt);padding:20px;font-size:.8rem">Memuat lirik...</div>
      </div>
      <div class="mrp-voice-vis" id="mrpVoiceVis" style="display:none">
        ${Array.from({length:12},(_,i)=>`<div class="mrp-vbar" id="mrpVbar${i}"></div>`).join('')}
      </div>
    </div>
    <div class="mrp-controls">
      <button class="mrp-ctrl-btn" id="mrpMicBtn" onclick="toggleRoomMic()">
        <i class="fas fa-microphone-slash"></i> ${s.karaokeMyTurn ? 'Nyalakan Mic' : 'Dengarkan'}
      </button>
      <button class="mrp-ctrl-btn" onclick="switchKaraokeTurn()">
        <i class="fas fa-exchange-alt"></i> Ganti Giliran
      </button>
      <button class="mrp-ctrl-btn danger" onclick="endMusicRoom()">
        <i class="fas fa-door-open"></i> Keluar
      </button>
    </div>
  `;
}

// ─────────────────── SYNC LOGIC ───────────────────────────────
function startRoomSync() {
  musicRoomState.listenInterval = setInterval(async () => {
    if (!musicRoomState.active) return;
    const s = musicRoomState;

    // Host broadcast posisi audio
    if (s.isHost && currentTrack) {
      await sb.patch(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(s.sessionId)}`, {
        host_pos: audio.currentTime,
        track_id: currentTrack.id,
        updated_at: new Date().toISOString(),
        status: 'active',
      }).catch(() => {});
    }

    // Guest sync posisi
    if (!s.isHost && s.sessionId) {
      try {
        const rows = await sb.get(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(s.sessionId)}`);
        if (rows && rows[0]) {
          const r = rows[0];
          if (r.status === 'ended') { endMusicRoom(); return; }
          const diff = Math.abs(audio.currentTime - r.host_pos);
          if (diff > 2) audio.currentTime = r.host_pos;
          // update progress UI
          updateRoomProgress();
          // update karaoke lines
          if (s.mode === 'karaoke') syncKaraokeLines();
        }
      } catch {}
    } else {
      updateRoomProgress();
      if (s.mode === 'karaoke') syncKaraokeLines();
    }
  }, 2000);

  // Poll for partner joining / karaoke signals
  musicRoomState.sigInterval = setInterval(pollSignals, 3000);
}

function stopRoomSync() {
  clearInterval(musicRoomState.listenInterval);
  clearInterval(musicRoomState.sigInterval);
}

async function pollSignals() {
  if (!musicRoomState.active) return;
  try {
    const rows = await sb.get(MUSIC_SIG_TABLE,
      `session_id=eq.${encodeURIComponent(musicRoomState.sessionId)}&to_key=eq.${encodeURIComponent(USER_KEY)}&handled=eq.false&order=created_at.asc&limit=5`
    );
    for (const sig of (rows || [])) {
      await handleSignal(sig);
      await sb.patch(MUSIC_SIG_TABLE, `id=eq.${sig.id}`, { handled: true }).catch(() => {});
    }
  } catch {}
}

async function sendSignal(type, data) {
  await sb.post(MUSIC_SIG_TABLE, {
    session_id: musicRoomState.sessionId,
    from_key: USER_KEY,
    to_key: musicRoomState.partnerKey,
    type, data: JSON.stringify(data),
    handled: false,
    created_at: new Date().toISOString(),
  }).catch(() => {});
}

async function handleSignal(sig) {
  const data = JSON.parse(sig.data || '{}');
  switch (sig.type) {
    case 'partner_joined':
      musicRoomState.partnerName = data.name || musicRoomState.partnerName;
      document.getElementById('mrpTheyRole') && (document.getElementById('mrpTheyRole').textContent = 'Guest');
      toast(`${musicRoomState.partnerName} bergabung! 🎵`);
      // Update waiting → active
      const w = document.getElementById('mrpWaiting');
      if (w) w.style.display = 'none';
      // load karaoke lirik
      if (musicRoomState.mode === 'karaoke') loadKaraokeLyrics();
      break;
    case 'karaoke_turn':
      musicRoomState.karaokeMyTurn = data.yourTurn === true;
      updateKaraokeTurnUI();
      break;
    case 'webrtc_offer':
      await handleWebRTCOffer(data);
      break;
    case 'webrtc_answer':
      await handleWebRTCAnswer(data);
      break;
    case 'webrtc_ice':
      if (musicRoomState.pc) await musicRoomState.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      break;
  }
}

function updateRoomProgress() {
  const fill = document.getElementById('mrpTrackFill');
  if (fill && audio.duration) {
    fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  }
}

// ─────────────────── KARAOKE LOGIC ────────────────────────────
let karaokeLines = []; // [{time,text,mine}]

async function loadKaraokeLyrics() {
  if (!currentTrack) return;
  try {
    const data = await fetchLyrics(currentTrack.title, currentTrack.artist);
    if (data && data.type === 'synced' && data.data?.length) {
      // Distribusi: alternating pairs of 2 lines
      karaokeLines = data.data.map((l, i) => ({
        ...l,
        mine: musicRoomState.isHost ? (Math.floor(i / 2) % 2 === 0) : (Math.floor(i / 2) % 2 === 1),
      }));
      renderKaraokeLines();
    } else {
      const el = document.getElementById('mrpLyricLines');
      if (el) el.innerHTML = '<div style="text-align:center;color:var(--mt);padding:20px;font-size:.8rem">Lirik tidak tersedia 🎵<br><small>Mode karaoke tetap aktif dengan mic</small></div>';
    }
  } catch {}
}

function renderKaraokeLines() {
  const el = document.getElementById('mrpLyricLines');
  if (!el) return;
  el.innerHTML = karaokeLines.map((l, i) => `
    <div class="mrp-lyric-line ${l.mine ? 'mine' : 'theirs'}" id="kl${i}" data-time="${l.time}">
      <span style="font-size:.6rem;opacity:.5">${l.mine ? '🎤 Kamu' : `🎵 ${musicRoomState.partnerName}`}</span><br>
      ${l.text}
    </div>
  `).join('');
}

function syncKaraokeLines() {
  if (!karaokeLines.length) return;
  const cur = audio.currentTime;
  let activeIdx = -1;
  for (let i = 0; i < karaokeLines.length; i++) {
    if (cur >= karaokeLines[i].time) activeIdx = i;
  }
  karaokeLines.forEach((l, i) => {
    const el = document.getElementById(`kl${i}`);
    if (!el) return;
    el.className = `mrp-lyric-line ${l.mine ? 'mine' : 'theirs'}`;
    if (i === activeIdx) {
      el.className += l.mine ? ' active-mine' : ' active-theirs';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  // Auto turn based on current line
  if (activeIdx >= 0) {
    const isMine = karaokeLines[activeIdx].mine;
    if (isMine !== musicRoomState.karaokeMyTurn) {
      musicRoomState.karaokeMyTurn = isMine;
      updateKaraokeTurnUI();
      if (isMine && musicRoomState.micActive) startVoiceVis();
    }
  }
}

function updateKaraokeTurnUI() {
  const badge = document.querySelector('.mrp-turn-badge');
  if (!badge) return;
  const s = musicRoomState;
  badge.className = `mrp-turn-badge ${s.karaokeMyTurn ? 'my-turn' : 'their-turn'}`;
  badge.textContent = s.karaokeMyTurn ? 'Giliran Kamu 🎤' : `Giliran ${s.partnerName} 🎧`;
}

async function switchKaraokeTurn() {
  musicRoomState.karaokeMyTurn = !musicRoomState.karaokeMyTurn;
  updateKaraokeTurnUI();
  await sendSignal('karaoke_turn', { yourTurn: !musicRoomState.karaokeMyTurn });
  toast(musicRoomState.karaokeMyTurn ? '🎤 Giliran kamu!' : '🎧 Giliran partner');
}

// ─────────────────── MIC / WEBRTC ─────────────────────────────
async function toggleRoomMic() {
  if (musicRoomState.micActive) {
    stopMic();
  } else {
    await startMic();
  }
}

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    musicRoomState.localStream = stream;
    musicRoomState.micActive = true;

    const btn = document.getElementById('mrpMicBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-microphone"></i> Mic Aktif'; btn.classList.add('active'); }

    const mic = document.getElementById('mrpMeMic');
    if (mic) { mic.className = 'mrp-user-mic on'; mic.innerHTML = '<i class="fas fa-microphone"></i>'; }

    document.getElementById('mrpVoiceVis') && (document.getElementById('mrpVoiceVis').style.display = 'flex');
    startVoiceVis(stream);
    await startWebRTC(stream);
  } catch (e) {
    toast('Gagal akses mikrofon: ' + e.message);
  }
}

function stopMic() {
  if (musicRoomState.localStream) {
    musicRoomState.localStream.getTracks().forEach(t => t.stop());
    musicRoomState.localStream = null;
  }
  musicRoomState.micActive = false;
  const btn = document.getElementById('mrpMicBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-microphone-slash"></i> Mikrofon'; btn.classList.remove('active'); }
  const mic = document.getElementById('mrpMeMic');
  if (mic) { mic.className = 'mrp-user-mic'; mic.innerHTML = '<i class="fas fa-microphone-slash"></i>'; }
  document.getElementById('mrpVoiceVis') && (document.getElementById('mrpVoiceVis').style.display = 'none');
  stopWebRTC();
}

// ─────────────────── VOICE VISUALIZER ─────────────────────────
let _visAF = null, _analyser = null;
function startVoiceVis(stream) {
  if (!stream) return;
  try {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    _analyser = ctx.createAnalyser();
    _analyser.fftSize = 64;
    src.connect(_analyser);
    const buf = new Uint8Array(_analyser.frequencyBinCount);
    function tick() {
      _analyser.getByteFrequencyData(buf);
      for (let i = 0; i < 12; i++) {
        const bar = document.getElementById(`mrpVbar${i}`);
        if (bar) bar.style.height = `${4 + (buf[i] / 255) * 28}px`;
      }
      _visAF = requestAnimationFrame(tick);
    }
    tick();
  } catch {}
}

// ─────────────────── WEBRTC P2P ───────────────────────────────
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

async function startWebRTC(stream) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  musicRoomState.pc = pc;

  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => {
    musicRoomState.remoteStream = e.streams[0];
    let remAudio = document.getElementById('mrpRemoteAudio');
    if (!remAudio) {
      remAudio = document.createElement('audio');
      remAudio.id = 'mrpRemoteAudio';
      remAudio.autoplay = true;
      document.body.appendChild(remAudio);
    }
    remAudio.srcObject = e.streams[0];
    // Show partner mic on
    const theyAv = document.getElementById('mrpTheyAv');
    if (theyAv && !theyAv.querySelector('.mrp-user-mic')) {
      const mic = document.createElement('div');
      mic.className = 'mrp-user-mic on';
      mic.innerHTML = '<i class="fas fa-microphone"></i>';
      theyAv.appendChild(mic);
    }
    toast(`🎙️ ${musicRoomState.partnerName} mic aktif!`);
  };

  pc.onicecandidate = e => {
    if (e.candidate) sendSignal('webrtc_ice', { candidate: e.candidate });
  };

  if (musicRoomState.isHost) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal('webrtc_offer', { sdp: offer });
  }
}

async function handleWebRTCOffer(data) {
  if (!musicRoomState.localStream) {
    try { musicRoomState.localStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return; }
  }
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  musicRoomState.pc = pc;
  musicRoomState.localStream.getTracks().forEach(t => pc.addTrack(t, musicRoomState.localStream));
  pc.ontrack = e => {
    musicRoomState.remoteStream = e.streams[0];
    let remAudio = document.getElementById('mrpRemoteAudio');
    if (!remAudio) { remAudio = document.createElement('audio'); remAudio.id = 'mrpRemoteAudio'; remAudio.autoplay = true; document.body.appendChild(remAudio); }
    remAudio.srcObject = e.streams[0];
  };
  pc.onicecandidate = e => { if (e.candidate) sendSignal('webrtc_ice', { candidate: e.candidate }); };
  await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await sendSignal('webrtc_answer', { sdp: answer });
}

async function handleWebRTCAnswer(data) {
  if (musicRoomState.pc) await musicRoomState.pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(() => {});
}

function stopWebRTC() {
  if (musicRoomState.pc) { musicRoomState.pc.close(); musicRoomState.pc = null; }
  const remAudio = document.getElementById('mrpRemoteAudio');
  if (remAudio) remAudio.remove();
  cancelAnimationFrame(_visAF);
}

// ─────────────────── PROGRESS POLL ────────────────────────────
let _progressRAF = null;
function startProgressSync() {
  function tick() {
    updateRoomProgress();
    if (musicRoomState.mode === 'karaoke') syncKaraokeLines();
    _progressRAF = requestAnimationFrame(tick);
  }
  cancelAnimationFrame(_progressRAF);
  tick();
}

// ─────────────────── INVITE RECEIVER ──────────────────────────
// Hook into renderMessages to detect _music_room_invite_ messages
const _origRenderMessages = window.renderMessages;
window.renderMessages = function(msgs) {
  _origRenderMessages && _origRenderMessages(msgs);
  // Check latest message for invite
  const last = msgs[msgs.length - 1];
  if (last && last.from_key !== USER_KEY && last.content?.startsWith('🎵 _music_room_invite_|')) {
    const parts = last.content.split('|');
    const sessionId = parts[1], mode = parts[2], trackTitle = parts[3];
    showInviteBanner(sessionId, mode, trackTitle, last.from_key);
  }
};

let _pendingInviteSession = null;
function showInviteBanner(sessionId, mode, trackTitle, fromKey) {
  _pendingInviteSession = { sessionId, mode, fromKey };
  document.getElementById('mrpInviteTitle').textContent =
    mode === 'karaoke' ? '🎤 Ajakan Karaoke Mode' : '🎧 Ajakan Listening Together';
  document.getElementById('mrpInviteSub').textContent =
    `Lagu: ${trackTitle} — bergabung?`;
  document.getElementById('mrpInviteBanner').classList.add('show');
  setTimeout(() => document.getElementById('mrpInviteBanner').classList.remove('show'), 15000);
}

async function acceptMusicRoom() {
  if (!_pendingInviteSession) return;
  document.getElementById('mrpInviteBanner').classList.remove('show');
  const { sessionId, mode, fromKey } = _pendingInviteSession;

  // Fetch room info dari supabase
  try {
    const rows = await sb.get(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(sessionId)}`);
    const room = rows?.[0];
    if (!room || room.status === 'ended') { toast('Room sudah berakhir'); return; }

    // Set state as guest
    musicRoomState = {
      ...musicRoomState,
      active: true, mode,
      sessionId,
      partnerKey: fromKey,
      partnerName: document.getElementById('chatRoomName')?.textContent || fromKey,
      isHost: false,
      karaokeMyTurn: mode === 'karaoke' ? false : false,
    };

    // If no track playing, play host's track
    if (!currentTrack || currentTrack.id !== room.track_id) {
      await playTrackObj({ id: room.track_id, title: room.track_title, artist: room.track_artist, audio: room.track_audio, thumbnail: room.track_thumb });
      audio.currentTime = room.host_pos || 0;
    }

    // Notify host
    await sendSignal('partner_joined', { name: USER_KEY });
    await sb.patch(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(sessionId)}`, { status: 'active' }).catch(() => {});

    openMusicRoomPanel();
    renderMusicRoomBody();
    startRoomSync();
    if (mode === 'karaoke') loadKaraokeLyrics();
    toast('🎵 Berhasil bergabung ke Music Room!');
  } catch (e) {
    toast('Gagal bergabung: ' + e.message);
  }
}

function declineMusicRoom() {
  document.getElementById('mrpInviteBanner').classList.remove('show');
  _pendingInviteSession = null;
}

// Expose needed functions
window.initMusicRoom     = initMusicRoom;
window.openMusicRoomPanel= openMusicRoomPanel;
window.closeMusicRoom    = closeMusicRoom;
window.endMusicRoom      = endMusicRoom;
window.toggleRoomMic     = toggleRoomMic;
window.switchKaraokeTurn = switchKaraokeTurn;
window.acceptMusicRoom   = acceptMusicRoom;
window.declineMusicRoom  = declineMusicRoom;
window.togglePlusMenu    = togglePlusMenu;

