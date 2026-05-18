// ══════════════════════════════════════════════════════════════
//  CINEMATIC LYRICS MODE — Pagaska Music
// ══════════════════════════════════════════════════════════════

(function() {
'use strict';

// ── STATE ────────────────────────────────────────────────────
let clmActive      = false;
let clmLrcLines    = [];
let clmCurIdx      = -1;
let clmInterval    = null;
let clmAudioCtx    = null;
let clmAnalyser    = null;
let clmSource      = null;
let clmBeatFrame   = null;
let clmBeatEnergy  = 0;
let clmLastBeat    = 0;

// ── INJECT CSS ───────────────────────────────────────────────
const CSS = `
/* ── CLM: Floating Toggle Button ── */
#clm-btn {
  position: fixed;
  bottom: 100px;
  right: 16px;
  z-index: 8000;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid rgba(167,139,250,0.5);
  background: rgba(13,7,30,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #a78bfa;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
  box-shadow: 0 0 0 0 rgba(167,139,250,0);
}
#clm-btn:hover {
  transform: scale(1.1);
  border-color: rgba(167,139,250,0.9);
  box-shadow: 0 0 22px rgba(167,139,250,0.45);
}
#clm-btn.active {
  background: rgba(109,40,217,0.7);
  border-color: #a78bfa;
  color: #fff;
  box-shadow: 0 0 28px rgba(167,139,250,0.6), 0 0 60px rgba(109,40,217,0.25);
  animation: clm-btn-pulse 2.5s ease-in-out infinite;
}
@keyframes clm-btn-pulse {
  0%,100% { box-shadow: 0 0 18px rgba(167,139,250,0.5), 0 0 50px rgba(109,40,217,0.2); }
  50%      { box-shadow: 0 0 34px rgba(167,139,250,0.8), 0 0 80px rgba(109,40,217,0.4); }
}
#clm-btn-tooltip {
  position: absolute;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(13,7,30,0.92);
  border: 1px solid rgba(167,139,250,0.3);
  color: #c4b5fd;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  padding: 5px 10px;
  border-radius: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  font-family: 'DM Sans', sans-serif;
  letter-spacing: 0.5px;
}
#clm-btn:hover #clm-btn-tooltip { opacity: 1; }

/* ── CLM: Overlay Layer ── */
#clm-overlay {
  position: fixed;
  inset: 0;
  z-index: 7000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s ease;
  isolation: isolate;        /* buat stacking context sendiri */
  contain: layout style;     /* cegah efek bocor ke parent */
}
#clm-overlay.active { opacity: 1; }

/* Background cinematic */
#clm-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(88,28,220,0.18) 0%, rgba(7,7,26,0.0) 70%);
  transition: background 1.5s ease;
}
#clm-bg-art {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(70px) brightness(0.18) saturate(1.8);
  opacity: 0;
  transition: opacity 1.5s ease, background-image 1.2s ease;
}
#clm-bg-art.loaded { opacity: 1; }

/* Vignette */
#clm-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(7,7,26,0.85) 100%),
    linear-gradient(to bottom, rgba(7,7,26,0.6) 0%, transparent 25%, transparent 65%, rgba(7,7,26,0.9) 100%);
  pointer-events: none;
}

/* Ambient glow that reacts to beat */
#clm-glow {
  position: absolute;
  width: 600px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(139,92,246,0.22) 0%, transparent 70%);
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  filter: blur(40px);
  transition: transform 0.08s ease, opacity 0.1s ease;
  pointer-events: none;
}

/* ── CLM: Lyrics Container ── */
#clm-lyrics-wrap {
  position: absolute;
  left: 0; right: 0;
  bottom: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 10%;
  pointer-events: none;
}

/* Previous lyric (dimmed) */
.clm-line-prev {
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-size: clamp(0.85rem, 2.5vw, 1.05rem);
  font-weight: 600;
  color: rgba(196,181,253,0.35);
  text-align: center;
  line-height: 1.5;
  letter-spacing: 0.02em;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.5s ease;
  text-shadow: 0 0 20px rgba(139,92,246,0.2);
  max-width: 600px;
}
.clm-line-prev.show {
  opacity: 1;
  transform: translateY(0);
}

/* Current lyric (main) */
.clm-line-main {
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-size: clamp(1.1rem, 3.5vw, 1.55rem);
  font-weight: 800;
  color: #fff;
  text-align: center;
  line-height: 1.4;
  letter-spacing: 0.01em;
  opacity: 0;
  transform: translateY(12px) scale(0.97);
  transition: all 0.0s;
  text-shadow:
    0 0 30px rgba(167,139,250,0.8),
    0 0 60px rgba(139,92,246,0.4),
    0 2px 16px rgba(0,0,0,0.8);
  max-width: 700px;
}
.clm-line-main.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: all 0.45s cubic-bezier(0.16,1,0.3,1);
}
.clm-line-main.chorus {
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  text-shadow:
    0 0 40px rgba(167,139,250,1),
    0 0 80px rgba(139,92,246,0.7),
    0 0 120px rgba(109,40,217,0.4),
    0 2px 20px rgba(0,0,0,0.9);
}
.clm-line-main.sad {
  color: rgba(196,181,253,0.9);
  text-shadow:
    0 0 20px rgba(139,92,246,0.4),
    0 2px 16px rgba(0,0,0,0.8);
  filter: blur(0.3px);
}
.clm-line-main.hype {
  animation: clm-hype-shake 0.08s ease-in-out infinite alternate;
}
@keyframes clm-hype-shake {
  from { transform: translateY(0) scale(1) rotate(-0.3deg); }
  to   { transform: translateY(-2px) scale(1.012) rotate(0.3deg); }
}
.clm-line-main.beat-hit {
  animation: clm-beat 0.15s ease-out;
}
@keyframes clm-beat {
  0%   { transform: scale(1.05); text-shadow: 0 0 60px rgba(167,139,250,1), 0 0 100px rgba(139,92,246,0.8); }
  100% { transform: scale(1); }
}

/* Next lyric (upcoming, very dim) */
.clm-line-next {
  font-family: 'DM Sans', sans-serif;
  font-size: clamp(0.78rem, 2vw, 0.95rem);
  font-weight: 500;
  color: rgba(196,181,253,0.2);
  text-align: center;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.5s ease;
  max-width: 500px;
  letter-spacing: 0.03em;
}
.clm-line-next.show {
  opacity: 1;
  transform: translateY(0);
}

/* Progress bar overlay */
#clm-progress {
  position: absolute;
  bottom: 76px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: rgba(139,92,246,0.2);
  border-radius: 2px;
}
#clm-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(139,92,246,0.7), rgba(196,181,253,0.9));
  border-radius: 2px;
  width: 0%;
  transition: width 0.4s linear;
  box-shadow: 0 0 8px rgba(167,139,250,0.6);
}

/* Track info overlay */
#clm-track-info {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(13,7,30,0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(139,92,246,0.2);
  border-radius: 40px;
  padding: 6px 14px 6px 8px;
  opacity: 0;
  transition: opacity 0.5s ease;
  max-width: 90vw;
}
#clm-overlay.active #clm-track-info { opacity: 1; }
#clm-track-thumb {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(139,92,246,0.4);
  animation: clm-spin 8s linear infinite;
  animation-play-state: paused;
}
#clm-track-thumb.spinning { animation-play-state: running; }
@keyframes clm-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
#clm-track-label {
  min-width: 0;
}
#clm-track-title {
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: #e9d5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
#clm-track-artist {
  font-size: 0.62rem;
  color: rgba(196,181,253,0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* ── CLM: Dim the rest of UI ──
   PENTING: Tidak pakai filter:blur() di sini karena filter pada parent
   menciptakan stacking context baru yang mengurung z-index child,
   sehingga #clm-overlay dan #clm-btn ikut ter-blur.
   Solusi: pakai opacity + pseudo-element ::before untuk efek blur overlay.
── */

/* Dim pakai opacity — tidak membuat stacking context */
body.clm-active .app,
body.clm-active .pbar {
  opacity: 0.18;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
body.clm-active .np-screen {
  opacity: 0.08 !important;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
body:not(.clm-active) .app,
body:not(.clm-active) .pbar,
body:not(.clm-active) .np-screen {
  opacity: 1;
  transition: opacity 0.6s ease;
  pointer-events: auto;
}

/* Blur tipis via pseudo-element di atas .app — tidak mempengaruhi z-index anak */
body.clm-active .app::after {
  content: '';
  position: fixed;
  inset: 0;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 50;
  pointer-events: none;
  background: rgba(7,7,26,0.35);
  animation: clm-fadein-dim 0.6s ease forwards;
}
body:not(.clm-active) .app::after {
  content: none;
}
@keyframes clm-fadein-dim {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Pastikan overlay dan tombol CC selalu di atas dim layer */
#clm-overlay {
  z-index: 7000 !important;
  isolation: isolate;
}
#clm-btn {
  z-index: 9000 !important;
  isolation: isolate;
}

/* ── CLM: No lyric state ── */
#clm-no-lyric {
  position: absolute;
  bottom: 130px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem;
  color: rgba(196,181,253,0.3);
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.5s ease;
  white-space: nowrap;
}
#clm-no-lyric.show { opacity: 1; }

/* ── CLM: Particles ── */
.clm-particle {
  position: absolute;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: rgba(167,139,250,0.6);
  pointer-events: none;
  animation: clm-float-up linear forwards;
}
@keyframes clm-float-up {
  0%   { transform: translateY(0) scale(1); opacity: 0.7; }
  100% { transform: translateY(-180px) scale(0); opacity: 0; }
}

/* ── RESPONSIVE ── */
@media (max-width: 480px) {
  #clm-lyrics-wrap { padding: 0 6%; bottom: 110px; }
  #clm-btn {
    bottom: 148px; /* di atas player bar (80px) + nav (60px) + margin */
    right: 12px;
    width: 46px;
    height: 46px;
    font-size: 1.05rem;
  }
  #clm-progress { left: 6%; right: 6%; bottom: 86px; }
  #clm-track-info { top: 16px; padding: 5px 10px 5px 6px; }
  #clm-lyrics-wrap { bottom: 110px; }
}
@media (min-width: 481px) {
  #clm-btn { bottom: 148px; }
}
`;

// ── INJECT HTML ───────────────────────────────────────────────
function buildOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'clm-overlay';
  overlay.innerHTML = `
    <div id="clm-bg"></div>
    <div id="clm-bg-art"></div>
    <div id="clm-vignette"></div>
    <div id="clm-glow"></div>
    <div id="clm-track-info">
      <img id="clm-track-thumb" src="" alt="">
      <div id="clm-track-label">
        <div id="clm-track-title">–</div>
        <div id="clm-track-artist">–</div>
      </div>
    </div>
    <div id="clm-lyrics-wrap">
      <div class="clm-line-prev" id="clm-prev"></div>
      <div class="clm-line-main" id="clm-main"></div>
      <div class="clm-line-next" id="clm-next"></div>
    </div>
    <div id="clm-no-lyric">♪ instrumental ♪</div>
    <div id="clm-progress"><div id="clm-progress-fill"></div></div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function buildButton() {
  const btn = document.createElement('button');
  btn.id = 'clm-btn';
  btn.title = 'Cinematic Lyrics';
  btn.setAttribute('aria-label', 'Toggle Cinematic Lyrics Mode');
  btn.innerHTML = `
    <i class="fas fa-closed-captioning"></i>
    <span id="clm-btn-tooltip">Cinematic Lyrics</span>
  `;
  document.body.appendChild(btn);
  btn.addEventListener('click', toggleCLM);
  return btn;
}

// ── LRC PARSER ───────────────────────────────────────────────
function parseLRCForCLM(lrcText) {
  const lines = [];
  const regex = /\[(\d+):(\d+\.\d+)\](.*)/g;
  let m;
  while ((m = regex.exec(lrcText)) !== null) {
    const text = m[3].trim();
    if (text) lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text });
  }
  lines.sort((a, b) => a.time - b.time);
  // Deteksi mood per baris
  lines.forEach((l, i) => {
    l.mood = detectMood(l.text, i, lines.length);
  });
  return lines;
}

function detectMood(text, idx, total) {
  const t = text.toLowerCase();
  // Hype: banyak huruf kapital atau kata energi
  if (/[A-Z]{3,}/.test(text) || /yeah|hey|woah|let'?s go|fire|lit|bang/.test(t)) return 'hype';
  // Sad: kata melankolis
  if (/cry|tear|alone|miss|hurt|broken|lost|pain|goodbye|never|empty/.test(t)) return 'sad';
  // Chorus: baris di 1/3 tengah lagu, biasanya pendek & repetitif
  const inMiddle = idx > total * 0.2 && idx < total * 0.85;
  if (inMiddle && text.length < 50) return 'chorus';
  return 'verse';
}

// ── AUDIO ANALYSER (Web Audio API) ───────────────────────────
function setupAnalyser() {
  const audioEl = document.getElementById('audioEl');
  if (!audioEl) return;
  try {
    if (!clmAudioCtx) {
      clmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (clmSource) { try { clmSource.disconnect(); } catch(e) {} }
    clmSource   = clmAudioCtx.createMediaElementSource(audioEl);
    clmAnalyser = clmAudioCtx.createAnalyser();
    clmAnalyser.fftSize = 256;
    clmSource.connect(clmAnalyser);
    clmAnalyser.connect(clmAudioCtx.destination);
  } catch(e) {
    // AudioContext sudah punya source — skip, tidak perlu reconnect
    clmAnalyser = null;
  }
}

function getBeatEnergy() {
  if (!clmAnalyser) return 0;
  const buf = new Uint8Array(clmAnalyser.frequencyBinCount);
  clmAnalyser.getByteFrequencyData(buf);
  // Bass band: bin 0-8 (sekitar 0–170Hz)
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += buf[i];
  return sum / 10 / 255; // 0..1
}

function beatLoop() {
  if (!clmActive) return;
  clmBeatFrame = requestAnimationFrame(beatLoop);
  const energy = getBeatEnergy();
  clmBeatEnergy = energy;

  // Glow reaktif
  const glow = document.getElementById('clm-glow');
  if (glow) {
    const scale = 1 + energy * 0.8;
    glow.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
    glow.style.opacity   = (0.6 + energy * 0.4).toFixed(3);
  }

  // Beat hit detection
  const now = performance.now();
  if (energy > 0.6 && now - clmLastBeat > 300) {
    clmLastBeat = now;
    const main = document.getElementById('clm-main');
    if (main && main.classList.contains('show')) {
      main.classList.remove('beat-hit');
      void main.offsetWidth; // reflow trick
      main.classList.add('beat-hit');
      spawnParticles();
    }
  }

  // Progress bar
  const audioEl = document.getElementById('audioEl');
  if (audioEl && audioEl.duration) {
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    const fill = document.getElementById('clm-progress-fill');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
  }
}

// ── PARTICLES ────────────────────────────────────────────────
function spawnParticles() {
  const overlay = document.getElementById('clm-overlay');
  if (!overlay) return;
  const count = Math.floor(3 + clmBeatEnergy * 8);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'clm-particle';
    const x = 20 + Math.random() * 60; // % dari lebar
    const y = 60 + Math.random() * 25; // % dari tinggi (area lyrics)
    const dur = 1.2 + Math.random() * 1.5;
    const size = 2 + Math.random() * 4;
    p.style.cssText = `
      left:${x}%; top:${y}%; width:${size}px; height:${size}px;
      animation-duration:${dur.toFixed(2)}s;
      opacity:${(0.4 + Math.random() * 0.5).toFixed(2)};
      background: rgba(${Math.random()>0.5?'167,139,250':'216,180,254'},${(0.5+Math.random()*0.4).toFixed(2)});
    `;
    overlay.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000);
  }
}

// ── LYRIC SYNC ───────────────────────────────────────────────
function startCLMSync() {
  if (clmInterval) clearInterval(clmInterval);

  let lastIdx = -1;

  clmInterval = setInterval(() => {
    if (!clmActive) return;
    const audioEl = document.getElementById('audioEl');
    if (!audioEl || !clmLrcLines.length) {
      showNoLyric(true);
      return;
    }

    const cur = audioEl.currentTime;
    let idx = 0;
    for (let i = 0; i < clmLrcLines.length; i++) {
      if (cur >= clmLrcLines[i].time) idx = i;
    }

    if (idx === lastIdx) return;
    lastIdx = idx;

    const line     = clmLrcLines[idx];
    const prevLine = idx > 0             ? clmLrcLines[idx - 1] : null;
    const nextLine = idx < clmLrcLines.length - 1 ? clmLrcLines[idx + 1] : null;

    showNoLyric(false);
    updateLyricDisplay(prevLine?.text || '', line.text, nextLine?.text || '', line.mood);

  }, 200);
}

function updateLyricDisplay(prev, main, next, mood) {
  const elPrev = document.getElementById('clm-prev');
  const elMain = document.getElementById('clm-main');
  const elNext = document.getElementById('clm-next');

  // Keluar dulu
  elMain.classList.remove('show', 'chorus', 'sad', 'hype', 'verse', 'beat-hit');
  elPrev.classList.remove('show');
  elNext.classList.remove('show');

  setTimeout(() => {
    elPrev.textContent = prev;
    elMain.textContent = main;
    elNext.textContent = next;

    // Masuk
    if (prev) elPrev.classList.add('show');
    if (next) elNext.classList.add('show');

    void elMain.offsetWidth; // reflow
    elMain.classList.add('show', mood || 'verse');

    // Glow bg mengikuti mood
    updateBgGlow(mood);
  }, 80);
}

function updateBgGlow(mood) {
  const bg = document.getElementById('clm-bg');
  if (!bg) return;
  const colors = {
    chorus: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.28) 0%, rgba(7,7,26,0.0) 70%)',
    sad:    'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(55,48,163,0.22) 0%, rgba(7,7,26,0.0) 70%)',
    hype:   'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(167,0,255,0.32) 0%, rgba(7,7,26,0.0) 70%)',
    verse:  'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(88,28,220,0.18) 0%, rgba(7,7,26,0.0) 70%)',
  };
  bg.style.background = colors[mood] || colors.verse;
}

function showNoLyric(show) {
  const el = document.getElementById('clm-no-lyric');
  if (!el) return;
  el.classList.toggle('show', show);
  const wrap = document.getElementById('clm-lyrics-wrap');
  if (wrap) wrap.style.opacity = show ? '0' : '1';
}

// ── UPDATE TRACK INFO ─────────────────────────────────────────
function updateCLMTrackInfo() {
  // Ambil dari currentTrack global Pagaska Music
  const track = window.currentTrack;
  if (!track) return;

  const thumb  = document.getElementById('clm-track-thumb');
  const title  = document.getElementById('clm-track-title');
  const artist = document.getElementById('clm-track-artist');
  const bgArt  = document.getElementById('clm-bg-art');

  if (thumb)  { thumb.src = track.thumbnail || ''; }
  if (title)  { title.textContent  = track.title  || '–'; }
  if (artist) { artist.textContent = track.artist || '–'; }
  if (bgArt && track.thumbnail) {
    bgArt.style.backgroundImage = `url('${track.thumbnail}')`;
    bgArt.classList.add('loaded');
  }
}

function updateThumbSpin(playing) {
  const thumb = document.getElementById('clm-track-thumb');
  if (!thumb) return;
  if (playing) thumb.classList.add('spinning');
  else         thumb.classList.remove('spinning');
}

// ── FETCH LYRICS ─────────────────────────────────────────────
async function fetchCLMLyrics(title, artist) {
  try {
    const r = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(title + ' ' + artist)}&limit=1`);
    const data = await r.json();
    if (data?.length && data[0].syncedLyrics) {
      return parseLRCForCLM(data[0].syncedLyrics);
    }
  } catch(e) {}
  return [];
}

