import { renderVideoTab } from './components/videoList.js';
import { renderPlaylistsTab } from './components/playlists.js';
import { checkAuth, showPasswordPrompt } from './auth.js';

const tabs = {
  videos: document.getElementById('tab-videos'),
  playlists: document.getElementById('tab-playlists'),
};

const btns = document.querySelectorAll('.tab-btn');

function switchTab(name) {
  btns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  Object.entries(tabs).forEach(([k, el]) => el.classList.toggle('active', k === name));
}

btns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Bootstrap application
function initializeApp() {
  renderVideoTab(tabs.videos);
  renderPlaylistsTab(tabs.playlists);
}

// Check authentication on app load
if (checkAuth()) {
  initializeApp();
} else {
  showPasswordPrompt(initializeApp);
}
