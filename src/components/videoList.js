import { fetchVideos, fetchPartners, updateFlags } from '../api.js';
import { renderFilters } from './filters.js';
import { openVideoPlayer } from './videoPlayer.js';
import { openImageViewer } from './imageViewer.js';
import { openClipEditor } from './clipEditor.js';
import { openAddToPlaylistModal } from './addToPlaylist.js';
import { showToast } from './toast.js';

const state = {
  videos: [],
  total: 0,
  page: 1,
  limit: 100,
  pages: 1,
  filters: {},
  partners: [],
  loading: false,
};

export async function renderVideoTab(container) {
  container.innerHTML = `
    <div class="page">
      <div id="filters-mount"></div>
      <div id="table-status" style="color:var(--muted);padding:8px 0;font-size:13px"></div>
      <div class="video-table-wrap" id="video-table-wrap"></div>
      <div id="pagination-mount"></div>
    </div>
  `;

  state.partners = await fetchPartners().catch(() => []);
  renderFilters(
    container.querySelector('#filters-mount'),
    state.partners,
    state.filters,
    (newFilters) => { state.filters = newFilters; state.page = 1; loadVideos(container); }
  );

  await loadVideos(container);
}

async function loadVideos(container) {
  if (state.loading) return;
  state.loading = true;

  const statusEl = container.querySelector('#table-status');
  const tableWrap = container.querySelector('#video-table-wrap');
  statusEl.textContent = 'Loading…';
  tableWrap.innerHTML = '';

  try {
    const data = await fetchVideos({ ...state.filters, page: state.page, limit: state.limit });
    state.videos = data.videos;
    state.total = data.total;
    state.pages = data.pages;
    statusEl.textContent = `${data.total.toLocaleString()} videos · page ${state.page} of ${state.pages}`;
    renderTable(tableWrap, data.videos, container);
    renderPagination(container.querySelector('#pagination-mount'), container);
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
  } finally {
    state.loading = false;
  }
}

function renderTable(wrap, videos, container) {
  if (!videos.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">🎬</div><p>No videos found.</p></div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'video-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Actions</th>
        <th>Artist</th>
        <th>Title</th>
        <th>Label</th>
        <th>Partner</th>
        <th>Release Date</th>
        <th>ID</th>
      </tr>
    </thead>
    <tbody id="video-tbody"></tbody>
  `;
  wrap.appendChild(table);
  const tbody = table.querySelector('#video-tbody');

  videos.forEach(video => {
    const tr = document.createElement('tr');
    tr.dataset.id = video.id;
    tr.innerHTML = `
      <td class="actions">
        <div class="actions-cell">
          <button class="btn-icon action-play" title="Stream video">▶️</button>
          <button class="btn-icon action-images" title="View images">🖼</button>
          <button class="btn-icon action-clip" title="Clip editor">✂️</button>
          <button class="btn-icon action-add-playlist" title="Add to playlist">＋</button>
        </div>
      </td>
      <td class="truncate">${esc(video.artist)}</td>
      <td class="truncate">${esc(video.title)}</td>
      <td class="truncate">${esc(video.record_label)}</td>
      <td>${esc(video.partner_account)}</td>
      <td>${video.originalreleasedate || '—'}</td>
      <td>${video.id}</td>
    `;

    tr.querySelector('.action-play').addEventListener('click', () => {
      openVideoPlayer(video.video_url, `${video.artist} — ${video.title}`, video.thumbnail_url);
    });
    tr.querySelector('.action-images').addEventListener('click', () => {
      openImageViewer(video.thumbnail_url, video.album_artwork, `${video.artist} — ${video.title}`, video.link_out);
    });
    tr.querySelector('.action-add-playlist').addEventListener('click', () => {
      openAddToPlaylistModal(video);
    });
    tr.querySelector('.action-clip').addEventListener('click', () => {
      openClipEditor(video, (updated) => {
        const idx = state.videos.findIndex(v => v.id === updated.id);
        if (idx >= 0) state.videos[idx] = updated;
      });
    });

    tbody.appendChild(tr);
  });
}

function renderPagination(mount, container) {
  mount.innerHTML = '';
  if (state.pages <= 1) return;

  const wrap = document.createElement('div');
  wrap.className = 'pagination';

  const prev = document.createElement('button');
  prev.className = 'btn btn-secondary btn-sm';
  prev.textContent = '← Prev';
  prev.disabled = state.page <= 1;
  prev.addEventListener('click', () => { state.page--; loadVideos(container); });

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `Page ${state.page} of ${state.pages}`;

  const next = document.createElement('button');
  next.className = 'btn btn-secondary btn-sm';
  next.textContent = 'Next →';
  next.disabled = state.page >= state.pages;
  next.addEventListener('click', () => { state.page++; loadVideos(container); });

  wrap.append(prev, info, next);
  mount.appendChild(wrap);
}

function esc(s) {
  if (s == null) return '—';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
