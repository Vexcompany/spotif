// ════════════════════════════════════════════════════════════════
//  MUSIC ROOM v2 — Listening Together & Karaoke Mode
//  Fix: sync loop reset bug, karaoke vocal filter, back-to-room UI
// ════════════════════════════════════════════════════════════════

// ───────────────────────── STATE ──────────────────────────────
let musicRoomState = {
  active: false,
  mode: null,           // 'listen' | 'karaoke'
  sessionId: null,
  partnerKey: null,
  partnerName: null,
  isHost: false,
  karaokeMyTurn: false,
  localStream: null,
  remoteStream: null,
  pc: null,
  micActive: false,
  listenInterval: null,
  sigInterval: null,
  // Karaoke vocal filter
  karaokeCtx: null,
  karaokeSource: null,
  vocalGain: null,
  karaokeActive: false,
};

const MUSIC_ROOM_TABLE = 'music_rooms';
const MUSIC_SIG_TABLE  = 'music_signals';

// ───────────────────────── CSS ────────────────────────────────
(function injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
/* ── FLOATING RETURN BUTTON ───────────────────────────────── */
.mrp-return-fab {
  position: fixed;
  bottom: calc(var(--nav-h) + 90px);
  right: 14px;
  z-index: 490;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--dyn1), var(--p));
  box-shadow: 0 4px 20px rgba(29,185,84,.5);
  border: none; cursor: pointer;
  display: none; align-items: center; justify-content: center;
  color: #fff; font-size: 1rem;
  transition: all .2s;
  animation: fabPop .4s cubic-bezier(.16,1,.3,1);
}
.mrp-return-fab.show { display: flex; }
.mrp-return-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(29,185,84,.7); }
@keyframes fabPop {
  from { transform: scale(0) rotate(-45deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg); opacity: 1; }
}
.mrp-return-fab-pip {
  position: absolute; top: -3px; right: -3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--pk); border: 2px solid var(--bg);
  animation: pipPulse 1.4s ease-in-out infinite;
}
@keyframes pipPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }

