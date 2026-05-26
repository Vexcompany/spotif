/**
 * ════════════════════════════════════════════════════════════════
 *  QUICK-FIX: Add ini ke explore.js atau main script
 * ════════════════════════════════════════════════════════════════
 */

// Copy-paste ini ke bagian akhir explore.js atau script utama

// ════════════════════════════════════════════════════════════════
//  QUICK INTEGRATION (Paste ke explore.js)
// ════════════════════════════════════════════════════════════════

/**
 * STEP 1: Modify playTrackObj di index.html main script
 * Find existing playTrackObj function dan add ini:
 */

const originalPlayTrackObj = window.playTrackObj;

window.playTrackObj = async function(track) {
  // Call original function first
  if (originalPlayTrackObj) await originalPlayTrackObj(track);
  
  // ✨ ADD TRACKING
  if (window.PlayTracker) {
    window.PlayTracker.trackPlayEvent(track);
    window.PlayTracker.initPlayCountTracker();
    window.PlayTracker.startLiveActivityRefresh();
  }
};

/**
 * STEP 2: Modify togglePlay untuk proper tracker handling
 */

const originalTogglePlay = window.togglePlay;

window.togglePlay = function() {
  if (audio.paused) {
    audio.play();
    if (window.PlayTracker) window.PlayTracker.initPlayCountTracker();
  } else {
    audio.pause();
    if (window.PlayTracker) window.PlayTracker.stopPlayCountTracker();
  }
  
  if (originalTogglePlay) originalTogglePlay();
};

/**
 * STEP 3: Modify nextTrack untuk stop old track tracker
 */

const originalNextTrack = window.nextTrack;

window.nextTrack = function() {
  if (window.PlayTracker) {
    window.PlayTracker.stopPlayCountTracker();
    window.PlayTracker.stopLiveActivityRefresh();
  }
  
  if (originalNextTrack) originalNextTrack();
};

/**
 * STEP 4: Replace loadLiveActivity dengan optimized version
 */

window.loadLiveActivity = async function() {
  if (window.PlayTracker) {
    window.PlayTracker.loadLiveActivityOptimized();
  } else {
    // Fallback jika play-tracker.js belum load
    try {
      const rows = await sb.get('play_history', 'order=played_at.desc&limit=8');
      activityData = rows;
      if (typeof renderActivity === 'function') renderActivity();
      document.getElementById('activitySec').style.display = rows.length ? 'block' : 'none';
    } catch (e) {
      console.warn(e.message);
    }
  }
};

/**
 * STEP 5: Replace queue render function
 */

window.renderQueueUI = function(queueArray) {
  if (window.PlayTracker) {
    window.PlayTracker.renderQueueEnhanced(queueArray);
  } else {
    // Fallback render
    const el = document.getElementById('panQ');
    if (!queueArray || !queueArray.length) {
      el.innerHTML = '<div class="empty-ti">Queue kosong</div>';
      return;
    }
    el.innerHTML = queueArray.map((t, i) => 
      `<div class="ti" onclick='playTrackObj(${esc(rowToTrack(t, "db"))})'>
        <div class="ti-n">${i + 1}</div>
        <div class="ti-th"><img src="${t.thumbnail || PH}" onerror="this.src='${PH}'"></div>
        <div class="ti-inf">
          <div class="ti-t">${t.title}</div>
          <div class="ti-a">${t.artist}</div>
        </div>
        <div class="ti-dur">${t.duration || ''}</div>
        <button class="ti-del" onclick="removeFromQueue(${i})"><i class="fas fa-trash"></i></button>
      </div>`
    ).join('');
  }
};

/**
 * STEP 6: Queue reorder functions (fallback if PlayTracker not available)
 */

