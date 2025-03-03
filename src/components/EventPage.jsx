import React from 'react';
import { EventCard } from './EventCard';
import { SiteAlerts } from './SiteAlerts';
import { alerts } from '../alerts';
import { humanizeDate } from '../tasks/parseDates';

export function EventPage({ eventData }) {
  const displayDate = humanizeDate(eventData.Date);
  const metaTitle = `[${eventData.City}, ${eventData.State}] ${eventData.Title}, ${displayDate}`;
  const metaDescription = `[${eventData.City}, ${eventData.State}] ${displayDate} - ${eventData.Description}`;

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <title>{metaTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="../dist/styles.css" rel="stylesheet" />
        <link rel="shortcut icon" type="image/x-icon" href="favicon.ico" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={`https://theblop.org/assets/images/${eventData.UUID}-thumb.jpg`} />
        <meta property="og:url" content={`https://theblop.org/events/${eventData.UUID}.html`} />
        <meta property="og:type" content="website" />
      </head>
      <body className="p-4 lg:p-8 bg-white text-gray-900 dark:bg-gray-900 dark:text-stone-50 font-sans">
        <nav className="mb-6">
          <a
            href="../index.html"
            className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            &larr; Back to Events
          </a>
        </nav>

        <SiteAlerts alerts={alerts} />

        <main className="max-w-3xl mx-auto">
          <EventCard key={eventData.UUID} event={eventData} dateKey={eventData.Date} baseAssetPath="../assets/images" />
        </main>

        {/* External clipboard script */}
        <script src="../dist/scripts/clipboard.js"></script>
      </body>
    </html>
  );
}