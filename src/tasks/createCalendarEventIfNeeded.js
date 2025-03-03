import dayjs from 'dayjs';
import fs from 'fs';
import ical from 'ical-generator';
import { getMapsUrl } from '../scripts/maps';
import { parseEventDate } from './parseDates';

export function createCalendarEventIfNeeded(evt, icalDir) {
  if (!evt) return;
  // skip if no date
  if (!evt.Date) {
    console.error('[CreateCalendarEvent] Skipping event with no date:', evt.UUID);
    return;
  }

  // Attempt to parse date/time from evt.Date (and evt.Time if relevant).
  // Adjust parseEventDate if needed to combine date+time. 
  // For example, if parseEventDate returns a dayjs object from "YYYY-MM-DD HH:mm"
  let localDateTime = parseEventDate(`${evt.Date} ${evt.Time}`);
  if (!localDateTime) {
    localDateTime = parseEventDate(evt.Date, 'YYYY-MM-DD') 
                    || parseEventDate(evt.Date, 'MM/DD/YYYY') 
                    || parseEventDate(evt.Date, 'MM/DD/YY')
                    || parseEventDate(evt.Date, 'YYYY/MM/DD')
                    || parseEventDate(evt.Date, 'MM-DD-YYYY')
                    || parseEventDate(evt.Date, 'YYYY-MM-DD')
                    || parseEventDate(evt.Date, 'MM-DD-YY')
                    || parseEventDate(evt.Date, 'YYYY/MM/DD')
                    || parseEventDate(evt.Date, 'MM/DD')
                    || parseEventDate(evt.Date, 'MM-DD');
  }
  if (!localDateTime) {
    console.error(`[CreateCalendarEvent] Could not parse date/time for event ${evt.UUID} with date: ${evt.Date} and time: ${evt.Time}`);
    return;
  }

  // If you want to skip past events, for instance:
  if (localDateTime.isBefore(dayjs(), 'day')) {
    console.error('[CreateCalendarEvent] Skipping event with past date:', evt.UUID);
    return;
  }

  // Check if .ics already exists
  const existingFiles = fs.readdirSync(icalDir);
  const existingFile = existingFiles.find((f) => f.startsWith(evt.UUID));
  if (existingFile) {
    console.log(`[CreateCalendarEvent] Already exists: ${existingFile}, skipping creation.`);
    return;
  }

  // Create a floating-time event for an hour's duration (or skip 'end' if you want).
  // "Floating" means no explicit timezone is set.
  const localEndTime = localDateTime.add(4, 'hour'); 
  // Convert dayjs -> plain JS Date (still effectively "local" floating times)
  const startJSDate = localDateTime.toDate();
  const endJSDate = localEndTime.toDate();

  const calendar = ical();
  const displayAddress = buildAddressFromEvent(evt);
  const mapUrl = getMapsUrl(displayAddress);
  calendar.createEvent({
    start: startJSDate,
    end: endJSDate,
    summary: evt.Title || 'Protest Event',
    description: (evt.Description || '') + '\n\n' + (evt['Meeting Location'] || ''),
    location: displayAddress,
    url: mapUrl,   // optional
    floating: true                        // key: ensures ical-generator does not add TZ info
  });
  const icalPath = `${icalDir}/${evt.UUID}.ics`;
  fs.writeFileSync(icalPath, calendar.toString());
  console.log(`[CreateCalendarEvent] Saved: ${icalPath}`);
  return icalPath;
}

export function buildAddressFromEvent(evt) {
  const displayLocation = `${evt.City}, ${evt.State}`;
  const sanitizedCity = evt.City ? evt.City.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedState = evt.State ? evt.State.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  const sanitizedAddress = evt.Address ? evt.Address.replace(/[^a-zA-Z]/g, '').toLowerCase() : '';
  let displayAddress = evt.Address || '';
  // If sanitizeddisplaylocation doesn't include city and state, append it
  if (!sanitizedAddress.includes(sanitizedCity) || !sanitizedAddress.includes(sanitizedState)) {
    displayAddress += `, ${displayLocation}`;
  }
  return displayAddress;
}