window.reorderQueueUp = function(index) {
  if (!queue || index <= 0) return;
  [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
  if (window.renderQueueUI) window.renderQueueUI(queue);
  else if (typeof renderQueue === 'function') renderQueue();
  toast('✅ Urutan diubah');
};

window.reorderQueueDown = function(index) {
  if (!queue || index >= queue.length - 1) return;
  [queue[index], queue[index + 1]] = [queue[index + 1], queue[index]];
  if (window.renderQueueUI) window.renderQueueUI(queue);
  else if (typeof renderQueue === 'function') renderQueue();
  toast('✅ Urutan diubah');
};

window.removeFromQueue = function(index) {
  if (!queue) return;
  queue.splice(index, 1);
  if (window.renderQueueUI) window.renderQueueUI(queue);
  else if (typeof renderQueue === 'function') renderQueue();
  toast('✅ Dihapus dari queue');
};

/**
 * STEP 7: Update switchTab function untuk use new queue render
 */

const originalSwitchTab = window.switchTab;

window.switchTab = function(tab) {
  document.getElementById('tQ').classList.toggle('on', tab === 'q');
  document.getElementById('tH').classList.toggle('on', tab === 'h');
  document.getElementById('tL').classList.toggle('on', tab === 'l');
  
  document.getElementById('panQ').style.display = tab === 'q' ? 'block' : 'none';
  document.getElementById('panH').style.display = tab === 'h' ? 'block' : 'none';
  document.getElementById('panL').style.display = tab === 'l' ? 'block' : 'none';
  
  if (tab === 'q') {
    window.renderQueueUI(queue);
  }
};

/**
 * STEP 8: Auto-load queue UI on page load
 */

document.addEventListener('DOMContentLoaded', () => {
  // Wait untuk scripts load
  setTimeout(() => {
    if (typeof queue !== 'undefined') {
      window.renderQueueUI(queue);
    }
  }, 500);
});

// ════════════════════════════════════════════════════════════════
//  CSS: Add styling untuk mobile queue (inline)
// ════════════════════════════════════════════════════════════════

const mobileQueueCSS = document.createElement('style');
mobileQueueCSS.textContent = `
  /* Existing .ti styles tetap, tambah */
  
  .ti-del {
    opacity: 0;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--mt);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    transition: all 0.2s;
  }
  
  .ti:hover .ti-del {
    opacity: 1;
  }
  
  .ti-del:hover {
    background: rgba(255, 77, 109, 0.15);
    color: var(--rd);
  }
  
  .ti-reorder {
    display: flex;
    flex-direction: column;
    gap: 1px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .ti:hover .ti-reorder {
    opacity: 1;
  }
  
  .ti-reorder button {
    width: 20px;
    height: 16px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--mt);
    cursor: pointer;
    font-size: 0.48rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  
  .ti-reorder button:hover {
    background: var(--s4);
    color: var(--tx);
  }
  
  .ti-reorder button:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
  
  /* Mobile optimizations */
  @media (max-width: 600px) {
    .ti {
      padding: 8px;
      gap: 8px;
    }
    
    .ti-n {
      font-size: 0.68rem;
    }
    
    .ti-th {
      width: 38px;
      height: 38px;
    }
    
    .ti-t {
      font-size: 0.78rem;
    }
    
    .ti-a {
      font-size: 0.65rem;
    }
    
    .ti-dur {
      font-size: 0.62rem;
    }
    
    .ti-del {
      width: 28px;
      height: 28px;
      font-size: 0.68rem;
    }
    
    .ti:hover {
      background: var(--s2);
    }
    
    .ti:active {
      background: var(--s3);
    }
  }
`;

document.head.appendChild(mobileQueueCSS);

// ════════════════════════════════════════════════════════════════
//  INIT: Mulai activity refresh on page load
// ════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
  // Start activity auto-refresh
  if (window.PlayTracker) {
    window.PlayTracker.startLiveActivityRefresh();
  }
});

// Stop trackers saat page unload
window.addEventListener('beforeunload', () => {
  if (window.PlayTracker) {
    window.PlayTracker.stopPlayCountTracker();
    window.PlayTracker.stopLiveActivityRefresh();
  }
});

console.log('✅ Play Tracker initialized');
