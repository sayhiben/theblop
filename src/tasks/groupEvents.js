/* src/tasks/groupEvents.js */
export function groupEventsByDate(events) {
  const groups = {};
  for (const ev of events) {
    const d = ev.Date || 'No Date';
    if (!groups[d]) groups[d] = [];
    groups[d].push(ev);
  }
  for (const key in groups) {
    groups[key] = sortEventsInGroupsByTime(groups[key]);
  }
  return groups;
}

function sortEventsInGroupsByTime(eventGroup) {
  return eventGroup.sort((a, b) => {
    const aTime = a.Time || '00:00';
    const bTime = b.Time || '00:00';
    return aTime.localeCompare(bTime);
  });
}