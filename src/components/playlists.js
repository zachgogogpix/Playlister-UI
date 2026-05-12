import { fetchPlaylists, createPlaylist, deletePlaylist } from '../api.js';
import { showToast } from './toast.js';
import { renderPlaylistDetail } from './playlistDetail.js';

let playlistsContainer = null;
let currentView = 'grid'; // 'grid' | 'detail'

export async function renderPlaylistsTab(container) {
  playlistsContainer = container;
  showGrid(container);
}

async function showGrid(container) {
  currentView = 'grid';
  container.innerHTML = `
    <div class="playlist-page">
      <div class="playlist-toolbar">
        <h1>Playlists</h1>
        <button class="btn btn-primary" id="new-playlist-btn">+ New Playlist</button>
      </div>
      <div class="playlist-search-wrap">
        <input type="text" id="playlist-search" class="playlist-search-input" placeholder="Filter by playlist name…">
      </div>
      <div class="playlist-grid" id="playlist-grid">
        <div style="color:var(--muted);padding:20px">Loading…</div>
      </div>
    </div>
  `;

  container.querySelector('#new-playlist-btn').addEventListener('click', () => {
    openNewPlaylistModal(container);
  });

  await loadGrid(container);
}

async function loadGrid(container) {
  const grid = container.querySelector('#playlist-grid');
  const searchInput = container.querySelector('#playlist-search');

  let allPlaylists = [];

  function renderCards(list) {
    grid.innerHTML = '';
    if (!list.length) {
      grid.innerHTML = '<div style="color:var(--muted);padding:20px;font-size:13px">No playlists match.</div>';
      return;
    }
    list.forEach(pl => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      const updated = pl.updated_at ? new Date(pl.updated_at).toLocaleDateString() : null;
      card.innerHTML = `
        ${pl.image_url
          ? `<img class="playlist-card-art" src="${esc(pl.image_url)}" alt="${esc(pl.name)}" loading="lazy">`
          : `<div class="playlist-card-art-placeholder">🎵</div>`}
        <div class="playlist-card-info">
          <div class="playlist-card-title">${esc(pl.name)}</div>
          <div class="playlist-card-count">${pl.video_count ?? 0} videos</div>
          ${updated ? `<div class="playlist-card-updated">Updated ${updated}</div>` : ''}
        </div>
      `;
      card.addEventListener('click', () => {
        renderPlaylistDetail(playlistsContainer, pl.id, () => showGrid(playlistsContainer));
      });
      grid.appendChild(card);
    });
  }

  try {
    allPlaylists = await fetchPlaylists();
    if (!allPlaylists.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><p>No playlists yet. Create one!</p></div>';
      return;
    }
    renderCards(allPlaylists);

    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = q ? allPlaylists.filter(pl => pl.name.toLowerCase().includes(q)) : allPlaylists;
      renderCards(filtered);
    });

  } catch (e) {
    grid.innerHTML = `<div style="color:var(--danger)">Error: ${esc(e.message)}</div>`;
  }
}

function openNewPlaylistModal(container) {
  const backdrop = document.getElementById('modal-backdrop');
  const modalContainer = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  modalContainer.innerHTML = `
    <div class="modal new-playlist-modal">
      <div class="modal-header">
        <h2>New Playlist</h2>
        <button class="modal-close" id="npm-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label>Title *</label>
          <input type="text" id="npm-title" placeholder="Playlist name…" autofocus>
        </div>
        <div class="form-field">
          <label>Artwork (1600×900px)</label>
          <input type="file" id="npm-image" accept="image/*">
          <div id="npm-image-warn" style="display:none;color:var(--warning);font-size:12px;margin-top:5px"></div>
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="npm-cancel">Cancel</button>
          <button class="btn btn-primary" id="npm-create">Create Playlist</button>
        </div>
      </div>
    </div>
  `;

  function closeModal() {
    modalContainer.innerHTML = '';
    backdrop.classList.add('hidden');
  }

  modalContainer.querySelector('#npm-close').addEventListener('click', closeModal);
  modalContainer.querySelector('#npm-cancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal, { once: true });

  modalContainer.querySelector('#npm-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const warn = modalContainer.querySelector('#npm-image-warn');
    if (!file) { warn.style.display = 'none'; return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width !== 1600 || img.height !== 900) {
        warn.style.display = 'block';
        warn.textContent = `⚠ Image is ${img.width}×${img.height}px — recommended size is 1600×900px.`;
      } else {
        warn.style.display = 'none';
      }
    };
    img.src = url;
  });

  modalContainer.querySelector('#npm-create').addEventListener('click', async () => {
    const title = modalContainer.querySelector('#npm-title').value.trim();
    if (!title) { showToast('Title is required', 'error'); return; }

    const fd = new FormData();
    fd.append('name', title);
    const imageFile = modalContainer.querySelector('#npm-image').files[0];
    if (imageFile) fd.append('image', imageFile);

    const btn = modalContainer.querySelector('#npm-create');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      await createPlaylist(fd);
      showToast('Playlist created!', 'success');
      closeModal();
      await loadGrid(container);
    } catch (e) {
      showToast(`Failed: ${e.message}`, 'error');
      btn.disabled = false;
      btn.textContent = 'Create Playlist';
    }
  });
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
