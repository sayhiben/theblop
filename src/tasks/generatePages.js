/* src/tasks/generatePages.js */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { IndexPage } from '../components/IndexPage.jsx';
import { EventPage } from '../components/EventPage.jsx';
import { groupEventsByDate } from './groupEvents.js';
import { AboutPage } from '../components/AboutPage.jsx';
import { parseEventDate } from './parseDates.js'; // Keep so that it's rebuilt during webpack

// A fixed list of US state abbreviations:
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC', 'DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

export async function generatePages({ allEvents, futureEvents, indexHtmlPath, eventsDir, aboutHtmlPath }) {
  // 1) Generate index.html
  // Group futureEvents by date for the index:
  const grouped = groupEventsByDate(futureEvents);

  // Filter out events that have a canonical UUID (i.e. duplicates that should be "redirected")
  const indexPageEvents = futureEvents.filter(e => !e['Canonical UUID'] || e.UUID === e['Canonical UUID'] || e['Canonical UUID'] === '');

  const indexHtml = renderToStaticMarkup(
    <IndexPage
      futureEvents={indexPageEvents}
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

    // If the event has a canonical UUID, use that event's data instead
    let canonicalEvent = allEvents.find(e => event['Canonical UUID'] && e.UUID === event['Canonical UUID']);
    if (!canonicalEvent) {
      canonicalEvent = event;
    }

    const pageHtml = renderToStaticMarkup(
      <EventPage eventData={canonicalEvent} />
    );

    const outPath = path.join(eventsDir, `${UUID}.html`);
    fs.writeFileSync(outPath, '<!DOCTYPE html>' + pageHtml, 'utf-8');
    console.log(`Wrote events/${UUID}.html`);
  }

  // 3) Generate about.html     
  const aboutHtml = renderToStaticMarkup(
    <AboutPage />
  );
  fs.writeFileSync(aboutHtmlPath, '<!DOCTYPE html>' + aboutHtml, 'utf-8');
  console.log('Wrote about.html');
}