// ── TOGGLE ───────────────────────────────────────────────────
async function toggleCLM() {
  clmActive = !clmActive;
  const btn     = document.getElementById('clm-btn');
  const overlay = document.getElementById('clm-overlay');

  if (clmActive) {
    // ON
    btn.classList.add('active');
    document.body.classList.add('clm-active');
    overlay.classList.add('active');

    updateCLMTrackInfo();

    // Cek apakah audio sedang main
    const audioEl = document.getElementById('audioEl');
    if (audioEl && !audioEl.paused) updateThumbSpin(true);

    // Setup Web Audio
    setupAnalyser();
    if (clmAudioCtx && clmAudioCtx.state === 'suspended') {
      clmAudioCtx.resume();
    }
    beatLoop();

    // Fetch lirik dari track sekarang
    const track = window.currentTrack;
    if (track) {
      showNoLyric(false);
      document.getElementById('clm-main').textContent = '✦';
      document.getElementById('clm-main').classList.add('show');
      clmLrcLines = await fetchCLMLyrics(track.title, track.artist);
      if (!clmLrcLines.length) showNoLyric(true);
    } else {
      showNoLyric(true);
    }

    startCLMSync();

  } else {
    // OFF
    btn.classList.remove('active');
    document.body.classList.remove('clm-active');
    overlay.classList.remove('active');
    updateThumbSpin(false);

    if (clmInterval) { clearInterval(clmInterval); clmInterval = null; }
    if (clmBeatFrame) { cancelAnimationFrame(clmBeatFrame); clmBeatFrame = null; }

    // Reset lyric display
    ['clm-prev','clm-main','clm-next'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('show','chorus','sad','hype','verse','beat-hit'); el.textContent = ''; }
    });
    showNoLyric(false);
  }
}

