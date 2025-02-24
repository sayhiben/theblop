/* src/tasks/generatePages.js */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { IndexPage } from '../components/IndexPage.jsx';
import { EventPage } from '../components/EventPage.jsx';
import { groupEventsByDate } from './groupEvents.js';
import { parseEventDate } from './parseDates.js';

// A fixed list of US state abbreviations:
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export async function generatePages({ allEvents, futureEvents, indexHtmlPath, eventsDir }) {
  // 1) Generate index.html
  // Group futureEvents by date for the index:
  const grouped = groupEventsByDate(futureEvents);

  // Sort date keys? We can rely on IndexPage to do it, or do it here.
  // We'll let the component do it based on Object.keys() sort.

  const indexHtml = renderToStaticMarkup(
    <IndexPage
      futureEvents={futureEvents}
      grouped={grouped}
      allStates={ALL_STATES}
    />
  );

  fs.writeFileSync(indexHtmlPath, '<!DOCTYPE html>' + indexHtml, 'utf-8');
  console.log('Wrote index.html');

  // 2) Generate event pages (for ALL events, including past)
  for (const event of allEvents) {
    const { UUID } = event;
    if (!UUID) continue;

    const pageHtml = renderToStaticMarkup(
      <EventPage eventData={event} />
    );

    const outPath = path.join(eventsDir, `${UUID}.html`);
    fs.writeFileSync(outPath, '<!DOCTYPE html>' + pageHtml, 'utf-8');
    console.log(`Wrote events/${UUID}.html`);
  }
}
