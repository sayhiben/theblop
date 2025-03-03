/* src/main.js */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildTailwind } from './tasks/buildTailwind.js';
import { fetchCSV } from './tasks/fetchCsv.js';
import { parseCSV } from './tasks/parseCsv.js';
import { parseEventDate, isFutureEvent } from './tasks/parseDates.js';
import { downloadImageIfNeeded, resizeImageIfNeeded } from './tasks/downloadImages.js';
import { generatePages } from './tasks/generatePages.js';
import { createCalendarEventIfNeeded } from './tasks/createCalendarEventIfNeeded.js';

// Convert import.meta.url to __dirname style usage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_URL = process.env.SHEET_CSV_URL;
if (!CSV_URL) {
  console.error('Error: No CSV URL found. Please set SHEET_CSV_URL environment variable.');
  process.exit(1);
}

// Directory paths
const EVENTS_DIR = path.join(__dirname, '..', 'events');
const INDEX_HTML = path.join(__dirname, '..', 'index.html');
const ABOUT_HTML = path.join(__dirname, '..', 'about.html');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const ICAL_DIR = path.join(__dirname, '..', 'assets', 'ical');

// Main build function
(async function main() {
  try {
    // 1) Build Tailwind CSS
    console.log('Building Tailwind CSS via CLI...');
    buildTailwind();
    console.log('Tailwind CSS built successfully.\n');

    // Ensure directories exist
    if (!fs.existsSync(EVENTS_DIR)) {
      fs.mkdirSync(EVENTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    // 2) Fetch CSV data
    console.log(`Fetching CSV from: ${CSV_URL}`);
    const csvData = await fetchCSV(CSV_URL);

    // 3) Parse CSV
    const rows = parseCSV(csvData);
    if (!Array.isArray(rows)) {
      throw new Error('Parsed data is not an array.');
    }

    // 4) Sort events by date ascending
    rows.sort((a, b) => {
      const da = parseEventDate(a.Date);
      const db = parseEventDate(b.Date);
      if (!da) return 1;
      if (!db) return -1;
      return da.valueOf() - db.valueOf();
    });

    // 5) Filter future events
    const futureEvents = rows.filter(e => isFutureEvent(e.Date));

    // 6) Download images
    for (const event of rows) {
      const { UUID } = event;
      if (!UUID) {
        console.warn('Skipping event with missing UUID:', event);
        continue;
      }
      const imageUrl = event['Image URL'];
      if (imageUrl) {
        const localImagePath = await downloadImageIfNeeded(imageUrl, UUID, IMAGES_DIR);
        if (localImagePath) {
          event.localImagePath = localImagePath;
        }
        const localThumbnailPath = await resizeImageIfNeeded(localImagePath, UUID, IMAGES_DIR);
        if (localThumbnailPath) {
          event.localThumbnailPath = localThumbnailPath;
        }
      }
    }

    // 7) Generate calendar events
    for (const event of rows) {
      createCalendarEventIfNeeded(event, ICAL_DIR)
    }

    // 8) Generate pages (index + event pages)
    await generatePages({
      allEvents: rows,
      futureEvents,
      indexHtmlPath: INDEX_HTML,
      aboutHtmlPath: ABOUT_HTML,
      eventsDir: EVENTS_DIR
    });

    console.log('Site generation complete!');
  } catch (err) {
    console.error('Error during site generation:', err);
    process.exit(1);
  }
})();