// ── HOOK KE PAGASKA MUSIC EVENTS ─────────────────────────────
function hookIntoPlayer() {
  const audioEl = document.getElementById('audioEl');
  if (!audioEl) return;

  // Saat lagu ganti (detecti src change)
  let lastSrc = '';
  setInterval(() => {
    if (!clmActive) return;
    const track = window.currentTrack;
    const src   = audioEl.src || '';
    if (src !== lastSrc) {
      lastSrc = src;
      updateCLMTrackInfo();
      // Refetch lirik
      clmLrcLines = [];
      showNoLyric(false);
      document.getElementById('clm-main').textContent = '✦';
      document.getElementById('clm-main').classList.add('show','verse');
      if (track) {
        fetchCLMLyrics(track.title, track.artist).then(lines => {
          clmLrcLines = lines;
          if (!lines.length) showNoLyric(true);
        });
      }
    }

    // Spin thumb sinkron play/pause
    updateThumbSpin(!audioEl.paused);
  }, 800);
}

// ── INIT ─────────────────────────────────────────────────────
function init() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Build DOM
  buildOverlay();
  buildButton();

  // Hook ke player
  hookIntoPlayer();

  // Keyboard shortcut: C untuk toggle
  document.addEventListener('keydown', e => {
    if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      toggleCLM();
    }
  });
}

// Tunggu DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
