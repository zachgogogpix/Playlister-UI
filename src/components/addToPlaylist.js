import { fetchPlaylists, fetchPlaylistsContainingVideo, addVideoToPlaylist } from '../api.js';
import { showToast } from './toast.js';

export async function openAddToPlaylistModal(video) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  container.innerHTML = `
    <div class="modal add-playlist-modal">
      <div class="modal-header">
        <h2>Add to Playlist</h2>
        <button class="modal-close" id="atp-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="atp-video-info">
          ${video.thumbnail_url ? `<img src="${esc(video.thumbnail_url)}" alt="" class="atp-thumb">` : ''}
          <div>
            <div class="atp-video-title">${esc(video.title)}</div>
            <div class="atp-video-artist">${esc(video.artist)}</div>
          </div>
        </div>
        <div class="atp-list" id="atp-list">
          <div style="color:var(--muted);padding:16px;font-size:13px">Loading playlists…</div>
        </div>
      </div>
    </div>
  `;

  function closeModal() {
    container.innerHTML = '';
    backdrop.classList.add('hidden');
  }

  container.querySelector('#atp-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal, { once: true });

  const listEl = container.querySelector('#atp-list');

  let playlists, containingIds;
  try {
    [playlists, containingIds] = await Promise.all([
      fetchPlaylists(),
      fetchPlaylistsContainingVideo(video.id),
    ]);
  } catch (e) {
    listEl.innerHTML = `<div style="color:var(--danger);padding:16px;font-size:13px">Error: ${esc(e.message)}</div>`;
    return;
  }

  if (!playlists.length) {
    listEl.innerHTML = `<div style="color:var(--muted);padding:16px;font-size:13px">No playlists yet.</div>`;
    return;
  }

  const alreadyIn = new Set(containingIds);

  listEl.innerHTML = '';
  playlists.forEach(pl => {
    const inPlaylist = alreadyIn.has(pl.id);
    const row = document.createElement('div');
    row.className = 'atp-row';
    row.innerHTML = `
      ${pl.image_url
        ? `<img class="atp-pl-art" src="${esc(pl.image_url)}" alt="">`
        : `<div class="atp-pl-art atp-pl-art-placeholder">🎵</div>`}
      <div class="atp-pl-info">
        <div class="atp-pl-name">${esc(pl.name)}</div>
        <div class="atp-pl-count">${pl.video_count ?? 0} videos</div>
      </div>
      <button class="atp-add-btn" ${inPlaylist ? 'disabled style="opacity:.4"' : ''}>
        ${inPlaylist ? '✓ In list' : '+ Add'}
      </button>
    `;

    if (!inPlaylist) {
      row.querySelector('.atp-add-btn').addEventListener('click', async () => {
        const btn = row.querySelector('.atp-add-btn');
        btn.disabled = true;
        btn.textContent = '…';
        try {
          await addVideoToPlaylist(pl.id, video.id);
          btn.textContent = '✓ Added';
          btn.style.opacity = '.4';
          alreadyIn.add(pl.id);
          showToast(`Added to "${pl.name}"`, 'success');
        } catch (e) {
          btn.disabled = false;
          btn.textContent = '+ Add';
          showToast(`Failed: ${e.message}`, 'error');
        }
      });
    }

    listEl.appendChild(row);
  });
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
