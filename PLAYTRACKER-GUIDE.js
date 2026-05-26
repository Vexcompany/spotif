/**
 * ════════════════════════════════════════════════════════════════
 *  IMPLEMENTATION GUIDE: Play Tracker & Queue UI
 * ════════════════════════════════════════════════════════════════
 */

// 🔧 STEP 1: Add script ke index.html
/*
  <head>
    ...
    <script src="play-tracker.js"></script>
  </head>
  
  <body>
    ...
    <script src="...other-scripts"></script>
  </body>
*/

// ════════════════════════════════════════════════════════════════
//  🎵 INTEGRATION: Modify index.html playback functions
// ════════════════════════════════════════════════════════════════

/**
 * Modify playTrackObj() function di index.html
 * ADD ini di dalam function, setelah audio.play():
 */

// BEFORE:
/*
async function playTrackObj(track) {
  if (!track) return;
  currentTrack = track;
  audio.src = track.url;
  audio.play();
  // ... rest of logic
}
*/

// AFTER:
/*
async function playTrackObj(track) {
  if (!track) return;
  currentTrack = track;
  audio.src = track.url;
  audio.play();
  
  // ✨ NEW: Track play event
  window.PlayTracker.trackPlayEvent(track);
  window.PlayTracker.initPlayCountTracker();
  window.PlayTracker.startLiveActivityRefresh();
  
  // ... rest of logic
}
*/

/**
 * Modify audio.onended event handler
 * ADD ini saat track selesai/skip:
 */

// SEBELUM:
/*
audio.addEventListener('ended', () => {
  nextTrack();
});
*/

// SESUDAH:
/*
audio.addEventListener('ended', () => {
  // Stop trackers sebelum move ke next track
  window.PlayTracker.stopPlayCountTracker();
  window.PlayTracker.stopLiveActivityRefresh();
  
  nextTrack();
});
*/

// ════════════════════════════════════════════════════════════════
//  📋 QUEUE UI: Replace existing queue render function
// ════════════════════════════════════════════════════════════════

/**
 * Cari function renderQueue atau yang render panQ
 * Replace dengan ini:
 */

/*
function switchTab(tab) {
  document.getElementById('tQ').classList.toggle('on', tab === 'q');
  document.getElementById('tH').classList.toggle('on', tab === 'h');
  document.getElementById('tL').classList.toggle('on', tab === 'l');
  
  document.getElementById('panQ').style.display = tab === 'q' ? 'block' : 'none';
  document.getElementById('panH').style.display = tab === 'h' ? 'block' : 'none';
  document.getElementById('panL').style.display = tab === 'l' ? 'block' : 'none';
  
  if (tab === 'q') {
    // ✨ USE MOBILE-FRIENDLY RENDER
    window.PlayTracker.renderQueueEnhanced(queue);
  }
}
*/

// ════════════════════════════════════════════════════════════════
//  🔄 LIVE ACTIVITY: Replace existing activity loader
// ════════════════════════════════════════════════════════════════

/**
 * Replace loadLiveActivity() dengan:
 */

/*
async function loadLiveActivity() {
  window.PlayTracker.loadLiveActivityOptimized();
}
*/

// ════════════════════════════════════════════════════════════════
//  📊 DATABASE: Ensure table structure exists
// ════════════════════════════════════════════════════════════════

/*

SUPABASE TABLES NEEDED:

1. play_history
   - id (uuid, pk)
   - user_key (text)
   - track_id (text)
   - played_at (timestamp)
   - duration_played (int)
   - source (text)

2. user_play_counts
   - id (uuid, pk)
   - user_key (text)
   - track_id (text)
   - count (int)
   - created_at (timestamp)
   - UNIQUE(user_key, track_id)

3. tracks (existing, perlu update)
   - Tambah/pastikan ada field: play_count (int, default 0)

*/

// ════════════════════════════════════════════════════════════════
//  🎯 USAGE EXAMPLES
// ════════════════════════════════════════════════════════════════

