/**
 * ════════════════════════════════════════════════════════════════
 *  INTEGRATION GUIDE: Multi-Source Apple Music Downloader
 *  File: INTEGRATION.md atau di sini sebagai contoh index.html
 * ════════════════════════════════════════════════════════════════
 * 
 * SETUP:
 * 1. Include script di index.html:
 *    <script src="api-downloader.js"></script>
 *    <link rel="stylesheet" href="downloader-styles.css">
 * 
 * 2. Add button di hero card atau search results
 * 3. Panggil showDownloaderSelector() saat user click download
 * 
 * ════════════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════════
//  EXAMPLE: Add download button ke search result item
// ════════════════════════════════════════════════════════════════

/**
 * Modify ini di index.html, pada bagian render search results
 * Tambahkan button download di .sr-item
 */

// SEBELUM (original):
/*
<div class="sr-item">
  <div class="sr-thumb">...</div>
  <div class="sr-info">...</div>
  <button class="sr-play-btn" onclick="playById(...)">
    <i class="fas fa-play"></i>
  </button>
</div>
*/

// SESUDAH (with download):
/*
<div class="sr-item">
  <div class="sr-thumb">...</div>
  <div class="sr-info">...</div>
  <div style="display: flex; gap: 6px;">
    <button class="sr-play-btn" onclick="playById(...)">
      <i class="fas fa-play"></i>
    </button>
    <button class="sr-play-btn" style="background: linear-gradient(135deg, #1DB954, #ff9500)" 
            onclick="showDownloadMenu(this, appleMusicUrl)">
      <i class="fas fa-download"></i>
    </button>
  </div>
</div>
*/

// ════════════════════════════════════════════════════════════════
//  Helper function untuk menampilkan download menu
// ════════════════════════════════════════════════════════════════

function showDownloadMenu(buttonEl, appleMusicUrl) {
  // Bisa pakai modal atau dropdown, tergantung UX preference
  window.ApiDownloader.showDownloaderSelector(appleMusicUrl, {
    title: document.querySelector('.sr-title')?.textContent,
    artist: document.querySelector('.sr-meta')?.textContent
  });
}

// ════════════════════════════════════════════════════════════════
//  HERO CARD: Add download button
// ════════════════════════════════════════════════════════════════

/**
 * Di index.html, tambahkan button download di .h-actions
 * 
 * <div class="h-actions">
 *   <button class="btn-play" onclick="playOrToggle()">
 *     <i class="fas fa-play"></i><span>Putar</span>
 *   </button>
 *   <div class="ico-btn" onclick="toggleLikeCurrent()">
 *     <i class="far fa-heart"></i>
 *   </div>
 *   <!-- TAMBAH INI: Download Button -->
 *   <div class="ico-btn" title="Download" style="background: linear-gradient(135deg, var(--g), #ff9500); color: #000; border: none;"
 *        onclick="showDownloadOptions()">
 *     <i class="fas fa-download"></i>
 *   </div>
 *   <div class="ico-btn" onclick="shareCurrentTrack()">
 *     <i class="fas fa-share"></i>
 *   </div>
 *   <div class="ico-btn" onclick="openNP()">
 *     <i class="fas fa-music"></i>
 *   </div>
 * </div>
 */

function showDownloadOptions() {
  if (!currentTrack || !currentTrack.appleUrl) {
    toast('Tidak ada Apple Music URL untuk lagu ini');
    return;
  }
  window.ApiDownloader.showDownloaderSelector(currentTrack.appleUrl, {
    title: currentTrack.title,
    artist: currentTrack.artist,
    thumbnail: currentTrack.thumbnail
  });
}

// ════════════════════════════════════════════════════════════════
//  PLAYBACK HANDLER: Store Apple Music URL
// ════════════════════════════════════════════════════════════════

/**
 * Modify playTrackObj() function untuk store Apple Music URL
 * Jika data dari Apple Music search result
 */

// Pastikan structure track object include appleUrl:
function playTrackObj(track) {
  if (!track) return;
  
  currentTrack = {
    ...track,
    // Pastikan appleUrl di-set dari search result
    appleUrl: track.appleUrl || track.url, // url dari Apple Music API
  };
  
  // ... rest of playback logic
}

// ════════════════════════════════════════════════════════════════
//  SEARCH FUNCTION: Include Apple Music URL di result
// ════════════════════════════════════════════════════════════════

/**
 * Modify doSearch() untuk include Apple Music URL dalam result
 */

