import ical from 'ical-generator';
import { parseEventDate } from './parseDates';
import dayjs from 'dayjs';
import fs from 'fs';
import { getMapsUrl } from '../scripts/maps';

export function createCalendarEventIfNeeded(evt, icalDir) {
  if (!evt) return;
  // skip if no date
  if (!evt.Date) {
    console.error('[CreateCalendarEvent] Skipping event with no date:', evt.UUID);
    return;
  }
  // skip if date is before yesterday
  const eventDate = parseEventDate(`${evt.Date}`);
  if (!eventDate || eventDate.isBefore(dayjs().subtract(1, 'day'))) {
    console.error('[CreateCalendarEvent] Skipping event with past date:', evt.UUID);
    return;
  }
  // skip if already has an ical file
  const existingFiles = fs.readdirSync(icalDir);
  const existingFile = existingFiles.find((f) => f.startsWith(evt.UUID));
  if (existingFile) {
    console.log(`[CreateCalendarEvent] Already exists: ${existingFile}, skipping creation.`);
    return;
  }

  const calendar = ical();

  const displayLocation = `${evt.City}, ${evt.State}`;
  const sanitizedCity = evt.City ? evt.City.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedState = evt.State ? evt.State.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedAddress = evt.Address ? evt.Address.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  let displayAddress = evt.Address || '';
  // If sanitizeddisplaylocation doesn't include city and state, append it
  if (!sanitizedAddress.includes(sanitizedCity) || !sanitizedAddress.includes(sanitizedState)) {
    displayAddress += `, ${displayLocation}`;
  }
  const mapUrl = getMapsUrl(displayAddress);
  const calEvent = calendar.createEvent({
    start: eventDate,
    summary: evt.Title,
    description: evt.Description + '\n\n' + evt['Meeting Location'],
    location: displayAddress,
    url: mapUrl
  });
  calEvent.createAttachment(`https://theblop.org/assets/images/${evt.UUID}-thumb.jpg`);
  const icalPath = `${icalDir}/${evt.UUID}.ics`;
  fs.writeFileSync(icalPath, calendar.toString());
  console.log(`[CreateCalendarEvent] Saved: ${icalPath}`);
  return icalPath;
}