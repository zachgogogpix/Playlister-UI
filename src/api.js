const BASE = '/api';

async function req(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Videos ──────────────────────────────────────────────
export function fetchVideos(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) qs.set(k, v);
  }
  return req('GET', `/videos?${qs}`);
}

export function fetchPartners() {
  return req('GET', '/videos/partners');
}

export function updateClipTimes(id, clip_start_ms, clip_end_ms) {
  return req('PATCH', `/videos/${id}/clip`, { clip_start_ms, clip_end_ms });
}

export function updateFlags(id, flags) {
  return req('PATCH', `/videos/${id}/flags`, flags);
}

// ── Playlists ────────────────────────────────────────────
export function fetchPlaylists() {
  return req('GET', '/playlists');
}

export function fetchPlaylistsContainingVideo(videoId) {
  return req('GET', `/playlists/containing/${videoId}`);
}

export function fetchPlaylist(id) {
  return req('GET', `/playlists/${id}`);
}

export function createPlaylist(formData) {
  return req('POST', '/playlists', formData, true);
}

export function updatePlaylist(id, formData) {
  return req('PATCH', `/playlists/${id}`, formData, true);
}

export function archivePlaylist(id) {
  return req('POST', `/playlists/${id}/archive`);
}

export function deletePlaylist(id) {
  return req('DELETE', `/playlists/${id}`);
}

export function addVideoToPlaylist(playlistId, videoId) {
  return req('POST', `/playlists/${playlistId}/videos`, { video_id: videoId });
}

export function removeVideoFromPlaylist(playlistId, videoId) {
  return req('DELETE', `/playlists/${playlistId}/videos/${videoId}`);
}

export function reorderPlaylistVideos(playlistId, items) {
  return req('PATCH', `/playlists/${playlistId}/videos/reorder`, { items });
}

// ── Clips ─────────────────────────────────────────────────
export function openClipEventStream(videoId) {
  return new EventSource(`${BASE}/clips/${videoId}/generate`);
}