async function doSearch() {
  const query = document.getElementById('sInput').value.trim();
  if (!query) return;

  try {
    // Search di iTunes/Apple Music
    const results = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`
    ).then(r => r.json());

    // Format results
    const tracks = results.results.map(item => ({
      id: item.trackId,
      title: item.trackName,
      artist: item.artistName,
      thumbnail: item.artworkUrl100,
      duration: formatTime(item.trackTimeMillis / 1000),
      appleUrl: item.trackViewUrl, // ← PENTING: Store Apple Music URL
      source: 'iTunes'
    }));

    // Render di UI
    renderSearchResults(tracks);

  } catch (error) {
    toast('Error searching: ' + error.message);
  }
}

// ════════════════════════════════════════��═══════════════════════
//  DOWNLOAD SUCCESS CALLBACK
// ════════════════════════════════════════════════════════════════

/**
 * Handle successful download
 */
window.onDownloadReady = function(result) {
  console.log('Download ready:', result);
  
  // Show result in a card/toast
  toast(`✅ Download siap: ${result.source} - ${result.quality}`);
  
  // Optional: Direct download
  if (result.url) {
    // Trigger download
    const link = document.createElement('a');
    link.href = result.url;
    link.download = `${result.title || 'song'}.${result.format || 'mp3'}`;
    link.click();
  }
};

// ════════════════════════════════════════════════════════════════
//  CONFIGURATION: Edit API keys jika perlu
// ════════════════════════════════════════════════════════════════

/**
 * Jika mau ganti API key Theresav:
 * Edit di api-downloader.js, section DOWNLOADERS.theresav.apikey
 * 
 * Atau gunakan environment variable:
 */

// Optional: Load dari env
// const THERESAV_KEY = process.env.REACT_APP_THERESAV_KEY || 'FKbI4';
// window.ApiDownloader.DOWNLOADERS.theresav.apikey = THERESAV_KEY;

// ════════════════════════════════════════════════════════════════
//  USAGE EXAMPLE: Complete flow
// ════════════════════════════════════════════════════════════════

/*

// 1. User search lagu
doSearch(); // Calls iTunes API, shows results

// 2. User click play
playTrackObj(trackObject); // Play track, store appleUrl

// 3. User click download button
showDownloadOptions(); // Show downloader selector modal

// 4. User choose source (Nexray or Theresav)
startDownload(appleMusicUrl, 'nexray'); // or 'theresav'

// 5. Download processing...
// - API call ke Nexray/Theresav
// - Extract metadata, get download URL
// - Show progress
// - Trigger download
// - Show success toast

*/

// ════════════════════════════════════════════════════════════════
//  FRONTEND HTML: Complete example hero card modification
// ════════════════════════════════════════════════════════════════

/*

<!-- Existing hero card in index.html -->
<div class="hero-card">
  <div class="h-art" onclick="openNP()">
    <img id="hImg" src="" alt="">
    <div class="h-art-ov"><i class="fas fa-expand-alt"></i></div>
  </div>
  <div class="h-info">
    <div>
      <div class="h-title" id="hTitle">–</div>
      <div class="h-artist" id="hArtist">–</div>
      <div class="h-album" id="hAlbum">–</div>
      <div class="h-chips">
        <div class="chip"><i class="far fa-clock"></i><span id="hDur">–</span></div>
      </div>
    </div>
    <!-- ADD THIS SECTION: Download options -->
    <div class="h-actions">
      <button class="btn-play" id="hPlayBtn" onclick="playOrToggle()">
        <i class="fas fa-play" id="hPlayIco"></i><span id="hPlayTxt">Putar</span>
      </button>
      <div class="ico-btn" id="hLike" onclick="toggleLikeCurrent()">
        <i class="far fa-heart"></i>
      </div>
      <!-- NEW: Download Button dengan gradient -->
      <div class="ico-btn" 
           id="hDownloadBtn"
           onclick="showDownloadOptions()" 
           title="Download dari Apple Music"
           style="background: linear-gradient(135deg, #1DB954, #ff9500); 
                  color: #000; 
                  border: none;
                  cursor: pointer;">
        <i class="fas fa-download"></i>
      </div>
      <div class="ico-btn" onclick="shareCurrentTrack()">
        <i class="fas fa-share"></i>
      </div>
      <div class="ico-btn" onclick="openNP()">
        <i class="fas fa-music"></i>
      </div>
    </div>
  </div>
</div>

*/

// ════════════════════════════════════════════════════════════════
//  ERROR HANDLING & RETRY
// ════════════════════════════════════════════════════════════════

async function downloadWithRetry(url, source, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await window.ApiDownloader.downloadFromAppleMusic(url, source);
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      
      // Retry dengan source lain
      const otherSource = source === 'nexray' ? 'theresav' : 'nexray';
      console.log(`Retrying dengan ${otherSource}...`);
      source = otherSource;
      
      // Wait sebelum retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Usage:
// downloadWithRetry(appleMusicUrl, 'nexray').then(result => {...})
