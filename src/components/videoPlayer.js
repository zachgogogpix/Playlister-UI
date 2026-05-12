import Hls from 'hls.js';

let hlsInstance = null;

export function openVideoPlayer(videoUrl, title, thumbnailUrl) {
  closeVideoPlayer();

  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  container.innerHTML = `
    <div class="modal player-modal">
      <div class="modal-header">
        <h2>${escHtml(title || 'Video Player')}</h2>
        <button class="modal-close" id="player-close">&times;</button>
      </div>
      <div class="modal-body player-body">
        <video id="hls-video" controls autoplay playsinline></video>
        ${thumbnailUrl ? `<div class="player-thumb-overlay" id="player-thumb-overlay"><img src="${escHtml(thumbnailUrl)}" alt=""></div>` : ''}
      </div>
    </div>
  `;

  const video = container.querySelector('#hls-video');

  if (thumbnailUrl) {
    setTimeout(() => {
      const overlay = container.querySelector('#player-thumb-overlay');
      if (overlay) overlay.classList.add('player-thumb-fade');
      setTimeout(() => { if (overlay) overlay.remove(); }, 1100);
    }, 800);
  }

  if (Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(videoUrl);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoUrl;
    video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
  }

  container.querySelector('#player-close').addEventListener('click', closeVideoPlayer);
  backdrop.addEventListener('click', closeVideoPlayer, { once: true });
}

export function closeVideoPlayer() {
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  const video = document.getElementById('hls-video');
  if (video) { video.pause(); video.src = ''; }
  document.getElementById('modal-container').innerHTML = '';
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
