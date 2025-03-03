/* src/tasks/parseDates.js */
import dayjs from 'dayjs';
import dayjsParser from 'dayjs-parser';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(customParseFormat);
dayjs.extend(dayjsParser);
dayjs.extend(utc);

(function () {
  // Grab your DOM references
  const filterSelect = document.getElementById('stateFilter');
  const dateSelect = document.getElementById('dateFilter');
  const eventCards = document.querySelectorAll('.event-card');
  const dateGroups = document.querySelectorAll('.date-group');
  const noEventsMsg = document.getElementById('noEventsMessage');

  // Listen to dropdown changes
  filterSelect.addEventListener('change', () => {
    updateURLParam('state', filterSelect.value === 'ALL' ? '' : filterSelect.value);
    applyFilters();
  });

  dateSelect.addEventListener('change', () => {
    updateURLParam('date', dateSelect.value === 'ALL' ? '' : dateSelect.value);
    applyFilters();
  });

  // Initialize dropdowns from URL
  const urlParams = new URLSearchParams(window.location.search);
  filterSelect.value = urlParams.get('state') || 'ALL';
  dateSelect.value  = urlParams.get('date')  || 'ALL';

  applyFilters();

  // Core function to apply both filters
  function applyFilters() {
    const stateValue = filterSelect.value;
    const dateValue = dateSelect.value;
    let visibleCount = 0;

    eventCards.forEach(card => {
      // State filter
      const eventState = card.getAttribute('data-state');
      const matchesState = (stateValue === 'ALL' || eventState === stateValue);

      // Day.js parse in local time
      // e.g. <div data-date="2025-03-05"> => dayjs("2025-03-05").local()
      const eventDate = dayjs(card.getAttribute('data-date')).local();

      // Date filter
      let matchesDate = true;
      if (dateValue !== 'ALL') {
        matchesDate = checkDateFilter(dateValue, eventDate);
      }

      // Show/hide based on both filters
      card.style.display = (matchesState && matchesDate) ? 'block' : 'none';
      if (matchesState && matchesDate) visibleCount++;
    });

    // Hide/show each date group if it has visible event cards
    dateGroups.forEach(group => {
      const visibleEvents = group.querySelectorAll('.event-card:not([style*="display: none"])');
      group.style.display = visibleEvents.length ? 'block' : 'none';
    });

    // If no events are visible (and a filter is set), show "No matching events"
    if (visibleCount === 0 && (stateValue !== 'ALL' || dateValue !== 'ALL')) {
      noEventsMsg.textContent = 'No matching events';
      noEventsMsg.classList.remove('hidden');
    } else {
      noEventsMsg.classList.add('hidden');
    }
  }

  /**
   * Check dateFilter logic using dayjs in local time.
   * @param {string} selectedValue - the user-selected date filter (TODAY, TOMORROW, WEEKEND, WEEK, or ALL).
   * @param {dayjs.Dayjs} eventDate - dayjs object of the event’s date in local time.
   * @returns {boolean} True if the event passes the filter.
   */
  function checkDateFilter(selectedValue, eventDate) {
    const now = dayjs().local();

    switch (selectedValue) {
      case 'TODAY': {
        // Check if the event is the same local calendar date as "now"
        return eventDate.isSame(now, 'day');
      }
      case 'TOMORROW': {
        // Check if the event is the next calendar day
        const tomorrow = now.add(1, 'day');
        return eventDate.isSame(tomorrow, 'day');
      }
      case 'WEEKEND': {
        // Check if eventDate is Saturday (6) or Sunday (0)
        const dayNum = eventDate.day(); // 0=Sunday, 6=Saturday
        return dayNum === 6 || dayNum === 0;
      }
      case 'WEEK': {
        // Check if eventDate is within the next 7 days (including today)
        // dayjs .diff(otherDayjs, 'day') => how many whole days
        const diffDays = eventDate.startOf('day').diff(now.startOf('day'), 'day');
        return diffDays >= 0 && diffDays < 7;
      }
      default:
        // 'ALL' or unknown -> filter out dates before yesterday
        const yesterday = now.subtract(1, 'day').startOf('day');
        return eventDate.isAfter(yesterday);
    }
  }

  /**
   * Update the URL parameters without forcing a page reload
   */
  function updateURLParam(key, value) {
    const sp = new URLSearchParams(window.location.search);
    // set or delete param
    value ? sp.set(key, value) : sp.delete(key);
    const newUrl = window.location.pathname + (sp.toString() ? '?' + sp.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }
})();