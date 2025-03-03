/* src/tasks/parseDates.js */
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(customParseFormat);

const POSSIBLE_DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'M/D/YYYY',
  'MMM D, YYYY',
  'MMMM D, YYYY'
];

export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  for (const fmt of POSSIBLE_DATE_FORMATS) {
    const parsed = dayjs(dateStr, fmt, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }
  // fallback to a loose parse
  const fallback = dayjs(dateStr);
  return fallback.isValid() ? fallback : null;
}

const POSSIBLE_DATETIME_FORMATS = [
  'YYYY-MM-DD h:mm A',
  'MM/DD/YYYY h:mm A',
  'M/D/YYYY h:mm A',
  'MMM D, YYYY h:mm A',
  'MMMM D, YYYY h:mm A'
];

export function parseEventDateTime(dateStr) {
  if (!dateStr) return null;
  for (const fmt of POSSIBLE_DATETIME_FORMATS) {
    const parsed = dayjs(dateStr, fmt, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }
  // fallback to a loose parse
  const fallback = dayjs(dateStr);
  return fallback.isValid() ? fallback : null;
}

export function isFutureEvent(dateStr) {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return false;
  const yesterday = dayjs().subtract(1, 'day').endOf('day');
  return eventDate.isAfter(yesterday);
}

export function humanizeDatetime(dateStr) {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return '';
  return eventDate.format('dddd, MMMM D, YYYY @ h:mm A');
}

export function humanizeDate(dateStr) {
const eventDate = parseEventDate(dateStr);
  if (!eventDate) return '';
  return eventDate.format('dddd, MMMM D, YYYY');
}

export function humanizeTime(timeStr) {
  if (!timeStr) return '';
  return dayjs(timeStr, 'h:mm A').format('h:mm A');
}