/*

// 1. When user clicks play button
function playOrToggle() {
  if (!currentTrack) return;
  
  if (audio.paused) {
    audio.play();
    PlayTracker.initPlayCountTracker(); // ← START TRACKING
  } else {
    audio.pause();
    PlayTracker.stopPlayCountTracker(); // ← STOP TRACKING
  }
}

// 2. When user scrolls queue
function switchTab(tab) {
  if (tab === 'q') {
    PlayTracker.renderQueueEnhanced(queue); // ← MOBILE QUEUE
  }
}

// 3. Queue reorder actions (already in play-tracker.js)
// User clicks UP/DOWN/DELETE buttons
// → reorderQueueUp(index)
// → reorderQueueDown(index)
// → removeFromQueue(index)

// 4. Manual sync if needed
async function manualSyncPlayCounts() {
  await PlayTracker.syncPlayCountToDatabase();
}

*/

// ════════════════════════════════════════════════════════════════
//  🛠️ TROUBLESHOOTING
// ════════════════════════════════════════════════════════════════

/*

PROBLEM: Play count still stuck
SOLUTION: 
  1. Check Supabase play_history table has data
  2. Verify syncPlayCountToDatabase() runs every 10 seconds
  3. Check browser console for errors
  4. Manual sync: await PlayTracker.syncPlayCountToDatabase()

PROBLEM: Activity feed tidak update
SOLUTION:
  1. Make sure loadLiveActivityOptimized() called every 5 seconds
  2. Check play_history table di Supabase
  3. Verify USER_KEY stored correctly

PROBLEM: Queue reorder buttons terlalu kecil di mobile
SOLUTION:
  1. Styles sudah responsive di play-tracker.js
  2. Buttons scale down pada <600px width
  3. Modify .ti-btn-up/.ti-btn-down/.ti-del width/height if needed

*/

// ════════════════════════════════════════════════════════════════
//  📱 MOBILE QUEUE UI BREAKDOWN
// ════════════════════════════════════════════════════════════════

/*

Desktop Layout:
┌─────────────────────────────────────┐
│ ☰  1  │  [Thumb] Title  │  ↑ ↓ ✕  │
│       │         Artist  │         │
└─────────────────────────────────────┘

Mobile Layout (responsive):
┌────────────────────────────┐
│ ☰  1  [Thumb]             │
│        Title              │
│        Artist    ↑ ↓ ✕    │
└────────────────────────────┘

✨ Features:
✓ Drag handle (☰) untuk grab
✓ Up/Down buttons (↑↓) untuk reorder
✓ Delete button (✕) untuk remove
✓ Responsive buttons size
✓ Click-to-play di track info
✓ Touch-friendly spacing

*/

// ════════════════════════════════════════════════════════════════
//  🔍 MONITORING
// ════════════════════════════════════════════════════════════════

/*

Check console untuk debug:

// See current local play counts
console.log(window.PlayTracker?.localPlayCounts);

// Manual trigger activity refresh
window.PlayTracker.loadLiveActivityOptimized();

// Manual trigger play count sync
await window.PlayTracker.syncPlayCountToDatabase();

// Check activity cache
console.log(window.ACTIVITY_CACHE);

*/

// ════════════════════════════════════════════════════════════════
//  COMPLETE IMPLEMENTATION CHECKLIST
// ════════════════════════════════════════════════════════════════

/*

☐ 1. Add play-tracker.js ke index.html
☐ 2. Import script sebelum close </body>
☐ 3. Modify playTrackObj() untuk call PlayTracker methods
☐ 4. Modify audio.onended untuk stop trackers
☐ 5. Replace loadLiveActivity() dengan optimized version
☐ 6. Replace queue render dengan renderQueueEnhanced()
☐ 7. Ensure Supabase tables exist (play_history, user_play_counts)
☐ 8. Update tracks table add play_count field
☐ 9. Test play & check console logs
☐ 10. Test activity feed real-time update
☐ 11. Test queue reorder on mobile
☐ 12. Monitor play_count increment in real-time

*/
