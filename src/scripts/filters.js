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
      const eventDate = new Date(card.getAttribute('data-date'));

      // Date filter:
      let matchesDate = true;
      if (dateValue !== 'ALL') {
        matchesDate = checkDateFilter(dateValue, eventDate);
      }

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

  function checkDateFilter(selectedValue, eventDate) {
    const now = new Date();

    switch (selectedValue) {
      case 'TODAY': {
        // Check if event is the same calendar date as "now":
        return isSameDay(eventDate, now);
      }
      case 'TOMORROW': {
        // Check if event is the calendar date immediately after "now":
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return isSameDay(eventDate, tomorrow);
      }
      case 'WEEKEND': {
        // Check if eventDate is Saturday, or Sunday:
        const day = eventDate.getDay();
        return day === 6 || day === 0; // 6=Sat, 0=Sun
      }
      case 'WEEK': {
        // Check if eventDate is within the next 7 days (including today):
        const diffDays = daysBetween(now, eventDate);
        return (diffDays >= 0 && diffDays < 7);
      }
      default: 
        // 'ALL' or unknown
        // there still might be dates in the past due to infrequent updates of the source data
        // let's only display dates after yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return eventDate > yesterday;
    }
  }

  // Helper to check if two dates are the same calendar day:
  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();
  }

  // Helper to compute day difference (ignoring time of day):
  function daysBetween(d1, d2) {
    // Zero-out times to compare only date portion
    const day1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const day2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    // 86400000 ms in a day
    return Math.floor((day2 - day1) / 86400000);
  }

  function updateURLParam(key, value) {
    const sp = new URLSearchParams(window.location.search);
    value ? sp.set(key, value) : sp.delete(key);
    const newUrl = window.location.pathname + (sp.toString() ? '?' + sp.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
})();