/* ── PLUS MENU BUTTON ─────────────────────────────────────── */
.chat-plus-btn {
  width: 42px; height: 42px; border-radius: 12px;
  border: 1px solid var(--bd); background: var(--s2);
  color: var(--mt); font-size: 1.1rem;
  cursor: pointer; display: flex; align-items: center;
  justify-content: center; transition: all .2s; flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.chat-plus-btn:hover,
.chat-plus-btn:active { background: var(--s3); color: var(--dyn1); border-color: var(--dyn1); }
.chat-plus-btn.active { background: var(--dyn1); color: #000; border-color: var(--dyn1); transform: rotate(45deg); }

/* ── PLUS POPUP MENU ──────────────────────────────────────── */
.chat-plus-menu {
  position: absolute; bottom: calc(100% + 8px); left: 0;
  background: var(--s2); border: 1px solid var(--bd2);
  border-radius: 16px; padding: 6px;
  display: none; flex-direction: column; gap: 2px;
  box-shadow: 0 8px 32px rgba(0,0,0,.65);
  z-index: 10; min-width: 230px;
  animation: menuIn .22s cubic-bezier(.16,1,.3,1);
}
.chat-plus-menu.open { display: flex; }
@keyframes menuIn {
  from { opacity: 0; transform: translateY(6px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cpm-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 12px; border-radius: 12px; cursor: pointer;
  transition: background .16s; border: none; background: transparent;
  text-align: left; font-family: inherit; color: var(--tx); width: 100%;
  -webkit-tap-highlight-color: transparent;
}
.cpm-item:hover, .cpm-item:active { background: var(--s3); }
.cpm-icon {
  width: 38px; height: 38px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; flex-shrink: 0;
}
.cpm-icon.listen  { background: linear-gradient(135deg,#1DB954,#00b4d8); color:#000; }
.cpm-icon.karaoke { background: linear-gradient(135deg,var(--pk),var(--p)); color:#fff; }
.cpm-icon.active-room { background: linear-gradient(135deg,var(--yw),var(--pk)); color:#000; }
.cpm-text { flex:1 }
.cpm-title { font-size:.82rem; font-weight:700; margin-bottom:1px; }
.cpm-sub   { font-size:.64rem; color:var(--mt); }
.cpm-divider { height:1px; background:var(--bd); margin: 3px 4px; }

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
  background: rgba(7,7,26,.96); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--bd); flex-shrink: 0;
}
.mrp-back {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--bd); background: var(--s2);
  color: var(--mt); display: flex; align-items: center;
  justify-content: center; cursor: pointer; transition: all .2s;
  -webkit-tap-highlight-color: transparent;
}
.mrp-back:hover { background: var(--s3); color: var(--tx); }
.mrp-title { font-family:'Syne',sans-serif; font-size:.95rem; font-weight:800; flex:1; }
.mrp-badge {
  display:flex; align-items:center; gap:4px;
  padding:4px 10px; border-radius:20px; font-size:.62rem; font-weight:700;
}
.mrp-badge.listen  { background:rgba(29,185,84,.15);  color:var(--dyn1); border:1px solid rgba(29,185,84,.3); }
.mrp-badge.karaoke { background:rgba(247,37,133,.15); color:var(--pk);   border:1px solid rgba(247,37,133,.3); }

.mrp-body {
  flex:1; overflow-y:auto; padding:14px;
  display:flex; flex-direction:column; gap:14px;
  scrollbar-width:none;
}
.mrp-body::-webkit-scrollbar { display:none; }

/* Track card */
.mrp-track-card {
  background:var(--s1); border:1px solid var(--bd);
  border-radius:18px; padding:14px;
  display:flex; align-items:center; gap:14px;
}
.mrp-track-img {
  width:60px; height:60px; border-radius:12px;
  overflow:hidden; flex-shrink:0; position:relative;
}
.mrp-track-img img { width:100%; height:100%; object-fit:cover; }
.mrp-track-playing {
  position:absolute; inset:0; background:rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center; gap:2px;
}
.mrp-bar { width:3px; border-radius:2px; background:var(--dyn1); animation:barDance .6s ease-in-out infinite alternate; }
.mrp-bar:nth-child(2){animation-delay:.1s} .mrp-bar:nth-child(3){animation-delay:.2s}
@keyframes barDance { from{height:5px} to{height:20px} }
.mrp-track-inf { flex:1; min-width:0; }
.mrp-track-t { font-size:.9rem; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
.mrp-track-a { font-size:.72rem; color:var(--mt); }
.mrp-track-prog { margin-top:8px; height:3px; background:var(--s4); border-radius:2px; overflow:hidden; }
.mrp-track-fill { height:100%; background:linear-gradient(90deg,var(--dyn1),var(--p)); border-radius:2px; transition:width .4s linear; }

/* Users */
.mrp-users {
  display:flex; align-items:center; justify-content:center; gap:20px;
  padding:14px; background:var(--s1); border:1px solid var(--bd); border-radius:18px;
}
.mrp-user { display:flex; flex-direction:column; align-items:center; gap:7px; }
.mrp-user-av {
  width:50px; height:50px; border-radius:50%;
  background:linear-gradient(135deg,var(--p),var(--b));
  display:flex; align-items:center; justify-content:center;
  font-size:.85rem; font-weight:800; color:#fff; position:relative;
}
.mrp-user-av.me { background:linear-gradient(135deg,var(--dyn1),var(--p)); }
.mrp-user-av.speaking::after {
  content:''; position:absolute; inset:-3px; border-radius:50%;
  border:2px solid var(--pk); animation:speakPulse .8s ease-in-out infinite;
}
@keyframes speakPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(1.1)} }
.mrp-user-mic {
  position:absolute; bottom:-2px; right:-2px;
  width:18px; height:18px; border-radius:50%;
  background:var(--bg); border:1.5px solid var(--bd);
  display:flex; align-items:center; justify-content:center; font-size:.52rem;
}
.mrp-user-mic.on { background:var(--pk); color:#fff; border-color:var(--pk); }
.mrp-user-nm { font-size:.72rem; font-weight:700; max-width:80px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mrp-user-role { font-size:.58rem; color:var(--mt); }
.mrp-link { width:28px; height:28px; border-radius:50%; background:rgba(29,185,84,.12); border:1px solid rgba(29,185,84,.25); display:flex; align-items:center; justify-content:center; color:var(--dyn1); font-size:.75rem; }

/* Controls */
.mrp-controls { display:flex; gap:8px; flex-wrap:wrap; }
.mrp-ctrl-btn {
  flex:1; min-width:120px; padding:12px 8px;
  border-radius:14px; border:1px solid var(--bd); background:var(--s2);
  color:var(--tx); font-size:.78rem; font-weight:600;
  cursor:pointer; transition:all .2s; font-family:inherit;
  display:flex; align-items:center; justify-content:center; gap:7px;
  -webkit-tap-highlight-color:transparent;
}
.mrp-ctrl-btn:hover, .mrp-ctrl-btn:active { background:var(--s3); border-color:var(--dyn1); }
.mrp-ctrl-btn.primary { background:linear-gradient(135deg,var(--dyn1),var(--p)); border:none; color:#fff; }
.mrp-ctrl-btn.danger  { border-color:rgba(255,77,109,.35); color:var(--rd); }
.mrp-ctrl-btn.danger:hover, .mrp-ctrl-btn.danger:active { background:rgba(255,77,109,.1); }
.mrp-ctrl-btn.active  { background:var(--pk); border-color:var(--pk); color:#fff; }

/* ── KARAOKE ─────────────────────────────────────────────── */
.mrp-karaoke-box {
  background:var(--s1); border:1px solid var(--bd);
  border-radius:18px; overflow:hidden;
}
.mrp-karaoke-header {
  padding:11px 14px; border-bottom:1px solid var(--bd);
  display:flex; align-items:center; justify-content:space-between;
}
.mrp-karaoke-title { font-size:.8rem; font-weight:700; display:flex; align-items:center; gap:6px; }
.mrp-turn-badge { padding:3px 10px; border-radius:20px; font-size:.64rem; font-weight:700; }
.mrp-turn-badge.my-turn    { background:rgba(247,37,133,.2); color:var(--pk);   border:1px solid rgba(247,37,133,.4); }
.mrp-turn-badge.their-turn { background:rgba(29,185,84,.12); color:var(--dyn1); border:1px solid rgba(29,185,84,.3); }

.mrp-lyric-lines {
  max-height:300px; overflow-y:auto; padding:10px 12px;
  display:flex; flex-direction:column; gap:5px; scrollbar-width:none;
}
.mrp-lyric-lines::-webkit-scrollbar { display:none; }
.mrp-lyric-line {
  padding:7px 11px; border-radius:10px; font-size:.8rem; line-height:1.5;
  transition:all .25s; color:var(--mt); border:1px solid transparent;
}
.mrp-lyric-line.mine   { border-color:rgba(247,37,133,.18); background:rgba(247,37,133,.04); color:rgba(247,37,133,.75); }
.mrp-lyric-line.theirs { border-color:rgba(29,185,84,.18);  background:rgba(29,185,84,.04);  color:rgba(29,185,84,.75); }
.mrp-lyric-line.active-mine   { background:rgba(247,37,133,.22); border-color:var(--pk);   color:#fff; font-weight:700; font-size:.86rem; transform:scale(1.015); }
.mrp-lyric-line.active-theirs { background:rgba(29,185,84,.2);   border-color:var(--dyn1); color:#fff; font-weight:700; font-size:.86rem; transform:scale(1.015); }

/* Voice vis */
.mrp-voice-vis {
  display:none; align-items:center; justify-content:center; gap:3px;
  height:32px; padding:0 14px;
}
.mrp-voice-vis.show { display:flex; }
.mrp-vbar { width:3px; border-radius:2px; background:var(--pk); height:5px; transition:height .08s; }

/* Karaoke info pill */
.mrp-karaoke-info {
  display:flex; align-items:center; gap:8px; padding:10px 14px;
  border-top:1px solid var(--bd); font-size:.7rem; color:var(--mt);
}
.mrp-karaoke-info i { color:var(--pk); }

/* Waiting */
.mrp-waiting {
  text-align:center; padding:28px 16px;
  display:flex; flex-direction:column; align-items:center; gap:12px;
}
.mrp-waiting-spinner {
  width:44px; height:44px; border-radius:50%;
  border:3px solid var(--s4); border-top-color:var(--dyn1);
  animation:spin .8s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }
.mrp-waiting-text { font-size:.82rem; color:var(--mt); }

/* Invite banner */
.mrp-invite-banner {
  position:fixed; bottom:calc(var(--nav-h) + 90px); left:12px; right:12px;
  z-index:550; background:var(--s2); border:1px solid rgba(29,185,84,.4);
  border-radius:16px; padding:14px; box-shadow:0 8px 32px rgba(0,0,0,.6);
  display:none; flex-direction:column; gap:10px;
  animation:slideUp .35s cubic-bezier(.16,1,.3,1);
}
.mrp-invite-banner.show { display:flex; }
.mrp-invite-title { font-size:.84rem; font-weight:700; display:flex; align-items:center; gap:6px; }
.mrp-invite-sub   { font-size:.72rem; color:var(--mt); }
.mrp-invite-btns  { display:flex; gap:8px; }
.mrp-invite-accept  { flex:1; padding:9px; border-radius:10px; border:none; background:linear-gradient(135deg,var(--dyn1),var(--p)); color:#fff; font-weight:700; font-size:.78rem; cursor:pointer; font-family:inherit; }
.mrp-invite-decline { padding:9px 16px; border-radius:10px; border:1px solid var(--bd); background:transparent; color:var(--mt); font-size:.78rem; cursor:pointer; font-family:inherit; }

/* ── RESPONSIVE FIX: qp-grid ──────────────────────────────── */
/* Override default 5-col to responsive */
.qp-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(140px, 42vw), 1fr)) !important;
}
@media (max-width: 480px) {
  .qp-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
  }
  .mrp-ctrl-btn { min-width: 100px; font-size: .74rem; }
  .mrp-lyric-line { font-size: .76rem; }
}
@media (max-width: 360px) {
  .qp-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .mrp-controls { gap: 6px; }
  .mrp-ctrl-btn { padding: 10px 6px; font-size: .7rem; }
}
`;
  document.head.appendChild(s);
})();

// ─────────────────── HTML ─────────────────────────────────────
(function injectHTML() {
  // 1. Plus button in chat input row
  const chatInputRow = document.querySelector('#chatRoom .chat-input-row');
  if (chatInputRow) {
    const btn = document.createElement('button');
    btn.className = 'chat-plus-btn';
    btn.id = 'chatPlusBtn';
    btn.title = 'Fitur Musik';
    btn.innerHTML = '<i class="fas fa-plus"></i>';
    btn.onclick = togglePlusMenu;
    chatInputRow.insertBefore(btn, chatInputRow.firstChild);
  }

  // 2. Plus popup menu
  const chatInputWrap = document.querySelector('#chatRoom .chat-input-wrap');
  if (chatInputWrap) {
    chatInputWrap.style.position = 'relative';
    const menu = document.createElement('div');
    menu.className = 'chat-plus-menu';
    menu.id = 'chatPlusMenu';
    menu.innerHTML = `
      <div id="cpmActiveRoom" style="display:none">
        <button class="cpm-item" onclick="openMusicRoomPanel();togglePlusMenu()">
          <div class="cpm-icon active-room"><i class="fas fa-headphones"></i></div>
          <div class="cpm-text">
            <div class="cpm-title" id="cpmActiveRoomTitle">Kembali ke Room</div>
            <div class="cpm-sub">Room musik sedang aktif ●</div>
          </div>
        </button>
        <div class="cpm-divider"></div>
      </div>
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
          <div class="cpm-sub">Saut-sautan lirik + suara live</div>
        </div>
      </button>
    `;
    chatInputWrap.appendChild(menu);
  }

  // 3. Music Room full panel
  const panel = document.createElement('div');
  panel.className = 'music-room-panel';
  panel.id = 'musicRoomPanel';
  panel.innerHTML = `
    <div class="mrp-header">
      <button class="mrp-back" onclick="closeMusicRoom()" title="Minimize"><i class="fas fa-chevron-down"></i></button>
      <div class="mrp-title" id="mrpTitle">Music Room</div>
      <div class="mrp-badge listen" id="mrpBadge"><i class="fas fa-circle" style="font-size:.4rem"></i>&nbsp;LIVE</div>
    </div>
    <div class="mrp-body" id="mrpBody"></div>
  `;
  document.body.appendChild(panel);

  // 4. Floating return FAB (shows when panel is minimized)
  const fab = document.createElement('button');
  fab.className = 'mrp-return-fab';
  fab.id = 'mrpReturnFab';
  fab.title = 'Kembali ke Music Room';
  fab.innerHTML = '<i class="fas fa-headphones"></i><div class="mrp-return-fab-pip"></div>';
  fab.onclick = openMusicRoomPanel;
  document.body.appendChild(fab);

  // 5. Invite banner
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

// ─────────────────── PLUS MENU ────────────────────────────────
function togglePlusMenu() {
  const menu = document.getElementById('chatPlusMenu');
  const btn  = document.getElementById('chatPlusBtn');
  // Show/hide active room option
  const activeDiv = document.getElementById('cpmActiveRoom');
  if (activeDiv) {
    activeDiv.style.display = musicRoomState.active ? 'block' : 'none';
    const title = document.getElementById('cpmActiveRoomTitle');
    if (title) title.textContent = musicRoomState.mode === 'karaoke' ? 'Kembali ke Karaoke' : 'Kembali ke Listening';
  }
  const isOpen = menu.classList.toggle('open');
  btn.classList.toggle('active', isOpen);
  if (isOpen) {
    const close = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove('open');
        btn.classList.remove('active');
      }
      document.removeEventListener('click', close);
    };
    setTimeout(() => document.addEventListener('click', close), 50);
  }
}

// ─────────────────── INIT ─────────────────────────────────────
async function initMusicRoom(mode) {
  // Close plus menu
  document.getElementById('chatPlusMenu')?.classList.remove('open');
  document.getElementById('chatPlusBtn')?.classList.remove('active');

  if (!currentChatWith) { toast('Buka percakapan dulu'); return; }
  if (!currentTrack)    { toast('Putar lagu dulu sebelum memulai room'); return; }

  // If room already active → just open panel
  if (musicRoomState.active) { openMusicRoomPanel(); return; }

  const sessionId = `${USER_KEY}__${currentChatWith}__${Date.now()}`;
  musicRoomState = {
    ...musicRoomState,
    active: true, mode, sessionId,
    partnerKey: currentChatWith,
    partnerName: document.getElementById('chatRoomName')?.textContent || currentChatWith,
    isHost: true,
    karaokeMyTurn: true,
  };

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

  await sb.post('messages', {
    from_key: USER_KEY,
    to_key: currentChatWith,
    content: `🎵 _music_room_invite_|${sessionId}|${mode}|${currentTrack.title}`,
    created_at: new Date().toISOString(),
  }).catch(() => {});

  openMusicRoomPanel();
  renderMusicRoomBody();
  startRoomSync();
  if (mode === 'karaoke') {
    setTimeout(() => loadKaraokeLyrics(), 500);
  }
}

// ─────────────────── PANEL OPEN/CLOSE ─────────────────────────
function openMusicRoomPanel() {
  const panel = document.getElementById('musicRoomPanel');
  panel.classList.add('open');
  document.getElementById('mrpReturnFab').classList.remove('show');

  const isKaraoke = musicRoomState.mode === 'karaoke';
  document.getElementById('mrpTitle').textContent = isKaraoke ? '🎤 Karaoke Mode' : '🎧 Listening Together';
  const badge = document.getElementById('mrpBadge');
  badge.className = `mrp-badge ${isKaraoke ? 'karaoke' : 'listen'}`;
  badge.innerHTML = `<i class="fas fa-circle" style="font-size:.4rem"></i>&nbsp;LIVE`;

  startProgressSync();
}

function closeMusicRoom() {
  // "Minimize" — keep room alive, show FAB to return
  document.getElementById('musicRoomPanel').classList.remove('open');
  cancelAnimationFrame(_progressRAF);
  if (musicRoomState.active) {
    document.getElementById('mrpReturnFab').classList.add('show');
  }
}

async function endMusicRoom() {
  if (musicRoomState.sessionId) {
    await sb.patch(MUSIC_ROOM_TABLE,
      `session_id=eq.${encodeURIComponent(musicRoomState.sessionId)}`,
      { status: 'ended' }
    ).catch(() => {});
  }
  stopRoomSync();
  stopWebRTC();
  stopKaraokeFilter();
  cancelAnimationFrame(_progressRAF);

  const prevState = { ...musicRoomState };
  musicRoomState = {
    active: false, mode: null, sessionId: null, partnerKey: null, partnerName: null,
    isHost: false, karaokeMyTurn: false,
    localStream: null, remoteStream: null, pc: null, micActive: false,
    listenInterval: null, sigInterval: null,
    karaokeCtx: null, karaokeSource: null, vocalGain: null, karaokeActive: false,
  };

  document.getElementById('musicRoomPanel').classList.remove('open');
  document.getElementById('mrpReturnFab').classList.remove('show');
  karaokeLines = [];
  toast(`Room ditutup${prevState.mode === 'karaoke' ? ' 🎤' : ' 🎧'}`);
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
        <div class="mrp-track-prog"><div class="mrp-track-fill" id="mrpTrackFill" style="width:0%"></div></div>
      </div>
    </div>` : '<div style="text-align:center;color:var(--mt);padding:16px;font-size:.8rem">Tidak ada lagu diputar</div>';

  const usersRow = `
    <div class="mrp-users">
      <div class="mrp-user">
        <div class="mrp-user-av me" id="mrpMeAv">
          ${meIni}
          <div class="mrp-user-mic" id="mrpMeMic"><i class="fas fa-microphone-slash"></i></div>
        </div>
        <div class="mrp-user-nm">Kamu</div>
        <div class="mrp-user-role">${s.isHost ? 'Host' : 'Guest'}</div>
      </div>
      <div class="mrp-link"><i class="fas fa-music"></i></div>
      <div class="mrp-user">
        <div class="mrp-user-av" id="mrpTheyAv">${theyIni}</div>
        <div class="mrp-user-nm">${s.partnerName || '–'}</div>
        <div class="mrp-user-role" id="mrpTheyRole">Menunggu...</div>
      </div>
    </div>`;

  let extra = '';
  if (s.mode === 'karaoke') {
    extra = `
      <div class="mrp-karaoke-box">
        <div class="mrp-karaoke-header">
          <div class="mrp-karaoke-title"><i class="fas fa-microphone" style="color:var(--pk)"></i> Karaoke</div>
          <div class="mrp-turn-badge ${s.karaokeMyTurn ? 'my-turn' : 'their-turn'}" id="mrpTurnBadge">
            ${s.karaokeMyTurn ? 'Giliran Kamu 🎤' : `Giliran ${s.partnerName} 🎧`}
          </div>
        </div>
        <div class="mrp-lyric-lines" id="mrpLyricLines">
          <div style="text-align:center;color:var(--mt);padding:20px;font-size:.79rem">Memuat lirik...</div>
        </div>
        <div class="mrp-voice-vis" id="mrpVoiceVis">
          ${Array.from({length:12},(_,i)=>`<div class="mrp-vbar" id="mrpVbar${i}"></div>`).join('')}
        </div>
        <div class="mrp-karaoke-info">
          <i class="fas fa-info-circle"></i>
          Vokal lagu akan di-mute saat giliranmu. Aktifkan mic untuk nyanyi.
        </div>
      </div>
      <div class="mrp-controls">
        <button class="mrp-ctrl-btn" id="mrpMicBtn" onclick="toggleRoomMic()">
          <i class="fas fa-microphone-slash"></i> Mikrofon
        </button>
        <button class="mrp-ctrl-btn" onclick="switchKaraokeTurn()">
          <i class="fas fa-exchange-alt"></i> Ganti Giliran
        </button>
        <button class="mrp-ctrl-btn danger" onclick="endMusicRoom()">
          <i class="fas fa-door-open"></i> Tutup Room
        </button>
      </div>`;
  } else {
    extra = `
      <div id="mrpWaitingSection" class="${s.isHost ? 'mrp-waiting' : ''}">
        ${s.isHost ? `
          <div class="mrp-waiting-spinner"></div>
          <div class="mrp-waiting-text">Menunggu ${s.partnerName} bergabung...</div>
        ` : ''}
      </div>
      <div class="mrp-controls">
        <button class="mrp-ctrl-btn" id="mrpMicBtn" onclick="toggleRoomMic()">
          <i class="fas fa-microphone-slash"></i> Mikrofon
        </button>
        <button class="mrp-ctrl-btn danger" onclick="endMusicRoom()">
          <i class="fas fa-door-open"></i> Tutup Room
        </button>
      </div>`;
  }

  body.innerHTML = trackCard + usersRow + extra;
}

// ─────────────────── SYNC LOOP — FIXED ────────────────────────
// BUG FIX: Host sebelumnya masuk else-branch dan ikut di-reset.
// Sekarang: Host HANYA broadcast. Guest HANYA follow.
// Threshold dinaikkan ke 4 detik + buffer agar tidak ganggu playback.
function startRoomSync() {
  // Broadcast / follow posisi audio
  musicRoomState.listenInterval = setInterval(async () => {
    if (!musicRoomState.active) return;
    const s = musicRoomState;

    if (s.isHost) {
      // Host: hanya tulis posisi ke DB, TIDAK membaca atau mengubah currentTime
      if (!currentTrack) return;
      sb.patch(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(s.sessionId)}`, {
        host_pos: audio.currentTime,
        updated_at: new Date().toISOString(),
        status: 'active',
      }).catch(() => {});

    } else {
      // Guest: baca posisi host, koreksi hanya jika jauh
      try {
        const rows = await sb.get(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(s.sessionId)}`);
        if (!rows?.[0]) return;
        const r = rows[0];
        if (r.status === 'ended') { endMusicRoom(); return; }

        // Koreksi hanya jika drift > 4 detik (bukan 2 detik!)
        // dan audio tidak sedang di-seek manual
        const diff = Math.abs(audio.currentTime - r.host_pos);
        if (diff > 4 && !audio.seeking) {
          audio.currentTime = r.host_pos;
        }
      } catch {}
    }
  }, 3000); // interval 3 detik (bukan 2!)

  // Signal polling
  musicRoomState.sigInterval = setInterval(pollSignals, 2500);
}

function stopRoomSync() {
  clearInterval(musicRoomState.listenInterval);
  clearInterval(musicRoomState.sigInterval);
  musicRoomState.listenInterval = null;
  musicRoomState.sigInterval = null;
}

// ─────────────────── SIGNALS ──────────────────────────────────
async function pollSignals() {
  if (!musicRoomState.active || !musicRoomState.sessionId) return;
  try {
    const rows = await sb.get(MUSIC_SIG_TABLE,
      `session_id=eq.${encodeURIComponent(musicRoomState.sessionId)}&to_key=eq.${encodeURIComponent(USER_KEY)}&handled=eq.false&order=created_at.asc&limit=5`
    );
    for (const sig of (rows || [])) {
      await handleSignal(sig);
      sb.patch(MUSIC_SIG_TABLE, `id=eq.${sig.id}`, { handled: true }).catch(() => {});
    }
  } catch {}
}

async function sendSignal(type, data) {
  if (!musicRoomState.sessionId) return;
  await sb.post(MUSIC_SIG_TABLE, {
    session_id: musicRoomState.sessionId,
    from_key: USER_KEY,
    to_key: musicRoomState.partnerKey,
    type,
    data: JSON.stringify(data),
    handled: false,
    created_at: new Date().toISOString(),
  }).catch(() => {});
}

async function handleSignal(sig) {
  const data = JSON.parse(sig.data || '{}');
  switch (sig.type) {
    case 'partner_joined':
      musicRoomState.partnerName = data.name || musicRoomState.partnerName;
      const roleEl = document.getElementById('mrpTheyRole');
      if (roleEl) roleEl.textContent = 'Guest';
      const waitEl = document.getElementById('mrpWaitingSection');
      if (waitEl) waitEl.innerHTML = '';
      toast(`${musicRoomState.partnerName} bergabung! 🎵`);
      if (musicRoomState.mode === 'karaoke') loadKaraokeLyrics();
      break;
    case 'karaoke_turn':
      musicRoomState.karaokeMyTurn = data.yourTurn === true;
      updateKaraokeTurnUI();
      applyKaraokeVocalFilter();
      break;
    case 'webrtc_offer':
      await handleWebRTCOffer(data);
      break;
    case 'webrtc_answer':
      await handleWebRTCAnswer(data);
      break;
    case 'webrtc_ice':
      if (musicRoomState.pc) {
        musicRoomState.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
      }
      break;
  }
}

// ─────────────────── KARAOKE LYRICS ───────────────────────────
let karaokeLines = [];

async function loadKaraokeLyrics() {
  if (!currentTrack) return;
  const el = document.getElementById('mrpLyricLines');
  if (el) el.innerHTML = '<div style="text-align:center;color:var(--mt);padding:20px;font-size:.79rem"><i class="fas fa-circle-notch fa-spin"></i> Memuat lirik...</div>';
  try {
    const data = await fetchLyrics(currentTrack.title, currentTrack.artist);
    if (data?.type === 'synced' && data.data?.length) {
      // Distribusi: setiap 2 baris bergantian antara host dan guest
      karaokeLines = data.data.map((l, i) => ({
        ...l,
        mine: musicRoomState.isHost
          ? (Math.floor(i / 2) % 2 === 0)
          : (Math.floor(i / 2) % 2 === 1),
      }));
      renderKaraokeLines();
      applyKaraokeVocalFilter();
    } else {
      if (el) el.innerHTML = '<div style="text-align:center;color:var(--mt);padding:20px;font-size:.79rem">Lirik tidak tersedia 🎵<br><small style="opacity:.6">Karaoke aktif dengan mic saja</small></div>';
    }
  } catch {
    if (el) el.innerHTML = '<div style="text-align:center;color:var(--mt);padding:16px;font-size:.79rem">Gagal memuat lirik</div>';
  }
}

function renderKaraokeLines() {
  const el = document.getElementById('mrpLyricLines');
  if (!el) return;
  el.innerHTML = karaokeLines.map((l, i) => `
    <div class="mrp-lyric-line ${l.mine ? 'mine' : 'theirs'}" id="kl${i}">
      <span style="font-size:.58rem;opacity:.55;display:block;margin-bottom:2px">${l.mine ? '🎤 Kamu' : `🎵 ${musicRoomState.partnerName}`}</span>
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
  if (activeIdx === _lastKaraokeIdx) return; // no change
  _lastKaraokeIdx = activeIdx;

  karaokeLines.forEach((l, i) => {
    const el = document.getElementById(`kl${i}`);
    if (!el) return;
    if (i === activeIdx) {
      el.className = `mrp-lyric-line ${l.mine ? 'active-mine' : 'active-theirs'}`;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.className = `mrp-lyric-line ${l.mine ? 'mine' : 'theirs'}`;
    }
  });

  // Auto-turn: mute/unmute vokal berdasarkan baris aktif
  if (activeIdx >= 0) {
    const isMyLine = karaokeLines[activeIdx].mine;
    if (isMyLine !== musicRoomState.karaokeMyTurn) {
      musicRoomState.karaokeMyTurn = isMyLine;
      updateKaraokeTurnUI();
      applyKaraokeVocalFilter();
    }
  }
}
let _lastKaraokeIdx = -1;

function updateKaraokeTurnUI() {
  const badge = document.getElementById('mrpTurnBadge');
  if (!badge) return;
  const s = musicRoomState;
  badge.className = `mrp-turn-badge ${s.karaokeMyTurn ? 'my-turn' : 'their-turn'}`;
  badge.textContent = s.karaokeMyTurn
    ? 'Giliran Kamu 🎤'
    : `Giliran ${s.partnerName} 🎧`;
}

async function switchKaraokeTurn() {
  musicRoomState.karaokeMyTurn = !musicRoomState.karaokeMyTurn;
  updateKaraokeTurnUI();
  applyKaraokeVocalFilter();
  await sendSignal('karaoke_turn', { yourTurn: !musicRoomState.karaokeMyTurn });
  toast(musicRoomState.karaokeMyTurn ? '🎤 Giliran kamu — Mic siap!' : '🎧 Dengerin partner nyanyi');
}

// ─────────────────── KARAOKE VOCAL FILTER ─────────────────────
// Teknik: saat giliran kamu → turunkan volume lagu asli (vokal ikut turun)
// sehingga user bisa nyanyi tanpa distraksi. Saat giliran partner → volume normal.
// Ini berbeda dari "vocal removal" penuh (butuh stem separation yang berat),
// tapi efeknya cukup terasa untuk karaoke casual.

let _karaokeGainNode = null;
let _karaokeCtx = null;
let _karaokeMediaSrc = null;

function applyKaraokeVocalFilter() {
  if (!musicRoomState.active || musicRoomState.mode !== 'karaoke') return;

  const audioEl = document.getElementById('audioEl');
  if (!audioEl) return;

  const isMyTurn = musicRoomState.karaokeMyTurn;

  try {
    // Lazy-init Web Audio context
    if (!_karaokeCtx) {
      _karaokeCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_karaokeCtx.state === 'suspended') _karaokeCtx.resume();

    if (!_karaokeMediaSrc) {
      _karaokeMediaSrc = _karaokeCtx.createMediaElementSource(audioEl);
      _karaokeGainNode = _karaokeCtx.createGain();
      _karaokeMediaSrc.connect(_karaokeGainNode);
      _karaokeGainNode.connect(_karaokeCtx.destination);
    }

    // Saat giliran kamu: kurangi volume jadi 0.15 (hampir mute, vokal hilang)
    // Saat giliran partner: volume normal 1.0 (dengerin lagu + suara partner via WebRTC)
    const targetGain = isMyTurn ? 0.15 : 1.0;
    _karaokeGainNode.gain.setTargetAtTime(targetGain, _karaokeCtx.currentTime, 0.3);

    musicRoomState.karaokeActive = true;
  } catch (e) {
    // Fallback: langsung atur volume audioEl
    audioEl.volume = isMyTurn ? 0.12 : 0.7;
  }
}

function stopKaraokeFilter() {
  if (_karaokeGainNode) {
    try { _karaokeGainNode.gain.setTargetAtTime(1.0, _karaokeCtx.currentTime, 0.1); } catch {}
  }
  // Restore volume
  const audioEl = document.getElementById('audioEl');
  if (audioEl) audioEl.volume = 0.7;
  musicRoomState.karaokeActive = false;
}

// ─────────────────── MIC / WEBRTC ─────────────────────────────
async function toggleRoomMic() {
  if (musicRoomState.micActive) stopMic();
  else await startMic();
}

async function startMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    musicRoomState.localStream = stream;
    musicRoomState.micActive = true;

    const btn = document.getElementById('mrpMicBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-microphone"></i> Mic Aktif'; btn.classList.add('active'); }
    const mic = document.getElementById('mrpMeMic');
    if (mic) { mic.className = 'mrp-user-mic on'; mic.innerHTML = '<i class="fas fa-microphone"></i>'; }

    const vis = document.getElementById('mrpVoiceVis');
    if (vis) vis.classList.add('show');
    startVoiceVis(stream);
    await startWebRTC(stream);

    if (musicRoomState.mode === 'karaoke' && musicRoomState.karaokeMyTurn) {
      applyKaraokeVocalFilter();
    }
  } catch (e) {
    toast('Gagal akses mikrofon: ' + (e.message || e));
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
  const vis = document.getElementById('mrpVoiceVis');
  if (vis) vis.classList.remove('show');
  cancelAnimationFrame(_visAF);
  stopWebRTC();

  if (musicRoomState.mode === 'karaoke') stopKaraokeFilter();
}

// ─────────────────── VOICE VISUALIZER ─────────────────────────
let _visAF = null;
function startVoiceVis(stream) {
  cancelAnimationFrame(_visAF);
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(buf);
      for (let i = 0; i < 12; i++) {
        const bar = document.getElementById(`mrpVbar${i}`);
        if (bar) bar.style.height = `${4 + (buf[i] / 255) * 26}px`;
      }
      _visAF = requestAnimationFrame(tick);
    };
    tick();
  } catch {}
}

// ─────────────────── WEBRTC ───────────────────────────────────
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

async function startWebRTC(stream) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  musicRoomState.pc = pc;
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => attachRemoteAudio(e.streams[0]);
  pc.onicecandidate = e => { if (e.candidate) sendSignal('webrtc_ice', { candidate: e.candidate }); };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') toast('🎙️ Voice terhubung!');
  };

  if (musicRoomState.isHost) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal('webrtc_offer', { sdp: offer });
  }
}

function attachRemoteAudio(stream) {
  musicRoomState.remoteStream = stream;
  let remAudio = document.getElementById('mrpRemoteAudio');
  if (!remAudio) {
    remAudio = document.createElement('audio');
    remAudio.id = 'mrpRemoteAudio';
    remAudio.autoplay = true;
    remAudio.setAttribute('playsinline', '');
    document.body.appendChild(remAudio);
  }
  remAudio.srcObject = stream;
  // Show partner mic icon
  const theyAv = document.getElementById('mrpTheyAv');
  if (theyAv && !document.getElementById('mrpTheyMic')) {
    const mic = document.createElement('div');
    mic.className = 'mrp-user-mic on';
    mic.id = 'mrpTheyMic';
    mic.innerHTML = '<i class="fas fa-microphone"></i>';
    theyAv.appendChild(mic);
  }
}

async function handleWebRTCOffer(data) {
  let stream = musicRoomState.localStream;
  if (!stream) {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); musicRoomState.localStream = stream; musicRoomState.micActive = true; } catch { return; }
  }
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  musicRoomState.pc = pc;
  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  pc.ontrack = e => attachRemoteAudio(e.streams[0]);
  pc.onicecandidate = e => { if (e.candidate) sendSignal('webrtc_ice', { candidate: e.candidate }); };
  await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await sendSignal('webrtc_answer', { sdp: answer });
}

async function handleWebRTCAnswer(data) {
  if (musicRoomState.pc) {
    await musicRoomState.pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).catch(() => {});
  }
}

function stopWebRTC() {
  if (musicRoomState.pc) { musicRoomState.pc.close(); musicRoomState.pc = null; }
  const remAudio = document.getElementById('mrpRemoteAudio');
  if (remAudio) remAudio.remove();
  cancelAnimationFrame(_visAF);
}

// ─────────────────── PROGRESS RAF ─────────────────────────────
let _progressRAF = null;
function startProgressSync() {
  cancelAnimationFrame(_progressRAF);
  const tick = () => {
    // Update progress bar
    const fill = document.getElementById('mrpTrackFill');
    if (fill && audio.duration && !isNaN(audio.duration)) {
      fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    }
    // Karaoke line sync
    if (musicRoomState.mode === 'karaoke') syncKaraokeLines();
    _progressRAF = requestAnimationFrame(tick);
  };
  tick();
}

// ─────────────────── INVITE SYSTEM ────────────────────────────
const _origRenderMessages = window.renderMessages;
window.renderMessages = function(msgs) {
  if (_origRenderMessages) _origRenderMessages(msgs);
  // Detect invite from partner
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.from_key !== USER_KEY && m.content?.startsWith('🎵 _music_room_invite_|')) {
      const parts = m.content.split('|');
      if (parts.length >= 4) {
        showInviteBanner(parts[1], parts[2], parts[3], m.from_key);
      }
      break;
    }
  }
};

let _pendingInvite = null;
function showInviteBanner(sessionId, mode, trackTitle, fromKey) {
  if (musicRoomState.active) return; // already in a room
  _pendingInvite = { sessionId, mode, fromKey };
  const icon = mode === 'karaoke' ? '🎤' : '🎧';
  document.getElementById('mrpInviteTitle').textContent =
    mode === 'karaoke' ? `${icon} Ajakan Karaoke Mode` : `${icon} Ajakan Listening Together`;
  document.getElementById('mrpInviteSub').textContent =
    `Lagu: "${trackTitle}" — mau bergabung?`;
  const banner = document.getElementById('mrpInviteBanner');
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 18000);
}

async function acceptMusicRoom() {
  if (!_pendingInvite) return;
  document.getElementById('mrpInviteBanner').classList.remove('show');
  const { sessionId, mode, fromKey } = _pendingInvite;
  _pendingInvite = null;

  try {
    const rows = await sb.get(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(sessionId)}`);
    const room = rows?.[0];
    if (!room || room.status === 'ended') { toast('Room sudah tidak aktif'); return; }

    musicRoomState = {
      ...musicRoomState,
      active: true, mode, sessionId,
      partnerKey: fromKey,
      partnerName: document.getElementById('chatRoomName')?.textContent || fromKey,
      isHost: false,
      karaokeMyTurn: mode === 'karaoke' ? false : false,
    };

    // Play lagu host jika belum/berbeda
    if (!currentTrack || currentTrack.id !== room.track_id) {
      await playTrackObj({
        id: room.track_id,
        title: room.track_title,
        artist: room.track_artist,
        audio: room.track_audio,
        thumbnail: room.track_thumb,
      });
      await new Promise(r => setTimeout(r, 600)); // biarkan audio init
      if (room.host_pos > 0) audio.currentTime = room.host_pos;
    }

    await sendSignal('partner_joined', { name: USER_KEY });
    await sb.patch(MUSIC_ROOM_TABLE, `session_id=eq.${encodeURIComponent(sessionId)}`, { status: 'active' }).catch(() => {});

    openMusicRoomPanel();
    renderMusicRoomBody();
    startRoomSync();
    if (mode === 'karaoke') setTimeout(() => loadKaraokeLyrics(), 500);
    toast('🎵 Berhasil bergabung ke Music Room!');
  } catch (e) {
    toast('Gagal bergabung: ' + (e.message || e));
  }
}

function declineMusicRoom() {
  document.getElementById('mrpInviteBanner').classList.remove('show');
  _pendingInvite = null;
}

// ─────────────────── EXPOSE ───────────────────────────────────
window.initMusicRoom      = initMusicRoom;
window.openMusicRoomPanel = openMusicRoomPanel;
window.closeMusicRoom     = closeMusicRoom;
window.endMusicRoom       = endMusicRoom;
window.toggleRoomMic      = toggleRoomMic;
window.switchKaraokeTurn  = switchKaraokeTurn;
window.acceptMusicRoom    = acceptMusicRoom;
window.declineMusicRoom   = declineMusicRoom;
window.togglePlusMenu     = togglePlusMenu;
