import { updateClipTimes, openClipEventStream } from '../api.js';
import { showToast } from './toast.js';

export function openClipEditor(video, onSaved) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  container.innerHTML = `
    <div class="modal clip-modal">
      <div class="modal-header">
        <h2>Clip Editor — ${escHtml(video.title || `Video ${video.id}`)}</h2>
        <button class="modal-close" id="clip-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="clip-fields">
          <div class="clip-field">
            <label>Clip Start (MM:SS.ms)</label>
            <input type="text" id="clip-start" value="${msToTimecode(video.clip_start_ms ?? 0)}" placeholder="00:00.000" />
          </div>
          <div class="clip-field">
            <label>Clip End (MM:SS.ms)</label>
            <input type="text" id="clip-end" value="${msToTimecode(video.clip_end_ms ?? 30000)}" placeholder="00:00.000" />
          </div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
          Duration: <span id="clip-dur">${formatDur((video.clip_end_ms ?? 30000) - (video.clip_start_ms ?? 0))}</span>
        </div>
        <div class="clip-actions">
          <button class="btn btn-secondary" id="clip-save">Save Times</button>
          <button class="btn btn-primary" id="clip-download">Download Clip</button>
          <span class="clip-save-confirm" id="clip-save-confirm" style="display:none">✓ Saved</span>
        </div>
        <div class="clip-progress" id="clip-progress" style="display:none"></div>
      </div>
    </div>
  `;

  const startInput = container.querySelector('#clip-start');
  const endInput = container.querySelector('#clip-end');
  const durEl = container.querySelector('#clip-dur');
  const saveBtn = container.querySelector('#clip-save');
  const downloadBtn = container.querySelector('#clip-download');
  const confirmEl = container.querySelector('#clip-save-confirm');

  // Initial state: Save hidden, Download enabled
  saveBtn.style.display = 'none';
  downloadBtn.disabled = false;

  function showSave() {
    saveBtn.style.display = '';
    downloadBtn.disabled = true;
  }

  function updateDur() {
    const dur = timecodeToMs(endInput.value) - timecodeToMs(startInput.value);
    durEl.textContent = formatDur(Math.max(0, dur));
  }

  [startInput, endInput].forEach(inp => {
    inp.addEventListener('focus', showSave);
    inp.addEventListener('input', updateDur);
  });

  container.querySelector('#clip-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal, { once: true });

  saveBtn.addEventListener('click', async () => {
    const start = timecodeToMs(startInput.value);
    const end = timecodeToMs(endInput.value);
    saveBtn.disabled = true;
    try {
      await updateClipTimes(video.id, start, end);
      if (onSaved) onSaved({ ...video, clip_start_ms: start, clip_end_ms: end });
      confirmEl.style.display = 'inline';
      setTimeout(() => { confirmEl.style.display = 'none'; }, 2500);
      // After save: hide Save, enable Download
      saveBtn.style.display = 'none';
      saveBtn.disabled = false;
      downloadBtn.disabled = false;
    } catch (e) {
      saveBtn.disabled = false;
      showToast(`Save failed: ${e.message}`, 'error');
    }
  });

  downloadBtn.addEventListener('click', () => {
    saveBtn.style.display = 'none';
    downloadBtn.disabled = true;
    startClipGeneration(video.id, container, () => {
      downloadBtn.disabled = false;
    });
  });
}

function startClipGeneration(videoId, container, onDone) {
  const progressEl = container.querySelector('#clip-progress');
  progressEl.style.display = 'block';
  progressEl.innerHTML = '';

  const es = openClipEventStream(videoId);

  es.addEventListener('status', (e) => {
    const { step, message } = JSON.parse(e.data);
    addProgressStep(progressEl, step, message, 'active');
  });

  es.addEventListener('done', (e) => {
    const { download_url, filename } = JSON.parse(e.data);
    addProgressStep(progressEl, '✓', 'Clip ready!', 'done');
    const link = document.createElement('a');
    link.href = download_url;
    link.download = filename;
    link.className = 'download-link';
    link.textContent = `⬇ Download ${filename}`;
    progressEl.appendChild(link);
    es.close();
    if (onDone) onDone();
  });

  es.addEventListener('error', (e) => {
    let msg = 'An error occurred';
    try { msg = JSON.parse(e.data).message; } catch {}
    addProgressStep(progressEl, '✗', msg, 'error');
    es.close();
    if (onDone) onDone();
  });
}

function addProgressStep(container, step, message, state) {
  const prev = container.querySelector('.progress-step.active');
  if (prev) prev.classList.remove('active');

  const el = document.createElement('div');
  el.className = `progress-step ${state}`;
  el.innerHTML = state === 'active'
    ? `<span class="spinner"></span><span>${escHtml(message)}</span>`
    : `<span>${step}</span><span>${escHtml(message)}</span>`;
  container.appendChild(el);
}

function msToTimecode(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const mspart = String(ms % 1000).padStart(3, '0');
  return `${mm}:${ss}.${mspart}`;
}

function timecodeToMs(tc) {
  const match = String(tc).match(/^(\d+):(\d+)\.(\d+)$/);
  if (!match) return parseInt(tc) || 0;
  return (parseInt(match[1]) * 60 + parseInt(match[2])) * 1000 + parseInt(match[3].padEnd(3, '0').slice(0, 3));
}

function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function formatDur(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
