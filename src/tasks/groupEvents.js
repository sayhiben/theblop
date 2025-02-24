/* src/tasks/groupEvents.js */
export function groupEventsByDate(events) {
  const groups = {};
  for (const ev of events) {
    const d = ev.Date || 'No Date';
    if (!groups[d]) groups[d] = [];
    groups[d].push(ev);
  }
  return groups;
}
