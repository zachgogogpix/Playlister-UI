import { fetchEmojiKeyDefinitions, fetchVideoEmojiKeys, updateVideoEmojiKeys } from '../api.js';
import { showToast } from './toast.js';

// Emoji key options are loaded from the API (key_choices_menu table).
// Cached for the session after the first successful fetch.
let EMOJI_KEY_OPTIONS = null;

async function loadKeyDefinitions() {
  if (EMOJI_KEY_OPTIONS) return EMOJI_KEY_OPTIONS;
  const defs = await fetchEmojiKeyDefinitions();
  EMOJI_KEY_OPTIONS = {
    genre: defs.genre || [],
    mood: defs.mood || [],
    tags: defs.tags || [],
  };
  return EMOJI_KEY_OPTIONS;
}

export async function openEmojiKeyingTool(video, onUpdate) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');

  backdrop.classList.remove('hidden');
  container.innerHTML = `
    <div class="modal emoji-keying-modal">
      <div class="modal-header">
        <h2>Label Video with Emoji Keys</h2>
        <button class="modal-close" id="ek-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="ek-video-info">
          <div class="ek-video-title">${esc(video.artist)}</div>
          <div class="ek-video-subtitle">${esc(video.title)}</div>
          <div class="ek-overall-genre">Overall Genre: <span class="ek-genre-value">${esc(video.genre || 'Not specified')}</span></div>
        </div>
        <div class="ek-divider"></div>
        <div class="ek-sections" id="ek-sections">
          <div style="color:var(--muted);padding:16px;font-size:13px">Loading…</div>
        </div>
      </div>
    </div>
  `;

  function closeModal() {
    container.innerHTML = '';
    backdrop.classList.add('hidden');
  }

  container.querySelector('#ek-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal, { once: true });

  const sectionsEl = container.querySelector('#ek-sections');

  // Load the available key choices from the API
  try {
    await loadKeyDefinitions();
  } catch (e) {
    console.error('Failed to load emoji key definitions:', e);
    sectionsEl.innerHTML = `<div style="color:var(--danger, #e05252);padding:16px;font-size:13px">Could not load key choices from the API: ${esc(e.message)}</div>`;
    return;
  }

  // Fetch existing emoji keys for this video
  let existingKeys = { genre: [], mood: [], tags: [] };
  try {
    const keys = await fetchVideoEmojiKeys(video.id);
    existingKeys = {
      genre: keys?.genre || [],
      mood: keys?.mood || [],
      tags: keys?.tags || [],
    };
  } catch (e) {
    console.warn('Could not fetch existing emoji keys, using empty defaults:', e);
  }

  renderSections(sectionsEl, video.id, existingKeys, onUpdate);
}

function renderSections(container, videoId, currentKeys, onUpdate) {
  const state = {
    genre: [...currentKeys.genre],
    mood: [...currentKeys.mood],
    tags: [...currentKeys.tags],
    expandedGroup: null,
  };

  function render() {
    container.innerHTML = '';

    ['genre', 'mood', 'tags'].forEach(groupType => {
      const section = document.createElement('div');
      section.className = 'ek-section';

      const header = document.createElement('div');
      header.className = 'ek-section-header';

      const label = document.createElement('div');
      label.className = 'ek-section-label';
      label.textContent = groupType.charAt(0).toUpperCase() + groupType.slice(1) + ':';

      const display = document.createElement('div');
      display.className = 'ek-section-display';

      const selectedKeys = state[groupType];
      if (selectedKeys.length === 0) {
        display.innerHTML = '<span class="ek-none">(none)</span>';
      } else {
        const items = selectedKeys.map(value => {
          const option = EMOJI_KEY_OPTIONS[groupType].find(o => o.value === value);
          return option ? `<span class="ek-selected-key">${option.emoji} ${option.label}</span>` : '';
        }).join('');
        display.innerHTML = items;
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-primary btn-sm ek-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        state.expandedGroup = state.expandedGroup === groupType ? null : groupType;
        render();
      });

      header.append(label, display, editBtn);
      section.appendChild(header);

      // If this group is expanded, show the options
      if (state.expandedGroup === groupType) {
        const dropdown = document.createElement('div');
        dropdown.className = 'ek-dropdown';
        dropdown.innerHTML = `<div class="ek-dropdown-title">Update the (keyed) ${groupType.charAt(0).toUpperCase() + groupType.slice(1)}:</div>`;

        const options = document.createElement('div');
        options.className = 'ek-options-grid';

        EMOJI_KEY_OPTIONS[groupType].forEach(option => {
          const optionEl = document.createElement('label');
          optionEl.className = 'ek-option';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = option.value;
          checkbox.checked = state[groupType].includes(option.value);
          checkbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
              state[groupType].push(option.value);
            } else {
              state[groupType] = state[groupType].filter(v => v !== option.value);
            }

            // Save to API
            try {
              await updateVideoEmojiKeys(videoId, {
                [groupType]: state[groupType],
              });
              showToast(`${groupType.charAt(0).toUpperCase() + groupType.slice(1)} updated`, 'success');
              if (onUpdate) onUpdate();
            } catch (err) {
              showToast(`Failed to update: ${err.message}`, 'error');
              // Revert the change
              if (e.target.checked) {
                state[groupType] = state[groupType].filter(v => v !== option.value);
              } else {
                state[groupType].push(option.value);
              }
              e.target.checked = !e.target.checked;
            }

            render();
          });

          const emojiSpan = document.createElement('span');
          emojiSpan.className = 'ek-option-emoji';
          emojiSpan.textContent = option.emoji;

          const labelSpan = document.createElement('span');
          labelSpan.className = 'ek-option-label';
          labelSpan.textContent = option.label;

          optionEl.append(checkbox, emojiSpan, labelSpan);
          options.appendChild(optionEl);
        });

        dropdown.appendChild(options);
        section.appendChild(dropdown);
      }

      container.appendChild(section);
    });
  }

  render();
}

function esc(s) {
  if (s == null) return '—';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
