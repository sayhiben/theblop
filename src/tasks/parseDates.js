/* src/tasks/parseDates.js */
import dayjs from 'dayjs';
import dayjsParser from 'dayjs-parser';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(customParseFormat);
dayjs.extend(dayjsParser);
dayjs.extend(utc);

export function now() {
  return dayjs();
}

export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const fallback = dayjs(dateStr);
  return fallback.isValid() ? fallback : null;
}

export function parseEventDateTime(dateStr) {
  if (!dateStr) return null;
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