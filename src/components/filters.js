export function renderFilters(container, partners, currentFilters, onChange) {
  container.innerHTML = `
    <div class="filters-bar">
      <div class="filter-group">
        <label>Artist</label>
        <input type="text" id="f-artist" placeholder="Search artist…" value="${currentFilters.artist || ''}">
      </div>
      <div class="filter-group">
        <label>Title</label>
        <input type="text" id="f-title" placeholder="Search title…" value="${currentFilters.title || ''}">
      </div>
      <div class="filter-group">
        <label>Record Label</label>
        <input type="text" id="f-label" placeholder="Search label…" value="${currentFilters.record_label || ''}">
      </div>
      <div class="filter-group">
        <label>Partner</label>
        <select id="f-partner">
          <option value="">All partners</option>
          ${partners.map(p => `<option value="${p}" ${currentFilters.partner_account === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Release Date</label>
        <div class="filter-date-row">
          <select id="f-date-op">
            <option value="" ${!currentFilters.date_op ? 'selected' : ''}>Any</option>
            <option value="eq" ${currentFilters.date_op === 'eq' ? 'selected' : ''}>=</option>
            <option value="gt" ${currentFilters.date_op === 'gt' ? 'selected' : ''}>After</option>
            <option value="lt" ${currentFilters.date_op === 'lt' ? 'selected' : ''}>Before</option>
          </select>
          <input type="date" id="f-date-val" value="${currentFilters.date_val || ''}">
        </div>
      </div>
      <div class="filter-group">
        <label>ID</label>
        <input type="text" id="f-vid" placeholder="ID or UUID…" value="${currentFilters.video_id || ''}">
      </div>
      <div class="filter-group" style="justify-content:flex-end">
        <label>&nbsp;</label>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="f-apply">Apply</button>
          <button class="btn btn-secondary btn-sm" id="f-reset">Reset</button>
        </div>
      </div>
    </div>
  `;

  let debounceTimer;
  function applyFilters() {
    onChange({
      artist: container.querySelector('#f-artist').value.trim(),
      title: container.querySelector('#f-title').value.trim(),
      record_label: container.querySelector('#f-label').value.trim(),
      video_id: container.querySelector('#f-vid').value.trim(),
      partner_account: container.querySelector('#f-partner').value,
      date_op: container.querySelector('#f-date-op').value,
      date_val: container.querySelector('#f-date-val').value,
    });
  }

  container.querySelector('#f-apply').addEventListener('click', applyFilters);
  container.querySelector('#f-reset').addEventListener('click', () => {
    container.querySelectorAll('input').forEach(i => i.value = '');
    container.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    onChange({});
  });

  // live search on text inputs with debounce
  container.querySelectorAll('input[type=text]').forEach(inp => {
    inp.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilters, 400);
    });
  });
}
