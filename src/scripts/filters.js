// language: javascript
(function() {
  const filterSelect = document.getElementById('stateFilter');
  const dateSelect = document.getElementById('dateFilter');
  const eventCards = document.querySelectorAll('.event-card');
  const dateGroups = document.querySelectorAll('.date-group');
  const noEventsMsg = document.getElementById('noEventsMessage');

  filterSelect.addEventListener('change', () => {
    updateURLParam('state', filterSelect.value === 'ALL' ? '' : filterSelect.value);
    applyFilters();
  });

  dateSelect.addEventListener('change', () => {
    updateURLParam('date', dateSelect.value === 'ALL' ? '' : dateSelect.value);
    applyFilters();
  });

  const urlParams = new URLSearchParams(window.location.search);
  filterSelect.value = urlParams.get('state') || 'ALL';
  dateSelect.value  = urlParams.get('date')  || 'ALL';
  applyFilters();

  function applyFilters() {
    const stateValue = filterSelect.value;
    const dateValue = dateSelect.value;
    let visibleCount = 0;

    eventCards.forEach(card => {
      const eventState = card.getAttribute('data-state');
      const matchesState = (stateValue === 'ALL' || eventState === stateValue);
      // You can add date-based filtering logic here.
      const matchesDate = true;

      card.style.display = (matchesState && matchesDate) ? 'block' : 'none';
      if (matchesState && matchesDate) visibleCount++;
    });

    dateGroups.forEach(group => {
      const visibleEvents = group.querySelectorAll('.event-card:not([style*="display: none"])');
      group.style.display = visibleEvents.length ? 'block' : 'none';
    });

    if (visibleCount === 0 && (stateValue !== 'ALL' || dateValue !== 'ALL')) {
      noEventsMsg.textContent = 'No matching events';
      noEventsMsg.classList.remove('hidden');
    } else {
      noEventsMsg.classList.add('hidden');
    }
  }

  function updateURLParam(key, value) {
    const sp = new URLSearchParams(window.location.search);
    value ? sp.set(key, value) : sp.delete(key);
    const newUrl = window.location.pathname + (sp.toString() ? '?' + sp.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
})();