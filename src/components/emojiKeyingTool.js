import { fetchVideoEmojiKeys, updateVideoEmojiKeys } from '../api.js';
import { showToast } from './toast.js';

// Define emoji key options for each group
const EMOJI_KEY_OPTIONS = {
  genre: [
    { emoji: '◼️', label: 'Punk Rock', value: 'punk_rock' },
    { emoji: '🤘', label: 'Metal', value: 'metal' },
    { emoji: '🎸', label: 'Alternative', value: 'alternative' },
    { emoji: '❤️', label: 'R&B/Soul', value: 'r&b_soul' },
    { emoji: '🎤', label: 'Hip Hop/Rap', value: 'hip_hop_rap' },
    { emoji: '🎲', label: 'Electronic/Dance', value: 'electronic_dance' },
    { emoji: '💋', label: 'Pop', value: 'pop' },
    { emoji: '🎻', label: 'Classical', value: 'classical' },
    { emoji: '🤠', label: 'Country', value: 'country' },
    { emoji: '🚴', label: 'Indie', value: 'indie' },
  ],
  mood: [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😢', label: 'Sad', value: 'sad' },
    { emoji: '😌', label: 'Chill', value: 'chill' },
    { emoji: '🔥', label: 'Energetic', value: 'energetic' },
    { emoji: '💭', label: 'Thoughtful', value: 'thoughtful' },
    { emoji: '😴', label: 'Mellow', value: 'mellow' },
    { emoji: '💪', label: 'Powerful', value: 'powerful' },
    { emoji: '🌙', label: 'Dark', value: 'dark' },
    { emoji: '🌞', label: 'Uplifting', value: 'uplifting' },
    { emoji: '💔', label: 'Melancholic', value: 'melancholic' },
  ],
  tags: [
    { emoji: '🎬', label: 'Cinematic', value: 'cinematic' },
    { emoji: '🎹', label: 'Piano', value: 'piano' },
    { emoji: '🎺', label: 'Horn Section', value: 'horn_section' },
    { emoji: '🥁', label: 'Drum Heavy', value: 'drum_heavy' },
    { emoji: '🎵', label: 'Melodic', value: 'melodic' },
    { emoji: '🔊', label: 'Bass Heavy', value: 'bass_heavy' },
    { emoji: '🎙️', label: 'Vocal Focus', value: 'vocal_focus' },
    { emoji: '🔁', label: 'Looping', value: 'looping' },
    { emoji: '⚡', label: 'Fast Tempo', value: 'fast_tempo' },
    { emoji: '🐌', label: 'Slow Tempo', value: 'slow_tempo' },
  ],
};

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

  // Fetch existing emoji keys for this video
  let existingKeys = { genre: [], mood: [], tags: [] };
  try {
    existingKeys = await fetchVideoEmojiKeys(video.id);
  } catch (e) {
    // If endpoint doesn't exist yet, use empty defaults
    console.warn('Emoji keys endpoint not available, using defaults:', e);
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
