export function openImageViewer(thumbnailUrl, albumArtUrl, title, linkOut) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  container.innerHTML = `
    <div class="modal images-modal">
      <div class="modal-header">
        <h2>${esc(title || 'Images')}</h2>
        <button class="modal-close" id="img-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="image-card">
          ${thumbnailUrl
            ? `<img src="${esc(thumbnailUrl)}" alt="Video Thumbnail" loading="lazy" />`
            : `<div class="image-placeholder">No Thumbnail</div>`}
          <span>Video Thumbnail</span>
        </div>
        <div class="image-card">
          ${albumArtUrl
            ? `<img src="${esc(albumArtUrl)}" alt="Album Artwork" loading="lazy" />`
            : `<div class="image-placeholder">No Artwork</div>`}
          <span>Album Artwork</span>
        </div>
        <div class="image-link-out">
          <span class="link-out-label">Link Out</span>
          ${linkOut
            ? `<a href="${esc(linkOut)}" target="_blank" rel="noopener noreferrer" class="link-out-url">${esc(linkOut)}</a>`
            : `<span class="link-out-empty">—</span>`}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#img-close').addEventListener('click', closeImageViewer);
  backdrop.addEventListener('click', closeImageViewer, { once: true });
}

export function closeImageViewer() {
  document.getElementById('modal-container').innerHTML = '';
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
