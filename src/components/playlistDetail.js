import Sortable from 'sortablejs';
import {
  fetchPlaylist, fetchVideos, addVideoToPlaylist,
  removeVideoFromPlaylist, reorderPlaylistVideos,
  updatePlaylist, archivePlaylist,
} from '../api.js';
import { openVideoPlayer } from './videoPlayer.js';
import { showToast } from './toast.js';

export async function renderPlaylistDetail(container, playlistId, onBack) {
  container.innerHTML = `<div class="detail-page"><div style="color:var(--muted);padding:40px">Loading playlist…</div></div>`;

  let playlist;
  try {
    playlist = await fetchPlaylist(playlistId);
  } catch (e) {
    container.innerHTML = `<div class="detail-page"><p style="color:var(--danger)">Error: ${esc(e.message)}</p></div>`;
    return;
  }

  renderDetailView(container, playlist, onBack);
}

function renderDetailView(container, playlist, onBack) {
  const artHtml = playlist.image_url
    ? `<img class="detail-art" src="${esc(playlist.image_url)}" alt="${esc(playlist.name)}">`
    : `<div class="detail-art-placeholder">🎵</div>`;

  container.innerHTML = `
    <div class="detail-page">
      <div class="detail-header">
        <div class="detail-art-wrap">${artHtml}</div>
        <div class="detail-meta">
          <h1 id="detail-title">${esc(playlist.name)}</h1>
          <div class="detail-actions">
            <button class="btn btn-secondary" id="detail-back">← Back</button>
            <button class="btn btn-secondary" id="detail-edit-image">Change Artwork</button>
            <button class="btn btn-warning btn-sm" id="detail-archive">Archive</button>
          </div>
          <input type="file" id="detail-art-input" accept="image/*" style="display:none">
        </div>
      </div>
      <div class="detail-layout">
        <div class="detail-section">
          <h2>Videos in Playlist (${playlist.videos.length})</h2>
          <input type="text" id="pl-filter" class="pl-filter-input" placeholder="Filter by title or artist…">
          <div class="pl-video-list" id="pl-video-list"></div>
        </div>
        <div class="detail-section">
          <h2>Add Videos</h2>
          <div class="video-selector">
            <input type="text" class="video-selector-search" id="selector-search" placeholder="Search by artist or title…">
            <div class="video-selector-list" id="selector-list">
              <div style="color:var(--muted);padding:10px;font-size:13px">Add keywords to search</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const existingIds = new Set(playlist.videos.map(pv => pv.video_id));

  // Back button
  container.querySelector('#detail-back').addEventListener('click', onBack);

  // Playlist filter
  container.querySelector('#pl-filter').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    container.querySelectorAll('.pl-video-item').forEach(item => {
      const title = item.querySelector('.pl-video-title')?.textContent.toLowerCase() || '';
      const artist = item.querySelector('.pl-video-artist')?.textContent.toLowerCase() || '';
      item.style.display = (!q || title.includes(q) || artist.includes(q)) ? '' : 'none';
    });
  });

  // Archive playlist
  container.querySelector('#detail-archive').addEventListener('click', async () => {
    if (!confirm(`Archive "${playlist.name}"? It will no longer appear in the playlist grid. Contact an admin to restore it.`)) return;
    try {
      await archivePlaylist(playlist.id);
      showToast('Playlist archived', 'success');
      onBack();
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    }
  });

  // Inline title editing
  const titleEl = container.querySelector('#detail-title');
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.style.cursor = 'text';
  titleEl.style.outline = 'none';
  titleEl.style.borderBottom = '1px dashed var(--border)';
  titleEl.addEventListener('blur', async () => {
    const newTitle = titleEl.textContent.trim();
    if (!newTitle || newTitle === playlist.name) return;
    const fd = new FormData();
    fd.append('name', newTitle);
    try {
      await updatePlaylist(playlist.id, fd);
      playlist.name = newTitle;
      showToast('Title updated', 'success');
    } catch (e) {
      titleEl.textContent = playlist.name;
      showToast(`Failed: ${e.message}`, 'error');
    }
  });

  // Change artwork
  const artInput = container.querySelector('#detail-art-input');
  container.querySelector('#detail-edit-image').addEventListener('click', () => artInput.click());
  artInput.addEventListener('change', async () => {
    const file = artInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    try {
      const updated = await updatePlaylist(playlist.id, fd);
      playlist.image_url = updated.image_url;
      const artWrap = container.querySelector('.detail-art-wrap');
      artWrap.innerHTML = `<img class="detail-art" src="${esc(updated.image_url)}" alt="${esc(playlist.name)}">`;
      showToast('Artwork updated', 'success');
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
    }
  });

  // Render playlist videos
  renderPlaylistVideos(container, playlist, existingIds);

  // Video selector
  setupVideoSelector(container, playlist, existingIds);
}

function renderPlaylistVideos(container, playlist, existingIds) {
  const list = container.querySelector('#pl-video-list');
  list.innerHTML = '';

  if (!playlist.videos.length) {
    list.innerHTML = '<div style="color:var(--muted);padding:12px;font-size:13px">No videos yet. Add some from the right →</div>';
    return;
  }

  playlist.videos.forEach((pv, idx) => {
    const v = pv.video;
    const item = document.createElement('div');
    item.className = 'pl-video-item';
    item.dataset.videoId = pv.video_id;
    item.innerHTML = `
      <span class="pl-video-order">${idx + 1}</span>
      <img class="pl-video-thumb" src="${esc(v?.thumbnail_url)}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="pl-video-info">
        <div class="pl-video-title">${esc(v?.title)}</div>
        <div class="pl-video-artist">${esc(v?.artist)}</div>
      </div>
      <div class="pl-video-actions">
        ${v?.video_url ? `<button class="btn-icon pv-play" title="Play">▶️</button>` : ''}
        <button class="btn-icon pv-remove" title="Remove" style="color:var(--danger)">✕</button>
      </div>
    `;

    if (v?.video_url) {
      item.querySelector('.pv-play').addEventListener('click', (e) => {
        e.stopPropagation();
        openVideoPlayer(v.video_url, `${v.artist} — ${v.title}`, v?.thumbnail_url);
      });
    }

    item.querySelector('.pv-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await removeVideoFromPlaylist(playlist.id, pv.video_id);
        playlist.videos = playlist.videos.filter(x => x.video_id !== pv.video_id);
        existingIds.delete(pv.video_id);
        renderPlaylistVideos(container, playlist, existingIds);
        updateCount(container, playlist.videos.length);
        showToast('Video removed', 'success');
      } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
      }
    });

    list.appendChild(item);
  });

  // Drag-to-reorder
  Sortable.create(list, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: async () => {
      const items = [...list.querySelectorAll('.pl-video-item')].map((el, i) => ({
        video_id: parseInt(el.dataset.videoId),
        order: i,
      }));
      // update order numbers display
      list.querySelectorAll('.pl-video-order').forEach((el, i) => { el.textContent = i + 1; });
      try {
        await reorderPlaylistVideos(playlist.id, items);
        playlist.videos = items.map(item => playlist.videos.find(pv => pv.video_id === item.video_id));
      } catch (e) {
        showToast(`Reorder failed: ${e.message}`, 'error');
      }
    },
  });
}

function updateCount(container, count) {
  const h2 = container.querySelector('.detail-section h2');
  if (h2) h2.textContent = `Videos in Playlist (${count})`;
}

function setupVideoSelector(container, playlist, existingIds) {
  const searchInput = container.querySelector('#selector-search');
  const listEl = container.querySelector('#selector-list');
  let debounce;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = searchInput.value.trim();
    if (!q) {
      listEl.innerHTML = '<div style="color:var(--muted);padding:10px;font-size:13px">Add keywords to search</div>';
      return;
    }
    debounce = setTimeout(() => loadSelectorResults(q, listEl, playlist, existingIds, container), 350);
  });
}

async function loadSelectorResults(query, listEl, playlist, existingIds, container) {
  listEl.innerHTML = '<div style="color:var(--muted);padding:10px;font-size:13px">Searching…</div>';
  try {
    const [data, titleData, labelData] = await Promise.all([
      fetchVideos({ artist: query, limit: 40, page: 1 }),
      fetchVideos({ title: query, limit: 40, page: 1 }),
      fetchVideos({ record_label: query, limit: 40, page: 1 }),
    ]);
    const seen = new Set();
    const videos = [...data.videos, ...titleData.videos, ...labelData.videos].filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    if (!videos.length) {
      listEl.innerHTML = '<div style="color:var(--muted);padding:10px;font-size:13px">No results.</div>';
      return;
    }

    listEl.innerHTML = '';
    videos.forEach(v => {
      const inPlaylist = existingIds.has(v.id);
      const item = document.createElement('div');
      item.className = 'selector-item';
      item.innerHTML = `
        <img src="${esc(v.thumbnail_url)}" alt="" loading="lazy" onerror="this.style.display='none'">
        <div class="selector-item-info">
          <div class="selector-item-title">${esc(v.title)}</div>
          <div class="selector-item-artist">${esc(v.artist)}</div>
        </div>
        <div class="selector-item-btns">
          ${v.video_url ? `<button class="btn-icon selector-watch-btn" title="Watch">▶️</button>` : ''}
          <button class="selector-add-btn" ${inPlaylist ? 'disabled style="opacity:.4"' : ''}>
            ${inPlaylist ? '✓' : '+ Add'}
          </button>
        </div>
      `;

      if (v.video_url) {
        item.querySelector('.selector-watch-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openVideoPlayer(v.video_url, `${v.artist} — ${v.title}`, v.thumbnail_url);
        });
      }

      if (!inPlaylist) {
        item.querySelector('.selector-add-btn').addEventListener('click', async () => {
          try {
            await addVideoToPlaylist(playlist.id, v.id);
            existingIds.add(v.id);
            const pv = { id: Date.now(), playlist_id: playlist.id, video_id: v.id, order: 0, video: v };
            // Shift all existing videos down by incrementing their order
            playlist.videos.forEach(pv => pv.order++);
            playlist.videos.unshift(pv);
            renderPlaylistVideos(container, playlist, existingIds);
            updateCount(container, playlist.videos.length);
            item.querySelector('.selector-add-btn').textContent = '✓';
            item.querySelector('.selector-add-btn').disabled = true;
            showToast(`Added "${v.title}"`, 'success');
          } catch (e) {
            showToast(`Failed: ${e.message}`, 'error');
          }
        });
      }
      listEl.appendChild(item);
    });
  } catch (e) {
    listEl.innerHTML = `<div style="color:var(--danger);padding:10px;font-size:13px">Error: ${esc(e.message)}</div>`;
  }
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
